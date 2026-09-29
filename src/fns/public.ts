import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import type { GalleryItem, Review } from '~/lib/types'
import { db, queryCategories, queryProducts, queryZones } from '~/server/db'
import { loadSettings } from '~/server/settings'

export const getSiteSettings = createServerFn({ method: 'GET' }).handler(async () => {
  return loadSettings()
})

export const getHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const [categories, featured, zones, gallery, reviews] = await Promise.all([
    queryCategories(true),
    queryProducts('WHERE p.featured = 1 AND c.is_active = 1'),
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
  return { categories, featured: featured.slice(0, 8), zones, gallery, reviews }
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
    return { product, related }
  })

export const getZones = createServerFn({ method: 'GET' }).handler(async () => queryZones(true))
