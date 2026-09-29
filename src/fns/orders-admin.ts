import { createServerFn } from '@tanstack/react-start'
import type { Order, OrderStatus } from '~/lib/orders'
import { hashPassword, requireAdmin } from '~/server/auth'
import { db } from '~/server/db'
import { loadOrder } from '~/server/orders'

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}
const STATUSES: OrderStatus[] = ['pending_payment', 'awaiting_confirmation', 'received', 'baking', 'ready', 'out_for_delivery', 'completed', 'cancelled']

export const listOrders = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT o.id, o.code, o.status, o.fulfilment, o.needed_date, o.total, o.payment_method, o.payment_status, o.proof_key,
              o.created_at, o.contact_phone, c.name AS customer_name, z.name AS zone_name,
              (SELECT COALESCE(SUM(qty), 0) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o JOIN customers c ON c.id = o.customer_id LEFT JOIN delivery_zones z ON z.id = o.zone_id
       ORDER BY o.id DESC LIMIT 1000`,
    )
    .all<Order & { item_count: number }>()
  return results
})

export const getOrderAdmin = createServerFn({ method: 'GET' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const found = await loadOrder('WHERE o.id = ?', [id])
    if (!found) throw new Error('That order no longer exists.')
    return found
  })

export const setOrderStatus = createServerFn({ method: 'POST' })
  .validator((d: { id: number; status: OrderStatus; note: string }) => d)
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (!STATUSES.includes(data.status)) throw new Error('Choose a valid status.')
    const note = str(data.note, 500) || `Updated by ${admin.name.split(' ')[0]}`
    await db().batch([
      db().prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(data.status, int(data.id)),
      db().prepare('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)').bind(int(data.id), data.status, note),
    ])
    return { ok: true }
  })

export const confirmPayment = createServerFn({ method: 'POST' })
  .validator((d: { id: number; note: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const id = int(data.id)
    await db().batch([
      db()
        .prepare(
          `UPDATE orders SET payment_status = 'paid', paid_at = datetime('now'), updated_at = datetime('now'),
           status = CASE WHEN status IN ('pending_payment', 'awaiting_confirmation') THEN 'received' ELSE status END WHERE id = ?`,
        )
        .bind(id),
      db().prepare(`INSERT INTO order_events (order_id, status, note) VALUES (?, 'received', ?)`).bind(id, str(data.note, 300) || 'Payment confirmed'),
    ])
    return { ok: true }
  })

export const resetCustomerPassword = createServerFn({ method: 'POST' })
  .validator((customerId: number) => int(customerId))
  .handler(async ({ data: customerId }) => {
    await requireAdmin()
    // Easy to read out on the phone: no 0/O or 1/l
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(10))
    const temp = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
    await db().batch([
      db().prepare('UPDATE customers SET password_hash = ? WHERE id = ?').bind(await hashPassword(temp), customerId),
      db().prepare("DELETE FROM sessions WHERE user_type = 'customer' AND user_id = ?").bind(customerId),
    ])
    return { temp }
  })

// ---------- fully booked dates ----------
export const listBlockedDates = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const today = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10)
  const { results } = await db().prepare('SELECT date, reason FROM blocked_dates WHERE date >= ? ORDER BY date').bind(today).all<{ date: string; reason: string }>()
  return results
})

export const addBlockedDate = createServerFn({ method: 'POST' })
  .validator((d: { date: string; reason: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('Choose a date.')
    await db()
      .prepare('INSERT INTO blocked_dates (date, reason) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason')
      .bind(data.date, str(data.reason, 120))
      .run()
    return { ok: true }
  })

export const removeBlockedDate = createServerFn({ method: 'POST' })
  .validator((date: string) => str(date, 10))
  .handler(async ({ data: date }) => {
    await requireAdmin()
    await db().prepare('DELETE FROM blocked_dates WHERE date = ?').bind(date).run()
    return { ok: true }
  })
