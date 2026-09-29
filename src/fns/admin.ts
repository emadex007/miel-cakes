import { createServerFn } from '@tanstack/react-start'
import { slugify } from '~/lib/format'
import type { AdminUser, MediaItem, ProductOption } from '~/lib/types'
import {
  currentAdmin,
  endAdminSession,
  hashPassword,
  requireAdmin,
  startAdminSession,
  verifyPassword,
} from '~/server/auth'
import { db, media, queryCategories, queryProducts, queryZones, uniqueSlug } from '~/server/db'
import { loadSettings, saveSettings } from '~/server/settings'

// ---------- small input helpers ----------
const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}
const bool = (v: unknown) => (v === true || v === 1 || v === '1' || v === 'on' ? 1 : 0)
const email = (v: unknown) => {
  const e = str(v, 200).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Enter a valid email address.')
  return e
}
const password = (v: unknown) => {
  const p = String(v ?? '')
  if (p.length < 8) throw new Error('Password must be at least 8 characters.')
  return p
}

// ---------- session ----------
export const getAdminSession = createServerFn({ method: 'GET' }).handler(async (): Promise<AdminUser | null> => {
  return currentAdmin()
})

export const hasAnyAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const row = await db().prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>()
  return (row?.n ?? 0) > 0
})

export const setupOwner = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const row = await db().prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>()
    if ((row?.n ?? 0) > 0) throw new Error('The owner account already exists. Sign in instead.')
    const name = str(data.name, 100)
    if (!name) throw new Error('Enter your name.')
    const result = await db()
      .prepare("INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, 'owner')")
      .bind(name, email(data.email), await hashPassword(password(data.password)))
      .run()
    await startAdminSession(Number(result.meta.last_row_id))
    return { ok: true }
  })

export const adminLogin = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const row = await db()
      .prepare('SELECT id, password_hash FROM admins WHERE email = ?')
      .bind(str(data.email, 200).toLowerCase())
      .first<{ id: number; password_hash: string }>()
    if (!row || !(await verifyPassword(String(data.password ?? ''), row.password_hash))) {
      throw new Error('That email and password don’t match. Check them and try again.')
    }
    await startAdminSession(row.id)
    return { ok: true }
  })

export const adminLogout = createServerFn({ method: 'POST' }).handler(async () => {
  await endAdminSession()
  return { ok: true }
})

// ---------- dashboard ----------
export const getDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const count = async (sql: string) => (await db().prepare(sql).first<{ n: number }>())?.n ?? 0
  const [products, soldOut, categories, zones, mediaCount, settings] = await Promise.all([
    count('SELECT COUNT(*) AS n FROM products'),
    count('SELECT COUNT(*) AS n FROM products WHERE is_available = 0'),
    count('SELECT COUNT(*) AS n FROM categories'),
    count('SELECT COUNT(*) AS n FROM delivery_zones WHERE is_active = 1'),
    count('SELECT COUNT(*) AS n FROM media'),
    loadSettings(),
  ])
  const sampleImages = await count(
    "SELECT COUNT(*) AS n FROM products WHERE image_url LIKE '%unsplash.com%' OR image_url LIKE '%pexels.com%'",
  )
  return {
    products,
    soldOut,
    categories,
    zones,
    mediaCount,
    sampleImages,
    checklist: {
      whatsapp: !!settings.whatsapp,
      phone: !!settings.phone,
      logo: !!settings.logo_url,
      bank: !!settings.bank_account_number,
      ownPhotos: sampleImages === 0,
    },
  }
})

// ---------- settings ----------
export const getAdminSettings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return loadSettings()
})

export const updateSettings = createServerFn({ method: 'POST' })
  .inputValidator((d: Record<string, string>) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    await saveSettings(data)
    return { ok: true }
  })

// ---------- categories ----------
export const listCategories = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return queryCategories(false)
})

export const saveCategory = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { id?: number; name: string; description: string; image_url: string; sort: number; is_active: number | boolean }) => d,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = str(data.name, 80)
    if (!name) throw new Error('Give the category a name.')
    const id = data.id ? int(data.id) : undefined
    const slug = await uniqueSlug('categories', slugify(name), id)
    const values = [name, slug, str(data.description, 400), str(data.image_url, 1000), int(data.sort), bool(data.is_active)]
    if (id) {
      await db()
        .prepare('UPDATE categories SET name=?, slug=?, description=?, image_url=?, sort=?, is_active=? WHERE id=?')
        .bind(...values, id)
        .run()
      return { id }
    }
    const r = await db()
      .prepare('INSERT INTO categories (name, slug, description, image_url, sort, is_active) VALUES (?,?,?,?,?,?)')
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const used = await db().prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').bind(id).first<{ n: number }>()
    if ((used?.n ?? 0) > 0) {
      throw new Error('This category still has products. Move or delete them first, or hide the category instead.')
    }
    await db().prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
    return { ok: true }
  })

// ---------- products ----------
export const listProductsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const [products, categories] = await Promise.all([queryProducts(), queryCategories(false)])
  return { products, categories }
})

export const getProductAdmin = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => String(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const categories = await queryCategories(false)
    if (id === 'new') return { product: null, categories }
    const [product] = await queryProducts('WHERE p.id = ?', [int(id)])
    if (!product) throw new Error('That product no longer exists.')
    return { product, categories }
  })

export interface ProductInput {
  id?: number
  category_id: number
  name: string
  description: string
  image_url: string
  options: ProductOption[]
  availability: 'daily' | 'preorder'
  notice_days: number
  is_available: number | boolean
  featured: number | boolean
  sort: number
}

export const saveProduct = createServerFn({ method: 'POST' })
  .inputValidator((d: ProductInput) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = str(data.name, 120)
    if (!name) throw new Error('Give the product a name.')
    const categoryId = int(data.category_id)
    const cat = await db().prepare('SELECT id FROM categories WHERE id = ?').bind(categoryId).first()
    if (!cat) throw new Error('Choose a category.')
    const options = (Array.isArray(data.options) ? data.options : [])
      .map((o) => ({ label: str(o.label, 60), price: Math.max(0, int(o.price)) }))
      .filter((o) => o.label)
    if (!options.length) throw new Error('Add at least one size or option with a price.')
    const id = data.id ? int(data.id) : undefined
    const slug = await uniqueSlug('products', slugify(name), id)
    const values = [
      categoryId,
      name,
      slug,
      str(data.description, 2000),
      str(data.image_url, 1000),
      JSON.stringify(options),
      data.availability === 'preorder' ? 'preorder' : 'daily',
      Math.max(0, int(data.notice_days)),
      bool(data.is_available),
      bool(data.featured),
      int(data.sort),
    ]
    if (id) {
      await db()
        .prepare(
          `UPDATE products SET category_id=?, name=?, slug=?, description=?, image_url=?, options_json=?,
           availability=?, notice_days=?, is_available=?, featured=?, sort=?, updated_at=datetime('now') WHERE id=?`,
        )
        .bind(...values, id)
        .run()
      return { id }
    }
    const r = await db()
      .prepare(
        `INSERT INTO products (category_id, name, slug, description, image_url, options_json, availability,
         notice_days, is_available, featured, sort) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const toggleProductFlag = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: number; field: 'is_available' | 'featured'; value: boolean }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const field = data.field === 'featured' ? 'featured' : 'is_available'
    await db()
      .prepare(`UPDATE products SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(bool(data.value), int(data.id))
      .run()
    return { ok: true }
  })

export const deleteProduct = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    await db().batch([
      db().prepare('DELETE FROM cart_items WHERE product_id = ?').bind(id),
      db().prepare('UPDATE order_items SET product_id = NULL WHERE product_id = ?').bind(id),
      db().prepare('DELETE FROM products WHERE id = ?').bind(id),
    ])
    return { ok: true }
  })

// ---------- delivery zones ----------
export const listZonesAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return queryZones(false)
})

export const saveZone = createServerFn({ method: 'POST' })
  .inputValidator((d: { id?: number; name: string; fee: number; is_active: number | boolean; sort: number }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = str(data.name, 80)
    if (!name) throw new Error('Give the area a name.')
    const values = [name, Math.max(0, int(data.fee)), bool(data.is_active), int(data.sort)]
    if (data.id) {
      await db().prepare('UPDATE delivery_zones SET name=?, fee=?, is_active=?, sort=? WHERE id=?').bind(...values, int(data.id)).run()
      return { id: int(data.id) }
    }
    const r = await db().prepare('INSERT INTO delivery_zones (name, fee, is_active, sort) VALUES (?,?,?,?)').bind(...values).run()
    return { id: Number(r.meta.last_row_id) }
  })

export const deleteZone = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const used = await db()
      .prepare('SELECT (SELECT COUNT(*) FROM orders WHERE zone_id = ?) + (SELECT COUNT(*) FROM bookings WHERE zone_id = ?) AS n')
      .bind(id, id)
      .first<{ n: number }>()
    if ((used?.n ?? 0) > 0) throw new Error('Orders already use this area. Switch it off instead of deleting it.')
    await db().prepare('DELETE FROM delivery_zones WHERE id = ?').bind(id).run()
    return { ok: true }
  })

// ---------- staff ----------
export const listAdmins = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireAdmin()
  const { results } = await db()
    .prepare('SELECT id, name, email, role, created_at FROM admins ORDER BY id')
    .all<AdminUser & { created_at: string }>()
  return { me, admins: results }
})

export const addAdmin = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    if (me.role !== 'owner') throw new Error('Only the owner can add staff accounts.')
    const e = email(data.email)
    const exists = await db().prepare('SELECT id FROM admins WHERE email = ?').bind(e).first()
    if (exists) throw new Error('Someone already uses that email.')
    const name = str(data.name, 100)
    if (!name) throw new Error('Enter their name.')
    await db()
      .prepare("INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, 'staff')")
      .bind(name, e, await hashPassword(password(data.password)))
      .run()
    return { ok: true }
  })

export const removeAdmin = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    const me = await requireAdmin()
    if (me.role !== 'owner') throw new Error('Only the owner can remove staff accounts.')
    if (id === me.id) throw new Error('You can’t remove your own account.')
    await db().batch([
      db().prepare("DELETE FROM sessions WHERE user_type = 'admin' AND user_id = ?").bind(id),
      db().prepare("DELETE FROM admins WHERE id = ? AND role != 'owner'").bind(id),
    ])
    return { ok: true }
  })

export const changeMyPassword = createServerFn({ method: 'POST' })
  .inputValidator((d: { current: string; next: string }) => d)
  .handler(async ({ data }) => {
    const me = await requireAdmin()
    const row = await db().prepare('SELECT password_hash FROM admins WHERE id = ?').bind(me.id).first<{ password_hash: string }>()
    if (!row || !(await verifyPassword(String(data.current ?? ''), row.password_hash))) {
      throw new Error('Your current password is wrong.')
    }
    await db().prepare('UPDATE admins SET password_hash = ? WHERE id = ?').bind(await hashPassword(password(data.next)), me.id).run()
    return { ok: true }
  })

// ---------- media ----------
export const listMedia = createServerFn({ method: 'GET' }).handler(async (): Promise<MediaItem[]> => {
  await requireAdmin()
  const { results } = await db()
    .prepare('SELECT * FROM media ORDER BY id DESC LIMIT 500')
    .all<Omit<MediaItem, 'url'>>()
  return results.map((m) => ({ ...m, url: `/media/${m.key}` }))
})

export const deleteMedia = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const row = await db().prepare('SELECT key FROM media WHERE id = ?').bind(id).first<{ key: string }>()
    if (row) {
      await media().delete(row.key)
      await db().prepare('DELETE FROM media WHERE id = ?').bind(id).run()
    }
    return { ok: true }
  })
