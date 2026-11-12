// Server-only: loads an order with its items and tracking events.
import type { Order, OrderEvent, OrderItemRow } from '~/lib/orders'
import { db } from './db'

export async function loadOrder(where: string, bind: unknown[]) {
  const order = await db()
    .prepare(
      `SELECT o.*, z.name AS zone_name, COALESCE(NULLIF(o.contact_name, ''), c.name) AS customer_name, COALESCE(NULLIF(o.contact_email, ''), c.email) AS customer_email, c.phone AS customer_phone
       FROM orders o LEFT JOIN delivery_zones z ON z.id = o.zone_id JOIN customers c ON c.id = o.customer_id ${where}`,
    )
    .bind(...bind)
    .first<Order>()
  if (!order) return null
  const [items, events] = await Promise.all([
    db().prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').bind(order.id).all<OrderItemRow>().then((r) => r.results),
    db().prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').bind(order.id).all<OrderEvent>().then((r) => r.results),
  ])
  return { order, items, events }
}
