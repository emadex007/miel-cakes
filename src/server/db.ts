// Server-only helpers. Only import these inside server function handlers or
// server route handlers, never at the top level of a component.
import { env } from 'cloudflare:workers'
import type { Category, DeliveryZone, Product, ProductMedia, ProductOption } from '~/lib/types'

export const db = () => env.DB
export const media = () => env.MEDIA

type ProductRow = Omit<Product, 'options' | 'media'> & { options_json: string; media_json?: string }

/** Reads the saved list of extra photos/videos, ignoring anything malformed. */
export function parseMedia(json: string | undefined | null): ProductMedia[] {
  try {
    const parsed = JSON.parse(json || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && typeof m.url === 'string' && m.url)
      .map((m) => ({ url: String(m.url), kind: m.kind === 'video' ? ('video' as const) : ('image' as const) }))
      .slice(0, 20)
  } catch {
    return []
  }
}

export function mapProduct(row: ProductRow): Product {
  let options: ProductOption[] = []
  try {
    const parsed = JSON.parse(row.options_json || '[]')
    if (Array.isArray(parsed)) {
      options = parsed
        .filter((o) => o && typeof o.label === 'string')
        .map((o) => ({ label: String(o.label), price: Math.max(0, Math.round(Number(o.price) || 0)) }))
    }
  } catch {
    options = []
  }
  const { options_json: _ignored, media_json, ...rest } = row
  return { ...rest, options, media: parseMedia(media_json) }
}

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug
  FROM products p JOIN categories c ON c.id = p.category_id`

export async function queryProducts(where = '', binds: unknown[] = []) {
  const { results } = await db()
    .prepare(`${PRODUCT_SELECT} ${where} ORDER BY c.sort, p.sort, p.name`)
    .bind(...binds)
    .all<ProductRow>()
  return results.map(mapProduct)
}

export async function queryCategories(activeOnly: boolean) {
  const { results } = await db()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ${activeOnly ? 'WHERE c.is_active = 1' : ''} ORDER BY c.sort, c.name`,
    )
    .all<Category>()
  return results
}

export async function queryZones(activeOnly: boolean) {
  const { results } = await db()
    .prepare(`SELECT * FROM delivery_zones ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY sort, name`)
    .all<DeliveryZone>()
  return results
}

/** Returns a slug that isn't used in `table` yet (ignoring row `exceptId`). */
export async function uniqueSlug(table: 'products' | 'categories', base: string, exceptId?: number) {
  let slug = base
  for (let i = 2; i < 200; i++) {
    const row = await db()
      .prepare(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`)
      .bind(slug, exceptId ?? 0)
      .first<{ id: number }>()
    if (!row) return slug
    slug = `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

/** Worker environment (bindings and secrets such as PAYSTACK_SECRET_KEY). Server only. */
export const workerEnv = () => env
