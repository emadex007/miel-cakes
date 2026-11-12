// "Something happened" hooks: tell the team (phone alert + email) and the
// customer (email). Called after the database work is done; never throws.
import { BOOKING_STATUS } from '~/lib/bookings'
import { ORDER_STATUS, type OrderStatus } from '~/lib/orders'
import { alertOwner, emailCustomer } from './notify'

type Env = Cloudflare.Env
const naira = (n: number) => `₦${Math.round(n || 0).toLocaleString('en-NG')}`
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}
const first = (name: string) => (name || '').trim().split(/\s+/)[0] || 'there'
const safe = async (fn: () => Promise<unknown>) => {
  try {
    await fn()
  } catch (e) {
    console.error('notify failed', e)
  }
}

interface OrderInfo {
  id: number
  code: string
  status: OrderStatus
  fulfilment: string
  own_rider: number
  needed_date: string
  time_slot: string
  total: number
  payment_method: string
  name: string
  email: string
  phone: string
  zone_name: string | null
  address: string
}
async function orderInfo(db: D1Database, id: number) {
  const o = await db
    .prepare(
      `SELECT o.id, o.code, o.status, o.fulfilment, o.own_rider, o.needed_date, o.time_slot, o.total, o.payment_method, o.address, o.contact_phone AS phone,
              COALESCE(NULLIF(o.contact_name, ''), c.name) AS name, COALESCE(NULLIF(o.contact_email, ''), c.email) AS email, z.name AS zone_name
       FROM orders o JOIN customers c ON c.id = o.customer_id LEFT JOIN delivery_zones z ON z.id = o.zone_id WHERE o.id = ?`,
    )
    .bind(id)
    .first<OrderInfo>()
  if (!o) return null
  const items = await db.prepare('SELECT name, option_label, qty FROM order_items WHERE order_id = ? ORDER BY id').bind(id).all<{ name: string; option_label: string; qty: number }>()
  return { ...o, items: items.results }
}
const how = (o: { fulfilment: string; own_rider: number; zone_name: string | null; address: string }) =>
  o.fulfilment === 'delivery' ? `Delivery${o.zone_name ? ` (${o.zone_name})` : ''}${o.address ? `\n${o.address}` : ''}` : o.own_rider ? 'Your own rider collects' : 'Pickup'

export async function orderPlaced(env: Env, origin: string, orderId: number) {
  await safe(async () => {
    const o = await orderInfo(env.DB, orderId)
    if (!o) return
    const itemLines = o.items.map((i) => `${i.qty} × ${i.name}${i.option_label ? ` (${i.option_label})` : ''}`).join('\n')
    const rows: [string, string][] = [
      ['Order', o.code],
      ['Items', itemLines],
      ['Date', `${dmy(o.needed_date)}${o.time_slot ? `, ${o.time_slot}` : ''}`],
      ['How', how(o)],
      ['Total', naira(o.total)],
    ]
    await Promise.all([
      alertOwner(env, origin, {
        title: `New order ${o.code}: ${naira(o.total)}`,
        body: `${o.name || 'A customer'} · ${o.items.length} item${o.items.length === 1 ? '' : 's'} for ${dmy(o.needed_date)}`,
        url: `/admin/orders/${o.id}`,
        tag: `order-${o.id}`,
        email: {
          subject: `New order ${o.code} from ${o.name || 'a customer'} (${naira(o.total)})`,
          content: {
            heading: `New order ${o.code}`,
            body: `${o.name || 'A customer'} placed an order on the website.\nPhone: ${o.phone}\nPayment: ${o.payment_method === 'paystack' ? 'card (Paystack)' : 'bank transfer'}`,
            rows,
            button: { label: 'Open the order', url: `/admin/orders/${o.id}` },
          },
        },
      }),
      emailCustomer(env, origin, o.email, `We got your order ${o.code}`, {
        heading: `Thank you, ${first(o.name)}!`,
        body:
          o.payment_method === 'paystack'
            ? 'We’ve received your order. If your card payment went through, we’ll confirm it shortly and start baking.'
            : 'We’ve received your order. Please pay by bank transfer and upload your proof of payment on your order page, and we’ll confirm it and start baking.',
        rows,
        button: { label: 'View your order', url: `/orders/${o.code}` },
      }),
    ])
  })
}

export async function orderPaid(env: Env, origin: string, orderId: number, how = 'Payment received') {
  await safe(async () => {
    const o = await orderInfo(env.DB, orderId)
    if (!o) return
    await Promise.all([
      alertOwner(env, origin, {
        title: `Paid: ${o.code} (${naira(o.total)})`,
        body: `${how}. ${o.name || ''}`.trim(),
        url: `/admin/orders/${o.id}`,
        tag: `order-${o.id}`,
        email: false, // the phone alert is enough; the order email already went out
      }),
      emailCustomer(env, origin, o.email, `Payment confirmed for ${o.code}`, {
        heading: 'Payment confirmed',
        body: `Hi ${first(o.name)}, we’ve received your payment of ${naira(o.total)} for order ${o.code}. Your order is confirmed and we’ll get started.`,
        button: { label: 'Track your order', url: `/orders/${o.code}` },
      }),
    ])
  })
}

const STATUS_MESSAGES: Partial<Record<OrderStatus, (o: { fulfilment: string; own_rider: number }) => string>> = {
  received: () => 'Your order is confirmed. We’ll let you know as it moves along.',
  baking: () => 'Good news: we’re baking your order now.',
  ready: (o) => (o.fulfilment === 'delivery' ? 'Your order is ready and will be on its way soon.' : o.own_rider ? 'Your order is ready. Your rider can come and collect it.' : 'Your order is ready for pickup.'),
  out_for_delivery: () => 'Your order is out for delivery. Please keep your phone close.',
  completed: () => 'Your order has been delivered or collected. Enjoy! We’d love to hear what you thought.',
  cancelled: () => 'Your order has been cancelled. If you have questions, just reply to this email or message us on WhatsApp.',
}

export async function orderStatusChanged(env: Env, origin: string, orderId: number, status: OrderStatus, note = '') {
  await safe(async () => {
    const msg = STATUS_MESSAGES[status]
    if (!msg) return
    const o = await orderInfo(env.DB, orderId)
    if (!o) return
    const human = /^Updated by /.test(note) ? '' : note
    await emailCustomer(env, origin, o.email, `${o.code}: ${ORDER_STATUS[status].label}`, {
      heading: ORDER_STATUS[status].label,
      body: `Hi ${first(o.name)}, ${msg(o).charAt(0).toLowerCase()}${msg(o).slice(1)}${human ? `\n\nNote from us: ${human}` : ''}`,
      rows: [
        ['Order', o.code],
        ['Date', `${dmy(o.needed_date)}${o.time_slot ? `, ${o.time_slot}` : ''}`],
      ],
      button: status === 'completed' ? { label: 'Rate your order', url: `/orders/${o.code}` } : { label: 'Track your order', url: `/orders/${o.code}` },
    })
  })
}

export async function proofUploaded(env: Env, origin: string, kind: 'order' | 'booking', id: number, code: string) {
  await safe(() =>
    alertOwner(env, origin, {
      title: `Proof of payment: ${code}`,
      body: 'A customer uploaded a transfer receipt. Check your bank and confirm.',
      url: kind === 'order' ? `/admin/orders/${id}` : `/admin/bookings/${id}`,
      tag: `${kind}-${id}`,
    }),
  )
}

// ---------------------------------------------------------------------------
// Event bookings
// ---------------------------------------------------------------------------
async function bookingInfo(db: D1Database, id: number) {
  return db
    .prepare(
      `SELECT b.id, b.code, b.status, b.event_type, b.event_date, b.event_time, b.guests, b.items_wanted, b.quote_amount, b.deposit_amount, b.paid_amount,
              b.contact_phone AS phone, COALESCE(NULLIF(b.contact_name, ''), c.name) AS name, COALESCE(NULLIF(b.contact_email, ''), c.email) AS email
       FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = ?`,
    )
    .bind(id)
    .first<{
      id: number
      code: string
      status: keyof typeof BOOKING_STATUS
      event_type: string
      event_date: string
      event_time: string
      guests: number
      items_wanted: string
      quote_amount: number
      deposit_amount: number
      paid_amount: number
      phone: string
      name: string
      email: string
    }>()
}

export async function bookingRequested(env: Env, origin: string, bookingId: number) {
  await safe(async () => {
    const b = await bookingInfo(env.DB, bookingId)
    if (!b) return
    const rows: [string, string][] = [
      ['Booking', b.code],
      ['Occasion', b.event_type],
      ['Date', `${dmy(b.event_date)}${b.event_time ? `, ${b.event_time}` : ''}`],
      ['Guests', String(b.guests)],
      ...(b.items_wanted ? [['Wants', b.items_wanted] as [string, string]] : []),
    ]
    await Promise.all([
      alertOwner(env, origin, {
        title: `New event booking ${b.code}`,
        body: `${b.event_type} for ${b.guests} guests on ${dmy(b.event_date)}. Send a quote.`,
        url: `/admin/bookings/${b.id}`,
        tag: `booking-${b.id}`,
        email: {
          subject: `New event booking ${b.code}: ${b.event_type} on ${dmy(b.event_date)}`,
          content: {
            heading: `New booking request ${b.code}`,
            body: `${b.name || 'A customer'} asked for a quote.\nPhone: ${b.phone}${b.email && !/@guest\.local$/.test(b.email) ? `\nEmail: ${b.email}` : ''}`,
            rows,
            button: { label: 'Send a quote', url: `/admin/bookings/${b.id}` },
          },
        },
      }),
      emailCustomer(env, origin, b.email, `We got your booking request ${b.code}`, {
        heading: `Thank you, ${first(b.name)}!`,
        body: 'We’ve received your event booking request. We’ll look at the details and send you a quote with the price soon. You can follow your booking with the button below.',
        rows,
        button: { label: 'View your booking', url: `/bookings/${b.code}` },
      }),
    ])
  })
}

export async function bookingQuoted(env: Env, origin: string, bookingId: number, updated: boolean) {
  await safe(async () => {
    const b = await bookingInfo(env.DB, bookingId)
    if (!b) return
    await emailCustomer(env, origin, b.email, `${updated ? 'Updated quote' : 'Your quote'} for ${b.code}: ${naira(b.quote_amount)}`, {
      heading: updated ? 'Your quote has been updated' : 'Your quote is ready',
      body: `Hi ${first(b.name)}, here is our quote for your ${b.event_type.toLowerCase()} on ${dmy(b.event_date)}.${b.deposit_amount > 0 ? ` Pay the deposit to book your date.` : ''}`,
      rows: [
        ['Booking', b.code],
        ['Total', naira(b.quote_amount)],
        ...(b.deposit_amount > 0 ? [['Deposit to book', naira(b.deposit_amount)] as [string, string]] : []),
      ],
      button: { label: 'See the quote and pay', url: `/bookings/${b.code}` },
    })
  })
}

export async function bookingStatusChanged(env: Env, origin: string, bookingId: number, status: string) {
  await safe(async () => {
    if (!['booked', 'completed', 'declined', 'cancelled'].includes(status)) return
    const b = await bookingInfo(env.DB, bookingId)
    if (!b) return
    const label = BOOKING_STATUS[status as keyof typeof BOOKING_STATUS]?.label ?? status
    const text: Record<string, string> = {
      booked: 'your date is booked. Thank you!',
      completed: 'thank you for celebrating with us. We hope everyone enjoyed it!',
      declined: 'sorry, we’re not able to take this booking. Message us if you’d like to talk about other dates or options.',
      cancelled: 'your booking has been cancelled. If you have questions, just reply to this email.',
    }
    await emailCustomer(env, origin, b.email, `${b.code}: ${label}`, {
      heading: label,
      body: `Hi ${first(b.name)}, ${text[status]}`,
      button: { label: 'View your booking', url: `/bookings/${b.code}` },
    })
  })
}

export async function bookingPaid(env: Env, origin: string, bookingId: number, amount: number) {
  await safe(async () => {
    const b = await bookingInfo(env.DB, bookingId)
    if (!b) return
    await Promise.all([
      alertOwner(env, origin, {
        title: `Payment for ${b.code}: ${naira(amount)}`,
        body: `${b.name || 'A customer'} paid by card for the ${b.event_type.toLowerCase()} on ${dmy(b.event_date)}.`,
        url: `/admin/bookings/${b.id}`,
        tag: `booking-${b.id}`,
        email: false,
      }),
      emailCustomer(env, origin, b.email, `Payment received for ${b.code}`, {
        heading: 'Payment received',
        body: `Hi ${first(b.name)}, we’ve received your payment of ${naira(amount)}.${b.status === 'booked' ? ' Your date is booked.' : ''}`,
        rows: [
          ['Paid so far', naira(b.paid_amount)],
          ['Total', naira(b.quote_amount)],
        ],
        button: { label: 'View your booking', url: `/bookings/${b.code}` },
      }),
    ])
  })
}

// ---------------------------------------------------------------------------
// Other things the team should hear about
// ---------------------------------------------------------------------------
export async function quoteRequested(env: Env, origin: string, name: string, summary: string) {
  await safe(() =>
    alertOwner(env, origin, {
      title: `New quote request from ${name || 'a visitor'}`,
      body: summary,
      url: '/admin/quotes',
      email: { subject: `New quote request from ${name || 'a visitor'}`, content: { heading: 'New quote request', body: summary, button: { label: 'Open quote requests', url: '/admin/quotes' } } },
    }),
  )
}

export async function chatStarted(env: Env, origin: string, conversationId: number, name: string, message: string, ownerOnline: boolean) {
  await safe(() =>
    alertOwner(env, origin, {
      title: `New chat${name ? ` from ${name}` : ''}`,
      body: message.slice(0, 140),
      url: '/admin/chat',
      tag: `chat-${conversationId}`,
      // Email only when nobody has the dashboard open
      email: ownerOnline
        ? false
        : { subject: `New website chat${name ? ` from ${name}` : ''}`, content: { heading: 'Someone is chatting on your website', body: message, button: { label: 'Reply in Live chat', url: '/admin/chat' } } },
    }),
  )
}

export async function chatMessageWhileAway(env: Env, origin: string, conversationId: number, name: string, message: string) {
  await safe(() =>
    alertOwner(env, origin, { title: name ? `${name} wrote` : 'New chat message', body: message.slice(0, 140), url: '/admin/chat', tag: `chat-${conversationId}`, email: false }),
  )
}
