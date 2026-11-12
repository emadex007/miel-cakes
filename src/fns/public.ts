import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import type { GalleryItem, Review } from '~/lib/types'
import { db, queryCategories, queryProducts, queryZones } from '~/server/db'
import { loadSettings } from '~/server/settings'

export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const [settings, categories] = await Promise.all([loadSettings(), queryCategories(true)])
  // Categories for the header menu, carried as text so every page has them
  settings.nav_categories = JSON.stringify(categories.map((c) => ({ name: c.name, slug: c.slug })))
  return settings
})

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [categories, featured, daily, labelled, cheapest, delivered, zones, gallery, reviews] = await Promise.all([
    queryCategories(true),
    queryProducts('WHERE p.featured = 1 AND c.is_active = 1'),
    queryProducts("WHERE p.availability = 'daily' AND p.is_available = 1 AND c.is_active = 1"),
    queryProducts("WHERE p.badge != '' AND c.is_active = 1"),
    queryProducts("WHERE c.is_active = 1 AND p.is_available = 1 AND (lower(c.name) LIKE '%cake%' OR lower(c.slug) LIKE '%cake%')"),
    db()
      .prepare(
        `SELECT (SELECT COUNT(*) FROM orders WHERE status = 'completed') + (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS n`,
      )
      .first<{ n: number }>()
      .then((r) => r?.n ?? 0),
    queryZones(true),
    db()
      .prepare('SELECT * FROM gallery_items ORDER BY featured DESC, sort, id DESC LIMIT 6')
      .all<GalleryItem>()
      .then((r) => r.results),
    db()
      .prepare('SELECT * FROM reviews WHERE is_visible = 1 ORDER BY sort, id DESC LIMIT 9')
      .all<Review>()
      .then((r) => r.results),
  ])
  const favourites = featured.slice(0, 4)
  const shownIds = new Set(favourites.map((p) => p.id))
  // Ready-to-go: same-day items, avoiding repeats from the favourites row where possible
  const ready = [...daily.filter((p) => !shownIds.has(p.id)), ...daily.filter((p) => shownIds.has(p.id))].slice(0, 4)
  const prices = cheapest.flatMap((p) => p.options.map((o) => o.price)).filter((n) => n > 0)
  return {
    categories,
    featured: favourites,
    ready,
    labelled,
    cakesFrom: prices.length ? Math.min(...prices) : 0,
    delivered,
    zones,
    gallery,
    reviews,
  }
})

export const getMenu = createServerFn({ method: 'GET' }).handler(async () => {
  const [categories, products] = await Promise.all([
    queryCategories(true),
    queryProducts('WHERE c.is_active = 1'),
  ])
  return { categories, products }
})

export const getProduct = createServerFn({ method: 'GET' })
  .validator((slug: string) => String(slug))
  .handler(async ({ data: slug }) => {
    const [product] = await queryProducts('WHERE p.slug = ? AND c.is_active = 1', [slug])
    if (!product) throw notFound()
    const related = (await queryProducts('WHERE p.category_id = ? AND p.id != ? AND c.is_active = 1', [
      product.category_id,
      product.id,
    ])).slice(0, 4)
    const s = await loadSettings()
    const settings = { business_name: s.business_name, site_url: s.site_url }
    return { product, related, settings }
  })

export const getZones = createServerFn({ method: 'GET' }).handler(async () => queryZones(true))
