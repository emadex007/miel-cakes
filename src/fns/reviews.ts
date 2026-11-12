import { createServerFn } from '@tanstack/react-start'
import type { Review } from '~/lib/types'
import { requireAdmin } from '~/server/auth'
import { db } from '~/server/db'

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}

export const getVisibleReviews = createServerFn({ method: 'GET' }).handler(async () => {
  const { results } = await db().prepare('SELECT * FROM reviews WHERE is_visible = 1 ORDER BY sort, id DESC LIMIT 24').all<Review>()
  return results
})

export const listReviewsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db().prepare('SELECT * FROM reviews ORDER BY sort, id DESC').all<Review>()
  return results
})

export interface ReviewInput {
  id?: number
  name: string
  occasion: string
  body: string
  rating: number
  photo_url: string
  is_visible: boolean | number
  sort: number
}

export const saveReview = createServerFn({ method: 'POST' })
  .validator((d: ReviewInput) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const name = str(data.name, 80)
    const body = str(data.body, 1200)
    if (!name) throw new Error('Add the customer’s name (a first name is fine).')
    if (!body) throw new Error('Add what the customer said.')
    const values = [name, str(data.occasion, 80), body, Math.min(5, Math.max(1, int(data.rating, 5))), str(data.photo_url, 1000), data.is_visible ? 1 : 0, int(data.sort)]
    if (data.id) {
      await db()
        // Any save (including switching it on or off) counts as looked at
        .prepare('UPDATE reviews SET name=?, occasion=?, body=?, rating=?, photo_url=?, is_visible=?, sort=?, seen=1 WHERE id=?')
        .bind(...values, int(data.id))
        .run()
      return { id: int(data.id) }
    }
    const r = await db()
      .prepare('INSERT INTO reviews (name, occasion, body, rating, photo_url, is_visible, sort) VALUES (?,?,?,?,?,?,?)')
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const deleteReview = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    await db().prepare('DELETE FROM reviews WHERE id = ?').bind(id).run()
    return { ok: true }
  })
