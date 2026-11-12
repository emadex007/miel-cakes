import { createServerFn } from '@tanstack/react-start'
import type { Booking, BookingStatus, QuoteLine } from '~/lib/bookings'
import { amountDue, parseQuoteLines } from '~/lib/bookings'
import type { DeliveryZone } from '~/lib/types'
import { currentCustomer, getOrCreateCustomer, requireAdmin, requireCustomer } from '~/server/auth'
import { contactDetails } from '~/server/customers'
import { loadBooking, markBookingPaidByReference, recountBookingPayments } from '~/server/bookings'
import { db, queryZones, workerEnv } from '~/server/db'
import { paystackInitialize, paystackVerify } from '~/server/paystack'
import { loadSettings } from '~/server/settings'
import { addDays, digits, int, lagosToday, paymentOptions, randomHex, siteOrigin, str } from '~/server/util'
import { bookingPaid, bookingQuoted, bookingRequested, bookingStatusChanged } from '~/server/happenings'

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

async function minBookingDate() {
  const s = await loadSettings()
  const days = Math.min(365, Math.max(0, int(s.booking_min_days, 7)))
  return { days, date: addDays(lagosToday(), days) }
}

// =====================================================================
// Customer
// =====================================================================
export const getBookingForm = createServerFn({ method: 'GET' }).handler(async () => {
  const [me, zones, blocked, min] = await Promise.all([
    currentCustomer(),
    queryZones(true),
    db()
      .prepare('SELECT date, reason FROM blocked_dates WHERE date >= ? ORDER BY date')
      .bind(lagosToday())
      .all<{ date: string; reason: string }>()
      .then((r) => r.results),
    minBookingDate(),
  ])
  const shown = me ? { ...me, email: me.is_guest ? '' : me.email, guest: !!me.is_guest } : null
  return { me: shown, zones, blocked, minDate: min.date, minDays: min.days }
})

export interface BookingRequestInput {
  event_type: string
  event_date: string
  event_time: string
  guests: number
  items: string[]
  details: string
  /** own_rider = they send their own rider to collect from us */
  fulfilment: 'pickup' | 'delivery' | 'own_rider'
  contact_name: string
  contact_email: string
  zone_id: number | null
  address: string
  contact_phone: string
}

export const requestBooking = createServerFn({ method: 'POST' })
  .validator((d: BookingRequestInput) => d)
  .handler(async ({ data }) => {
    const me = await getOrCreateCustomer() // no account needed to book
    const eventType = str(data.event_type, 80)
    if (!eventType) throw new Error('What is the occasion?')

    const date = str(data.event_date, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Please choose the date of your event.')
    const min = await minBookingDate()
    if (date < min.date) throw new Error(`Event bookings need at least ${min.days} days’ notice. The earliest date is ${min.date}. For anything sooner, message us on WhatsApp.`)
    const blocked = await db().prepare('SELECT reason FROM blocked_dates WHERE date = ?').bind(date).first<{ reason: string }>()
    if (blocked) throw new Error(`We’re fully booked on ${date}${blocked.reason ? ` (${blocked.reason})` : ''}. Please choose another date.`)

    const guests = int(data.guests)
    if (guests < 1 || guests > 10000) throw new Error('About how many guests are you expecting?')
    const items = (Array.isArray(data.items) ? data.items : []).map((i) => str(i, 80)).filter(Boolean).slice(0, 20)
    const details = str(data.details, 3000)
    if (!items.length && details.length < 5) throw new Error('Tell us what you would like (tick the options, or describe it).')

    let zone: DeliveryZone | null = null
    const address = str(data.address, 400)
    if (data.fulfilment === 'delivery') {
      zone = await db().prepare('SELECT * FROM delivery_zones WHERE id = ? AND is_active = 1').bind(int(data.zone_id)).first<DeliveryZone>()
      if (!zone) throw new Error('Please choose the area of your venue.')
      if (address.length < 5) throw new Error('Please enter the venue address.')
    }
    const phone = str(data.contact_phone, 40) || me.phone
    if (digits(phone).length < 7) throw new Error('Please enter a phone number we can reach you on.')
    const contact = await contactDetails(me, data.contact_name, data.contact_email, phone)

    const r = await db()
      .prepare(
        `INSERT INTO bookings (code, customer_id, event_type, event_date, event_time, guests, items_wanted, details,
         fulfilment, zone_id, address, contact_phone, delivery_fee, status, contact_name, contact_email, own_rider)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'requested', ?, ?, ?)`,
      )
      .bind(
        `pending-${randomHex(6)}`,
        me.id,
        eventType,
        date,
        str(data.event_time, 40),
        guests,
        items.join(', '),
        details,
        zone ? 'delivery' : 'pickup',
        zone?.id ?? null,
        address,
        phone,
        zone?.fee ?? 0,
        contact.name,
        contact.email,
        data.fulfilment === 'own_rider' ? 1 : 0,
      )
      .run()
    const id = Number(r.meta.last_row_id)
    const code = `MB-${1000 + id}`
    await db().batch([
      db().prepare('UPDATE bookings SET code = ? WHERE id = ?').bind(code, id),
      db().prepare(`INSERT INTO booking_events (booking_id, status, note) VALUES (?, 'requested', 'Booking request sent from the website')`).bind(id),
    ])
    await bookingRequested(workerEnv(), siteOrigin(), id)
    return { code }
  })

export const getMyBooking = createServerFn({ method: 'GET' })
  .validator((d: { code: string; checkPayment?: boolean }) => d)
  .handler(async ({ data }) => {
    const me = await currentCustomer()
    if (!me) return { needLogin: true as const }
    let found = await loadBooking(db(), 'WHERE b.code = ? AND b.customer_id = ?', [str(data.code, 20), me.id])
    if (!found) return { needLogin: false as const, notFound: true as const }
    // Back from Paystack: confirm with Paystack straight away
    const secret = workerEnv().PAYSTACK_SECRET_KEY
    if (data.checkPayment && secret && found.booking.paystack_ref) {
      const v = await paystackVerify(secret, found.booking.paystack_ref)
      if (v?.paid && v.currency === 'NGN') {
        const paid = await markBookingPaidByReference(db(), v.reference, v.amountNaira)
        if (paid.ok && !paid.already && paid.bookingId) await bookingPaid(workerEnv(), siteOrigin(), paid.bookingId, paid.amount ?? v.amountNaira)
        found = await loadBooking(db(), 'WHERE b.id = ?', [found.booking.id])
      }
    }
    const { booking, events, payments } = found!
    const { admin_note: _private, ...pub } = booking
    return {
      needLogin: false as const,
      notFound: false as const,
      booking: pub,
      lines: parseQuoteLines(booking.quote_items_json),
      events,
      payments: payments.map((p) => ({ amount: p.amount, method: p.method, created_at: p.created_at })),
      due: amountDue(booking),
      pay: await paymentOptions(),
    }
  })

export const payBookingByCard = createServerFn({ method: 'POST' })
  .validator((d: { code: string; full: boolean }) => d)
  .handler(async ({ data }) => {
    const me = await requireCustomer()
    const secret = workerEnv().PAYSTACK_SECRET_KEY
    if (!(await paymentOptions()).paystack || !secret) throw new Error('Card payment isn’t available right now. Please pay by bank transfer.')
    const b = await db().prepare('SELECT * FROM bookings WHERE code = ? AND customer_id = ?').bind(str(data.code, 20), me.id).first<Booking>()
    if (!b) throw new Error('Booking not found.')
    const due = amountDue(b)
    if (due.kind === 'none') throw new Error('There is nothing to pay on this booking right now.')
    const amount = data.full ? due.full : due.amount
    const reference = `${b.code}-${randomHex(4)}`
    await db().prepare(`UPDATE bookings SET paystack_ref = ?, updated_at = datetime('now') WHERE id = ?`).bind(reference, b.id).run()
    const payUrl = await paystackInitialize(secret, {
      email: b.contact_email || me.email,
      amountNaira: amount,
      reference,
      callbackUrl: `${siteOrigin()}/bookings/${b.code}?paid=1`,
      metadata: { booking_code: b.code, part: data.full ? 'full' : due.kind },
    })
    return { payUrl }
  })

export const myBookings = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await currentCustomer()
  if (!me) return []
  const { results } = await db()
    .prepare('SELECT id, code, event_type, event_date, guests, status, quote_amount, paid_amount FROM bookings WHERE customer_id = ? ORDER BY id DESC LIMIT 100')
    .bind(me.id)
    .all<Pick<Booking, 'id' | 'code' | 'event_type' | 'event_date' | 'guests' | 'status' | 'quote_amount' | 'paid_amount'>>()
  return results
})

// =====================================================================
// Admin
// =====================================================================
export const listBookings = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db()
    .prepare(
      `SELECT b.id, b.code, b.event_type, b.event_date, b.event_time, b.guests, b.status, b.quote_amount, b.deposit_amount,
              b.paid_amount, b.proof_pending, b.fulfilment, b.own_rider, b.contact_phone, b.created_at, COALESCE(NULLIF(b.contact_name, ''), c.name) AS customer_name, z.name AS zone_name
       FROM bookings b JOIN customers c ON c.id = b.customer_id LEFT JOIN delivery_zones z ON z.id = b.zone_id
       ORDER BY b.id DESC LIMIT 1000`,
    )
    .all<Booking>()
  return results
})

export const getBookingAdmin = createServerFn({ method: 'GET' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const found = await loadBooking(db(), 'WHERE b.id = ?', [id])
    if (!found) throw new Error('That booking no longer exists.')
    const s = await loadSettings()
    return {
      ...found,
      lines: parseQuoteLines(found.booking.quote_items_json),
      due: amountDue(found.booking),
      depositPercent: Math.min(100, Math.max(0, int(s.booking_deposit_percent, 50))),
    }
  })

export const sendBookingQuote = createServerFn({ method: 'POST' })
  .validator((d: { id: number; lines: QuoteLine[]; delivery_fee: number; deposit_amount: number; message: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const id = int(data.id)
    const b = await db().prepare('SELECT status, quote_amount FROM bookings WHERE id = ?').bind(id).first<{ status: BookingStatus; quote_amount: number }>()
    if (!b) throw new Error('That booking no longer exists.')
    if (['completed', 'declined', 'cancelled'].includes(b.status)) throw new Error('Reopen this booking before changing the quote.')
    const lines = (Array.isArray(data.lines) ? data.lines : [])
      .map((l) => ({ description: str(l.description, 200), qty: Math.max(1, int(l.qty, 1)), price: Math.max(0, int(l.price)) }))
      .filter((l) => l.description)
    if (!lines.length) throw new Error('Add at least one item to the quote.')
    const delivery = Math.max(0, int(data.delivery_fee))
    const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0) + delivery
    if (total <= 0) throw new Error('The quote total must be more than ₦0.')
    const deposit = Math.min(total, Math.max(0, int(data.deposit_amount)))
    const first = b.status === 'requested'
    await db().batch([
      db()
        .prepare(
          `UPDATE bookings SET quote_items_json = ?, delivery_fee = ?, quote_amount = ?, deposit_amount = ?, quote_message = ?,
           quoted_at = datetime('now'), updated_at = datetime('now'), status = CASE WHEN status = 'requested' THEN 'quoted' ELSE status END WHERE id = ?`,
        )
        .bind(JSON.stringify(lines), delivery, total, deposit, str(data.message, 2000), id),
      db()
        .prepare(`INSERT INTO booking_events (booking_id, status, note) VALUES (?, ?, ?)`)
        .bind(id, first ? 'quoted' : b.status, `${first ? 'Quote sent' : 'Quote updated'}: ${naira(total)}${deposit ? `, deposit ${naira(deposit)}` : ''}`),
    ])
    await recountBookingPayments(db(), id)
    await bookingQuoted(workerEnv(), siteOrigin(), id, !first)
    return { ok: true, total, deposit }
  })

export const recordBookingPayment = createServerFn({ method: 'POST' })
  .validator((d: { id: number; amount: number; method: 'transfer' | 'cash' | 'pos' | 'paystack'; note: string }) => d)
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const id = int(data.id)
    const amount = int(data.amount)
    if (amount <= 0) throw new Error('Enter the amount received.')
    const method = ['transfer', 'cash', 'pos', 'paystack'].includes(data.method) ? data.method : 'transfer'
    const b = await db().prepare('SELECT status FROM bookings WHERE id = ?').bind(id).first<{ status: BookingStatus }>()
    if (!b) throw new Error('That booking no longer exists.')
    const label = { transfer: 'bank transfer', cash: 'cash', pos: 'POS', paystack: 'Paystack' }[method]
    await db().batch([
      db().prepare('INSERT INTO booking_payments (booking_id, amount, method, note) VALUES (?, ?, ?, ?)').bind(id, amount, method, str(data.note, 300) || `Recorded by ${admin.name.split(' ')[0]}`),
      db().prepare('INSERT INTO booking_events (booking_id, status, note) VALUES (?, ?, ?)').bind(id, b.status, `Payment of ${naira(amount)} received (${label})`),
    ])
    await recountBookingPayments(db(), id, { proofChecked: true })
    return { ok: true }
  })

export const deleteBookingPayment = createServerFn({ method: 'POST' })
  .validator((d: { bookingId: number; paymentId: number }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db().prepare('DELETE FROM booking_payments WHERE id = ? AND booking_id = ?').bind(int(data.paymentId), int(data.bookingId)).run()
    await recountBookingPayments(db(), int(data.bookingId))
    return { ok: true }
  })

const ADMIN_STATUSES: BookingStatus[] = ['quoted', 'booked', 'completed', 'declined', 'cancelled']

export const setBookingStatus = createServerFn({ method: 'POST' })
  .validator((d: { id: number; status: BookingStatus; note: string }) => d)
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (!ADMIN_STATUSES.includes(data.status)) throw new Error('Choose a valid status.')
    const id = int(data.id)
    const note = str(data.note, 500) || `Updated by ${admin.name.split(' ')[0]}`
    await db().batch([
      db().prepare(`UPDATE bookings SET status = ?, proof_pending = CASE WHEN ? IN ('declined','cancelled','completed') THEN 0 ELSE proof_pending END, updated_at = datetime('now') WHERE id = ?`).bind(data.status, data.status, id),
      db().prepare('INSERT INTO booking_events (booking_id, status, note) VALUES (?, ?, ?)').bind(id, data.status, note),
    ])
    await bookingStatusChanged(workerEnv(), siteOrigin(), id, data.status)
    return { ok: true }
  })

export const saveBookingNote = createServerFn({ method: 'POST' })
  .validator((d: { id: number; note: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    await db().prepare(`UPDATE bookings SET admin_note = ?, updated_at = datetime('now') WHERE id = ?`).bind(str(data.note, 3000), int(data.id)).run()
    return { ok: true }
  })

/** Owner has looked at the proof and it isn't right (wrong file, money not in yet). */
export const dismissBookingProof = createServerFn({ method: 'POST' })
  .validator((d: { id: number; note: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const id = int(data.id)
    const b = await db().prepare('SELECT status FROM bookings WHERE id = ?').bind(id).first<{ status: BookingStatus }>()
    if (!b) throw new Error('That booking no longer exists.')
    const next = b.status === 'checking' ? 'quoted' : b.status
    await db().batch([
      db().prepare(`UPDATE bookings SET proof_pending = 0, status = ?, updated_at = datetime('now') WHERE id = ?`).bind(next, id),
      db().prepare('INSERT INTO booking_events (booking_id, status, note) VALUES (?, ?, ?)').bind(id, next, str(data.note, 300) || 'We couldn’t match your payment yet. Please check and send your proof again, or message us.'),
    ])
    return { ok: true }
  })
