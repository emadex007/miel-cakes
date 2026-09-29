import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import type { CartLine, Order, OrderStatus } from '~/lib/orders'
import type { DeliveryZone, Product } from '~/lib/types'
import {
  currentCustomer,
  endCustomerSession,
  hashPassword,
  requireCustomer,
  startCustomerSession,
  verifyPassword,
} from '~/server/auth'
import { db, mapProduct, queryZones, workerEnv } from '~/server/db'
import { loadOrder } from '~/server/orders'
import { paystackInitialize, paystackVerify, markOrderPaidByReference } from '~/server/paystack'
import { loadSettings } from '~/server/settings'

// ---------- helpers ----------
const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}
const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10) // Africa/Lagos is UTC+1
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const digits = (s: string) => (s || '').replace(/\D/g, '')

async function paymentOptions() {
  const s = await loadSettings()
  const paystack = s.paystack_enabled === '1' && !!workerEnv().PAYSTACK_SECRET_KEY
  const transfer = s.transfer_enabled === '1' || !paystack // always leave at least one way to pay
  return { paystack, transfer }
}

function siteOrigin() {
  try {
    return new URL(getRequest().url).origin
  } catch {
    return ''
  }
}

// =====================================================================
// Accounts
// =====================================================================
export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const c = await currentCustomer()
  if (!c) return null
  const row = await db().prepare('SELECT COALESCE(SUM(qty), 0) AS n FROM cart_items WHERE customer_id = ?').bind(c.id).first<{ n: number }>()
  return { ...c, cartCount: row?.n ?? 0 }
})

export const signUp = createServerFn({ method: 'POST' })
  .validator((d: { name: string; email: string; phone: string; password: string }) => d)
  .handler(async ({ data }) => {
    const name = str(data.name, 100)
    const email = str(data.email, 200).toLowerCase()
    const phone = str(data.phone, 40)
    if (!name) throw new Error('Please enter your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')
    if (digits(phone).length < 7) throw new Error('Please enter a phone number we can reach you on.')
    if (String(data.password ?? '').length < 8) throw new Error('Your password must be at least 8 characters.')
    const exists = await db().prepare('SELECT id FROM customers WHERE email = ?').bind(email).first()
    if (exists) throw new Error('An account with this email already exists. Sign in instead.')
    const r = await db()
      .prepare('INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
      .bind(name, email, phone, await hashPassword(String(data.password)))
      .run()
    const id = Number(r.meta.last_row_id)
    // Also add them to the owner's customer records, unless that phone is already there
    const known = await db().prepare("SELECT id FROM clients WHERE phone = ? AND phone != ''").bind(phone).first()
    if (!known) {
      await db()
        .prepare("INSERT INTO clients (name, phone, email, source, notes) VALUES (?, ?, ?, 'website', 'Signed up on the website')")
        .bind(name, phone, email)
        .run()
    }
    await startCustomerSession(id)
    return { ok: true }
  })

export const signIn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const row = await db()
      .prepare('SELECT id, password_hash FROM customers WHERE email = ?')
      .bind(str(data.email, 200).toLowerCase())
      .first<{ id: number; password_hash: string }>()
    if (!row || !(await verifyPassword(String(data.password ?? ''), row.password_hash))) {
      throw new Error('That email and password don’t match. Check them and try again.')
    }
    await startCustomerSession(row.id)
    return { ok: true }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  await endCustomerSession()
  return { ok: true }
})

export const updateMyDetails = createServerFn({ method: 'POST' })
  .validator((d: { name: string; phone: string; current?: string; next?: string }) => d)
  .handler(async ({ data }) => {
    const me = await requireCustomer()
    const name = str(data.name, 100)
    const phone = str(data.phone, 40)
    if (!name) throw new Error('Please enter your name.')
    if (digits(phone).length < 7) throw new Error('Please enter a phone number we can reach you on.')
    await db().prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?').bind(name, phone, me.id).run()
    if (data.next) {
      if (String(data.next).length < 8) throw new Error('Your new password must be at least 8 characters.')
      const row = await db().prepare('SELECT password_hash FROM customers WHERE id = ?').bind(me.id).first<{ password_hash: string }>()
      if (!row || !(await verifyPassword(String(data.current ?? ''), row.password_hash))) throw new Error('Your current password is wrong.')
      await db().prepare('UPDATE customers SET password_hash = ? WHERE id = ?').bind(await hashPassword(String(data.next)), me.id).run()
    }
    return { ok: true }
  })

// =====================================================================
// Cart
// =====================================================================
type ProductRow = Omit<Product, 'options'> & { options_json: string }

async function cartLines(customerId: number): Promise<CartLine[]> {
  const { results } = await db()
    .prepare(
      `SELECT ci.id, ci.product_id, ci.option_label, ci.qty, ci.note, p.name, p.slug, p.image_url, p.options_json,
              p.is_available, p.availability, p.notice_days
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.customer_id = ? ORDER BY ci.id`,
    )
    .bind(customerId)
    .all<{
      id: number
      product_id: number
      option_label: string
      qty: number
      note: string
      name: string
      slug: string
      image_url: string
      options_json: string
      is_available: number
      availability: 'daily' | 'preorder'
      notice_days: number
    }>()
  return results.map((r) => {
    let price = 0
    try {
      const opts = JSON.parse(r.options_json || '[]') as { label: string; price: number }[]
      price = Math.round(Number(opts.find((o) => o.label === r.option_label)?.price ?? opts[0]?.price ?? 0))
    } catch {
      price = 0
    }
    return {
      id: r.id,
      product_id: r.product_id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      option_label: r.option_label,
      unit_price: price,
      qty: r.qty,
      note: r.note,
      is_available: r.is_available,
      availability: r.availability,
      notice_days: r.notice_days,
    }
  })
}

export const addToCart = createServerFn({ method: 'POST' })
  .validator((d: { product_id: number; option_label: string; qty: number; note: string }) => d)
  .handler(async ({ data }) => {
    const me = await currentCustomer()
    if (!me) return { needLogin: true as const }
    const row = await db().prepare('SELECT * FROM products WHERE id = ?').bind(int(data.product_id)).first<ProductRow>()
    if (!row) throw new Error('That item is no longer on the menu.')
    const product = mapProduct(row)
    if (!product.is_available) throw new Error(`${product.name} is sold out right now.`)
    const option = product.options.find((o) => o.label === data.option_label) ?? product.options[0]
    if (!option) throw new Error('Please choose a size.')
    const qty = Math.min(99, Math.max(1, int(data.qty, 1)))
    const note = str(data.note, 300)
    const existing = await db()
      .prepare('SELECT id, qty FROM cart_items WHERE customer_id = ? AND product_id = ? AND option_label = ? AND note = ?')
      .bind(me.id, product.id, option.label, note)
      .first<{ id: number; qty: number }>()
    if (existing) {
      await db().prepare('UPDATE cart_items SET qty = ? WHERE id = ?').bind(Math.min(99, existing.qty + qty), existing.id).run()
    } else {
      await db()
        .prepare('INSERT INTO cart_items (customer_id, product_id, option_label, qty, note) VALUES (?, ?, ?, ?, ?)')
        .bind(me.id, product.id, option.label, qty, note)
        .run()
    }
    const count = await db().prepare('SELECT COALESCE(SUM(qty), 0) AS n FROM cart_items WHERE customer_id = ?').bind(me.id).first<{ n: number }>()
    return { needLogin: false as const, cartCount: count?.n ?? 0 }
  })

export const updateCartItem = createServerFn({ method: 'POST' })
  .validator((d: { id: number; qty: number }) => d)
  .handler(async ({ data }) => {
    const me = await requireCustomer()
    const qty = int(data.qty)
    if (qty <= 0) await db().prepare('DELETE FROM cart_items WHERE id = ? AND customer_id = ?').bind(int(data.id), me.id).run()
    else await db().prepare('UPDATE cart_items SET qty = ? WHERE id = ? AND customer_id = ?').bind(Math.min(99, qty), int(data.id), me.id).run()
    return { ok: true }
  })

export const getCheckout = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await currentCustomer()
  if (!me) return null
  const [lines, zones, blocked, pay] = await Promise.all([
    cartLines(me.id),
    queryZones(true),
    db()
      .prepare('SELECT date, reason FROM blocked_dates WHERE date >= ? ORDER BY date')
      .bind(lagosToday())
      .all<{ date: string; reason: string }>()
      .then((r) => r.results),
    paymentOptions(),
  ])
  const maxNotice = Math.max(0, ...lines.map((l) => (l.availability === 'preorder' ? l.notice_days : 0)))
  return { me, lines, zones, blocked, pay, minDate: addDays(lagosToday(), maxNotice), maxNotice }
})

// =====================================================================
// Place order + pay
// =====================================================================
export interface PlaceOrderInput {
  fulfilment: 'pickup' | 'delivery'
  zone_id: number | null
  address: string
  contact_phone: string
  needed_date: string
  note: string
  payment_method: 'paystack' | 'transfer'
}

async function startPaystack(order: { id: number; code: string; total: number }, email: string) {
  const secret = workerEnv().PAYSTACK_SECRET_KEY
  if (!secret) throw new Error('Card payment isn’t available right now. Please pay by bank transfer.')
  const reference = `${order.code}-${randomHex(4)}`
  await db().prepare("UPDATE orders SET paystack_ref = ?, payment_method = 'paystack', updated_at = datetime('now') WHERE id = ?").bind(reference, order.id).run()
  return paystackInitialize(secret, {
    email,
    amountNaira: order.total,
    reference,
    callbackUrl: `${siteOrigin()}/orders/${order.code}?paid=1`,
    metadata: { order_code: order.code },
  })
}

export const placeOrder = createServerFn({ method: 'POST' })
  .validator((d: PlaceOrderInput) => d)
  .handler(async ({ data }) => {
    const me = await requireCustomer()
    const lines = await cartLines(me.id)
    if (!lines.length) throw new Error('Your cart is empty.')
    const soldOut = lines.filter((l) => !l.is_available)
    if (soldOut.length) throw new Error(`${soldOut.map((l) => l.name).join(', ')} ${soldOut.length > 1 ? 'are' : 'is'} sold out. Please remove ${soldOut.length > 1 ? 'them' : 'it'} from your cart.`)

    // Date: must respect the longest notice period and not be fully booked
    const needed = str(data.needed_date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(needed)) throw new Error('Please choose the date you need your order.')
    const maxNotice = Math.max(0, ...lines.map((l) => (l.availability === 'preorder' ? l.notice_days : 0)))
    const minDate = addDays(lagosToday(), maxNotice)
    if (needed < minDate) throw new Error(`The earliest date for this order is ${minDate}, because some items need ${maxNotice} days’ notice.`)
    const blocked = await db().prepare('SELECT reason FROM blocked_dates WHERE date = ?').bind(needed).first<{ reason: string }>()
    if (blocked) throw new Error(`We’re fully booked on ${needed}${blocked.reason ? ` (${blocked.reason})` : ''}. Please choose another date.`)

    // Delivery
    let zone: DeliveryZone | null = null
    const address = str(data.address, 400)
    if (data.fulfilment === 'delivery') {
      zone = await db().prepare('SELECT * FROM delivery_zones WHERE id = ? AND is_active = 1').bind(int(data.zone_id)).first<DeliveryZone>()
      if (!zone) throw new Error('Please choose your delivery area.')
      if (address.length < 8) throw new Error('Please enter your full delivery address.')
    }
    const phone = str(data.contact_phone, 40) || me.phone
    if (digits(phone).length < 7) throw new Error('Please enter a phone number we can reach you on.')

    // Payment method
    const pay = await paymentOptions()
    const method = data.payment_method === 'paystack' && pay.paystack ? 'paystack' : 'transfer'
    if (method === 'transfer' && !pay.transfer) throw new Error('Please choose a payment method.')

    // Totals (always recalculated here from current menu prices)
    const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
    const deliveryFee = zone ? zone.fee : 0
    const total = subtotal + deliveryFee

    const r = await db()
      .prepare(
        `INSERT INTO orders (code, customer_id, status, fulfilment, zone_id, address, contact_phone, needed_date, subtotal,
         delivery_fee, total, payment_method, payment_status, note) VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
      )
      .bind(`pending-${randomHex(6)}`, me.id, zone ? 'delivery' : 'pickup', zone?.id ?? null, address, phone, needed, subtotal, deliveryFee, total, method, str(data.note, 1000))
      .run()
    const id = Number(r.meta.last_row_id)
    const code = `MC-${1000 + id}`
    await db().batch([
      db().prepare('UPDATE orders SET code = ? WHERE id = ?').bind(code, id),
      ...lines.map((l) =>
        db()
          .prepare('INSERT INTO order_items (order_id, product_id, name, option_label, unit_price, qty, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(id, l.product_id, l.name, l.option_label, l.unit_price, l.qty, l.note),
      ),
      db().prepare(`INSERT INTO order_events (order_id, status, note) VALUES (?, 'pending_payment', 'Order placed on the website')`).bind(id),
      db().prepare('DELETE FROM cart_items WHERE customer_id = ?').bind(me.id),
    ])

    if (method === 'paystack') {
      try {
        const payUrl = await startPaystack({ id, code, total }, me.email)
        return { code, payUrl }
      } catch (e) {
        return { code, payUrl: null, payError: e instanceof Error ? e.message : 'Card payment could not start.' }
      }
    }
    return { code, payUrl: null }
  })


export const getMyOrder = createServerFn({ method: 'GET' })
  .validator((d: { code: string; checkPayment?: boolean }) => d)
  .handler(async ({ data }) => {
    const me = await currentCustomer()
    if (!me) return { needLogin: true as const }
    let found = await loadOrder('WHERE o.code = ? AND o.customer_id = ?', [str(data.code, 20), me.id])
    if (!found) return { needLogin: false as const, notFound: true as const }
    // Returning from Paystack: confirm with Paystack straight away
    const secret = workerEnv().PAYSTACK_SECRET_KEY
    if (data.checkPayment && secret && found.order.paystack_ref && found.order.payment_status !== 'paid') {
      const v = await paystackVerify(secret, found.order.paystack_ref)
      if (v?.paid && v.currency === 'NGN') {
        await markOrderPaidByReference(db(), v.reference, v.amountNaira)
        found = await loadOrder('WHERE o.id = ?', [found.order.id])
      }
    }
    const pay = await paymentOptions()
    return { needLogin: false as const, notFound: false as const, ...found!, pay }
  })

export const retryCardPayment = createServerFn({ method: 'POST' })
  .validator((code: string) => str(code, 20))
  .handler(async ({ data: code }) => {
    const me = await requireCustomer()
    const o = await db()
      .prepare("SELECT id, code, total FROM orders WHERE code = ? AND customer_id = ? AND payment_status = 'unpaid' AND status != 'cancelled'")
      .bind(code, me.id)
      .first<{ id: number; code: string; total: number }>()
    if (!o) throw new Error('This order can’t be paid online.')
    if (!(await paymentOptions()).paystack) throw new Error('Card payment isn’t available right now. Please pay by bank transfer.')
    return { payUrl: await startPaystack(o, me.email) }
  })

export const switchToTransfer = createServerFn({ method: 'POST' })
  .validator((code: string) => str(code, 20))
  .handler(async ({ data: code }) => {
    const me = await requireCustomer()
    await db()
      .prepare("UPDATE orders SET payment_method = 'transfer', updated_at = datetime('now') WHERE code = ? AND customer_id = ? AND payment_status = 'unpaid'")
      .bind(code, me.id)
      .run()
    return { ok: true }
  })

export const myOrders = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await currentCustomer()
  if (!me) return null
  const { results } = await db()
    .prepare('SELECT id, code, status, fulfilment, needed_date, total, payment_status, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 100')
    .bind(me.id)
    .all<Pick<Order, 'id' | 'code' | 'status' | 'fulfilment' | 'needed_date' | 'total' | 'payment_status' | 'created_at'>>()
  return { me, orders: results }
})

// =====================================================================
// Public tracking (order number + phone, no login)
// =====================================================================
export const trackOrder = createServerFn({ method: 'POST' })
  .validator((d: { code: string; phone: string }) => d)
  .handler(async ({ data }) => {
    const code = str(data.code, 20).toUpperCase().replace(/\s+/g, '')
    const phone = digits(data.phone).slice(-7)
    if (!code || phone.length < 7) throw new Error('Enter your order number and the phone number you used.')
    const found = await loadOrder('WHERE o.code = ?', [code.startsWith('MC-') ? code : `MC-${code.replace(/^MC/, '')}`])
    const match = found && [found.order.contact_phone, found.order.customer_phone ?? ''].some((p) => digits(p).slice(-7) === phone)
    if (!found || !match) throw new Error('We couldn’t find an order with that number and phone. Check both and try again.')
    const { order, items, events } = found
    return {
      code: order.code,
      status: order.status as OrderStatus,
      fulfilment: order.fulfilment,
      needed_date: order.needed_date,
      zone_name: order.zone_name ?? '',
      items: items.map((i) => ({ name: i.name, option_label: i.option_label, qty: i.qty })),
      events: events.map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
    }
  })
