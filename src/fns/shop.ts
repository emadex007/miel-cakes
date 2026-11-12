import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { CHOICE_GROUPS, TEXT_FIELDS, customExtra, parseChoices, parseCustom, type CakeCustom } from '~/lib/custom'
import type { CartLine, Order, OrderStatus } from '~/lib/orders'
import type { DeliveryZone, Product } from '~/lib/types'
import {
  adoptGuest,
  currentCustomer,
  endCustomerSession,
  getOrCreateCustomer,
  hashPassword,
  requireCustomer,
  startCustomerSession,
  verifyPassword,
} from '~/server/auth'
import { db, mapProduct, media, queryZones, workerEnv } from '~/server/db'
import { loadBooking } from '~/server/bookings'
import { loadOrder } from '~/server/orders'
import { discountFor, findDiscount, normaliseCode } from '~/server/discounts'
import { paystackInitialize, paystackVerify, markOrderPaidByReference } from '~/server/paystack'
import { loadSettings } from '~/server/settings'
import { addClientRecord, contactDetails } from '~/server/customers'
import { orderPaid, orderPlaced } from '~/server/happenings'

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
  // Guests have a cart but no account: don't show a placeholder email
  return { ...c, email: c.is_guest ? '' : c.email, guest: !!c.is_guest, cartCount: row?.n ?? 0 }
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
    const guest = await currentCustomer()
    if (guest?.is_guest) {
      // Turn the guest record into a real account, so their orders stay with them
      await db()
        .prepare('UPDATE customers SET name = ?, email = ?, phone = ?, password_hash = ?, is_guest = 0 WHERE id = ?')
        .bind(name, email, phone, await hashPassword(String(data.password)), guest.id)
        .run()
      await addClientRecord(name, phone, email)
      return { ok: true }
    }
    const r = await db()
      .prepare('INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
      .bind(name, email, phone, await hashPassword(String(data.password)))
      .run()
    const id = Number(r.meta.last_row_id)
    await addClientRecord(name, phone, email)
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
    // Bring across anything they added or ordered before signing in
    const guest = await currentCustomer()
    if (guest?.is_guest) await adoptGuest(guest.id, row.id)
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
type ProductRow = Omit<Product, 'options' | 'media'> & { options_json: string; media_json?: string }

async function cartLines(customerId: number): Promise<CartLine[]> {
  const { results } = await db()
    .prepare(
      `SELECT ci.id, ci.product_id, ci.option_label, ci.qty, ci.note, ci.custom_json, ci.ref_key, p.name, p.slug, p.image_url, p.options_json,
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
      custom_json: string
      ref_key: string
      name: string
      slug: string
      image_url: string
      options_json: string
      is_available: number
      availability: 'daily' | 'preorder'
      notice_days: number
    }>()
  const settings = results.some((r) => r.custom_json) ? await loadSettings() : {}
  return results.map((r) => {
    let price = 0
    try {
      const opts = JSON.parse(r.options_json || '[]') as { label: string; price: number }[]
      price = Math.round(Number(opts.find((o) => o.label === r.option_label)?.price ?? opts[0]?.price ?? 0))
    } catch {
      price = 0
    }
    const extras = customExtra(parseCustom(r.custom_json), settings)
    return {
      id: r.id,
      product_id: r.product_id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      option_label: r.option_label,
      unit_price: price + extras,
      extras,
      custom_json: r.custom_json || '',
      ref_key: r.ref_key || '',
      qty: r.qty,
      note: r.note,
      is_available: r.is_available,
      availability: r.availability,
      notice_days: r.notice_days,
    }
  })
}

/** Keeps only real choices (from the current lists) and trimmed text. */
async function cleanCustom(custom: CakeCustom | undefined | null): Promise<string> {
  if (!custom || typeof custom !== 'object') return ''
  const settings = await loadSettings()
  const out: CakeCustom = {}
  for (const g of CHOICE_GROUPS) {
    const picked = str(custom[g.key], 80)
    if (!picked) continue
    if (!parseChoices(settings[g.setting]).some((c) => c.label === picked)) {
      throw new Error(`“${picked}” is no longer available for ${g.label.toLowerCase()}. Please choose again.`)
    }
    out[g.key] = picked
  }
  for (const f of TEXT_FIELDS) {
    const v = str(custom[f.key], f.max)
    if (v) out[f.key] = v
  }
  return Object.keys(out).length ? JSON.stringify(out) : ''
}

/** Starts a guest cart for this browser (no account needed to order). */
export const startGuest = createServerFn({ method: 'POST' }).handler(async () => {
  const me = await getOrCreateCustomer()
  return { id: me.id }
})

export const addToCart = createServerFn({ method: 'POST' })
  .validator((d: { product_id: number; option_label: string; qty: number; note: string; custom?: CakeCustom | null; ref_key?: string }) => d)
  .handler(async ({ data }) => {
    const me = await getOrCreateCustomer()
    const row = await db().prepare('SELECT * FROM products WHERE id = ?').bind(int(data.product_id)).first<ProductRow>()
    if (!row) throw new Error('That item is no longer on the menu.')
    const product = mapProduct(row)
    if (!product.is_available) throw new Error(`${product.name} is sold out right now.`)
    const option = product.options.find((o) => o.label === data.option_label) ?? product.options[0]
    if (!option) throw new Error('Please choose a size.')
    const qty = Math.min(99, Math.max(1, int(data.qty, 1)))
    const note = str(data.note, 300)
    const customJson = product.customizable ? await cleanCustom(data.custom) : ''
    // Only pictures this site stored privately for customers
    const refKey = /^refs\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(str(data.ref_key, 80)) ? str(data.ref_key, 80) : ''
    const existing = refKey
      ? null
      : await db()
          .prepare("SELECT id, qty FROM cart_items WHERE customer_id = ? AND product_id = ? AND option_label = ? AND note = ? AND custom_json = ? AND ref_key = ''")
          .bind(me.id, product.id, option.label, note, customJson)
          .first<{ id: number; qty: number }>()
    if (existing) {
      await db().prepare('UPDATE cart_items SET qty = ? WHERE id = ?').bind(Math.min(99, existing.qty + qty), existing.id).run()
    } else {
      await db()
        .prepare('INSERT INTO cart_items (customer_id, product_id, option_label, qty, note, custom_json, ref_key) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(me.id, product.id, option.label, qty, note, customJson, refKey)
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
    if (qty <= 0) {
      const row = await db().prepare('SELECT ref_key FROM cart_items WHERE id = ? AND customer_id = ?').bind(int(data.id), me.id).first<{ ref_key: string }>()
      await db().prepare('DELETE FROM cart_items WHERE id = ? AND customer_id = ?').bind(int(data.id), me.id).run()
      // Tidy up: delete the cake picture unless an order is using it
      if (row?.ref_key) {
        const used = await db().prepare('SELECT 1 FROM order_items WHERE ref_key = ? UNION SELECT 1 FROM cart_items WHERE ref_key = ?').bind(row.ref_key, row.ref_key).first()
        if (!used) await media().delete(row.ref_key)
      }
    }
    else await db().prepare('UPDATE cart_items SET qty = ? WHERE id = ? AND customer_id = ?').bind(Math.min(99, qty), int(data.id), me.id).run()
    return { ok: true }
  })

export const getCheckout = createServerFn({ method: 'GET' }).handler(async () => {
  const found = await currentCustomer()
  const me = found ? { ...found, email: found.is_guest ? '' : found.email, guest: !!found.is_guest } : null
  const [lines, zones, blocked, pay, settings, full] = await Promise.all([
    me ? cartLines(me.id) : Promise.resolve([] as CartLine[]),
    queryZones(true),
    db()
      .prepare('SELECT date, reason FROM blocked_dates WHERE date >= ? ORDER BY date')
      .bind(lagosToday())
      .all<{ date: string; reason: string }>()
      .then((r) => r.results),
    paymentOptions(),
    loadSettings(),
    fullDates(),
  ])
  const maxNotice = Math.max(0, ...lines.map((l) => (l.availability === 'preorder' ? l.notice_days : 0)))
  const known = new Set(blocked.map((b) => b.date))
  const allBlocked = [...blocked, ...full.filter((d) => !known.has(d)).map((date) => ({ date, reason: 'Fully booked' }))].sort((a, b) => a.date.localeCompare(b.date))
  return {
    me: me ?? { id: 0, name: '', email: '', phone: '', is_guest: 1, guest: true },
    lines,
    zones,
    blocked: allBlocked,
    pay,
    minDate: addDays(lagosToday(), maxNotice),
    maxNotice,
    slots: timeSlots(settings),
    terms: termsSummary(settings),
  }
})

/** The short "before you order" points shown in a box at checkout. */
const termsSummary = (settings: Record<string, string>) =>
  (settings.checkout_terms ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const timeSlots = (settings: Record<string, string>) =>
  (settings.delivery_slots ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

/** Dates that have reached the daily order limit (cancelled orders don't count). */
async function fullDates(): Promise<string[]> {
  const limit = int((await loadSettings()).daily_order_limit)
  if (limit <= 0) return []
  const { results } = await db()
    .prepare(
      `SELECT needed_date AS d FROM orders WHERE needed_date >= ? AND status != 'cancelled'
       GROUP BY needed_date HAVING COUNT(*) >= ?`,
    )
    .bind(lagosToday(), limit)
    .all<{ d: string }>()
  return results.map((r) => r.d)
}

/** Checkout preview: is this code valid for what's in the cart, and how much does it take off? */
export const checkDiscount = createServerFn({ method: 'POST' })
  .validator((code: string) => String(code ?? ''))
  .handler(async ({ data: code }) => {
    const me = await requireCustomer()
    const lines = await cartLines(me.id)
    const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
    const d = await findDiscount(db(), code)
    const r = discountFor(d, subtotal)
    if (!r.ok) throw new Error(r.reason)
    return { code: d!.code, amount: r.amount, label: r.label }
  })

// =====================================================================
// Place order + pay
// =====================================================================
export interface PlaceOrderInput {
  /** own_rider = the customer sends their own rider to collect from us */
  fulfilment: 'pickup' | 'delivery' | 'own_rider'
  contact_name: string
  contact_email: string
  agree_terms: boolean
  zone_id: number | null
  address: string
  contact_phone: string
  needed_date: string
  time_slot: string
  discount_code: string
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
    if ((await fullDates()).includes(needed)) throw new Error(`We’re fully booked on ${needed}. Please choose another date.`)

    // Time slot (only when she has set some up)
    const settings = await loadSettings()
    const slots = timeSlots(settings)
    const slot = str(data.time_slot, 80)
    if (slots.length && !slots.includes(slot)) throw new Error('Please choose a time for your order.')

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
    const contact = await contactDetails(me, data.contact_name, data.contact_email, phone)
    if (!data.agree_terms) throw new Error('Please tick the box to agree to our terms before ordering.')
    const ownRider = data.fulfilment === 'own_rider' ? 1 : 0

    // Payment method
    const pay = await paymentOptions()
    const method = data.payment_method === 'paystack' && pay.paystack ? 'paystack' : 'transfer'
    if (method === 'transfer' && !pay.transfer) throw new Error('Please choose a payment method.')

    // Totals (always recalculated here from current menu prices)
    const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
    const deliveryFee = zone ? zone.fee : 0
    let discount = 0
    let discountCode = ''
    if (normaliseCode(data.discount_code)) {
      const d = await findDiscount(db(), data.discount_code)
      const r = discountFor(d, subtotal)
      if (!r.ok) throw new Error(`Discount code: ${r.reason}`)
      discount = r.amount
      discountCode = d!.code
    }
    const total = subtotal + deliveryFee - discount

    const r = await db()
      .prepare(
        `INSERT INTO orders (code, customer_id, status, fulfilment, zone_id, address, contact_phone, needed_date, time_slot, subtotal,
         delivery_fee, discount_code, discount, total, payment_method, payment_status, note, contact_name, contact_email, own_rider)
         VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?)`,
      )
      .bind(
        `pending-${randomHex(6)}`,
        me.id,
        zone ? 'delivery' : 'pickup',
        zone?.id ?? null,
        address,
        phone,
        needed,
        slot,
        subtotal,
        deliveryFee,
        discountCode,
        discount,
        total,
        method,
        str(data.note, 1000),
        contact.name,
        contact.email,
        ownRider,
      )
      .run()
    const id = Number(r.meta.last_row_id)
    const code = `MC-${1000 + id}`
    await db().batch([
      db().prepare('UPDATE orders SET code = ? WHERE id = ?').bind(code, id),
      ...lines.map((l) =>
        db()
          .prepare('INSERT INTO order_items (order_id, product_id, name, option_label, unit_price, qty, note, custom_json, ref_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, l.product_id, l.name, l.option_label, l.unit_price, l.qty, l.note, l.custom_json, l.ref_key),
      ),
      db().prepare(`INSERT INTO order_events (order_id, status, note) VALUES (?, 'pending_payment', 'Order placed on the website')`).bind(id),
      db().prepare('DELETE FROM cart_items WHERE customer_id = ?').bind(me.id),
      ...(discountCode ? [db().prepare('UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?').bind(discountCode)] : []),
    ])
    await orderPlaced(workerEnv(), siteOrigin(), id) // phone alert + emails

    if (method === 'paystack') {
      try {
        const payUrl = await startPaystack({ id, code, total }, contact.email)
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
        const paid = await markOrderPaidByReference(db(), v.reference, v.amountNaira)
        if (paid.ok && !paid.already && paid.orderId) await orderPaid(workerEnv(), siteOrigin(), paid.orderId, 'Paid by card')
        found = await loadOrder('WHERE o.id = ?', [found.order.id])
      }
    }
    const pay = await paymentOptions()
    const myReview = await db()
      .prepare('SELECT rating, body, is_visible FROM reviews WHERE order_id = ?')
      .bind(found!.order.id)
      .first<{ rating: number; body: string; is_visible: number }>()
    return { needLogin: false as const, notFound: false as const, ...found!, pay, myReview }
  })

export const retryCardPayment = createServerFn({ method: 'POST' })
  .validator((code: string) => str(code, 20))
  .handler(async ({ data: code }) => {
    const me = await requireCustomer()
    const o = await db()
      .prepare("SELECT id, code, total, contact_email FROM orders WHERE code = ? AND customer_id = ? AND payment_status = 'unpaid' AND status != 'cancelled'")
      .bind(code, me.id)
      .first<{ id: number; code: string; total: number; contact_email: string }>()
    if (!o) throw new Error('This order can’t be paid online.')
    if (!(await paymentOptions()).paystack) throw new Error('Card payment isn’t available right now. Please pay by bank transfer.')
    return { payUrl: await startPaystack(o, o.contact_email || me.email) }
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

/** "Rate your order": one review per completed order. It shows on the website once the owner approves it. */
export const submitOrderReview = createServerFn({ method: 'POST' })
  .validator((d: { code: string; rating: number; body: string }) => d)
  .handler(async ({ data }) => {
    const me = await requireCustomer()
    const order = await db()
      .prepare('SELECT id, status FROM orders WHERE code = ? AND customer_id = ?')
      .bind(str(data.code, 20), me.id)
      .first<{ id: number; status: string }>()
    if (!order) throw new Error('Order not found.')
    if (order.status !== 'completed') throw new Error('You can review your order once it has been delivered or collected.')
    const rating = Math.min(5, Math.max(1, int(data.rating, 5)))
    const body = str(data.body, 1200)
    if (body.length < 3) throw new Error('Tell us a little about your order.')
    const exists = await db().prepare('SELECT id FROM reviews WHERE order_id = ?').bind(order.id).first()
    if (exists) throw new Error('You’ve already reviewed this order. Thank you!')
    // First name and last initial, e.g. "Ada O."
    const parts = me.name.trim().split(/\s+/)
    const shown = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : parts[0]
    const items = await db().prepare('SELECT name FROM order_items WHERE order_id = ? ORDER BY id LIMIT 2').bind(order.id).all<{ name: string }>()
    await db()
      .prepare(
        "INSERT INTO reviews (name, occasion, body, rating, photo_url, is_visible, sort, source, seen, order_id, customer_id) VALUES (?, ?, ?, ?, '', 0, 0, 'customer', 0, ?, ?)",
      )
      .bind(shown, items.results.map((i) => i.name).join(' & ').slice(0, 80), body, rating, order.id, me.id)
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
  if (!me.is_guest) return { me: { ...me, guest: false }, orders: results }
  // Guests: offer to save an account, filled in from their last order or booking
  const last = await db()
    .prepare(
      `SELECT contact_email AS email FROM orders WHERE customer_id = ? AND contact_email != ''
       UNION ALL SELECT contact_email FROM bookings WHERE customer_id = ? AND contact_email != '' LIMIT 1`,
    )
    .bind(me.id, me.id)
    .first<{ email: string }>()
  return { me: { ...me, email: last?.email ?? '', guest: true }, orders: results }
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

    // Event bookings (MB-…)
    if (code.startsWith('MB')) {
      const b = await loadBooking(db(), 'WHERE b.code = ?', [`MB-${code.replace(/^MB-?/, '')}`])
      const ok = b && [b.booking.contact_phone, b.booking.customer_phone ?? ''].some((p) => digits(p).slice(-7) === phone)
      if (!b || !ok) throw new Error('We couldn’t find a booking with that number and phone. Check both and try again.')
      const k = b.booking
      return {
        kind: 'booking' as const,
        code: k.code,
        status: k.status,
        event_type: k.event_type,
        event_date: k.event_date,
        event_time: k.event_time,
        guests: k.guests,
        fulfilment: k.fulfilment,
        zone_name: k.zone_name ?? '',
        quote_amount: k.quote_amount,
        deposit_amount: k.deposit_amount,
        paid_amount: k.paid_amount,
        events: b.events.map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
      }
    }

    const found = await loadOrder('WHERE o.code = ?', [code.startsWith('MC-') ? code : `MC-${code.replace(/^MC/, '')}`])
    const match = found && [found.order.contact_phone, found.order.customer_phone ?? ''].some((p) => digits(p).slice(-7) === phone)
    if (!found || !match) throw new Error('We couldn’t find an order with that number and phone. Check both and try again.')
    const { order, items, events } = found
    return {
      kind: 'order' as const,
      code: order.code,
      status: order.status as OrderStatus,
      fulfilment: order.fulfilment,
      own_rider: order.own_rider ?? 0,
      needed_date: order.needed_date,
      time_slot: order.time_slot ?? '',
      zone_name: order.zone_name ?? '',
      items: items.map((i) => ({ name: i.name, option_label: i.option_label, qty: i.qty })),
      events: events.map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
    }
  })
