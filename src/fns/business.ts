import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import type { Client, GalleryItem, QuoteRequest, Receipt, ReceiptItem } from '~/lib/types'
import { parseQuoteLines } from '~/lib/bookings'
import { requireAdmin, requireOwner } from '~/server/auth'
import { loadBooking } from '~/server/bookings'
import { db } from '~/server/db'
import { loadOrder } from '~/server/orders'

// ---------- helpers ----------
const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}
const money = (v: unknown) => Math.max(0, int(v))
const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

// =====================================================================
// Gallery
// =====================================================================
export const getGallery = createServerFn({ method: 'GET' }).handler(async () => {
  const { results } = await db()
    .prepare('SELECT * FROM gallery_items ORDER BY featured DESC, sort, id DESC')
    .all<GalleryItem>()
  return results
})

export const saveGalleryItem = createServerFn({ method: 'POST' })
  .validator(
    (d: { id?: number; image_url: string; title: string; occasion: string; description: string; featured: boolean | number; sort: number }) => d,
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const image = str(data.image_url, 1000)
    if (!image) throw new Error('Add a photo first.')
    const values = [image, str(data.title, 120), str(data.occasion, 80), str(data.description, 500), data.featured ? 1 : 0, int(data.sort)]
    if (data.id) {
      await db()
        .prepare('UPDATE gallery_items SET image_url=?, title=?, occasion=?, description=?, featured=?, sort=? WHERE id=?')
        .bind(...values, int(data.id))
        .run()
      return { id: int(data.id) }
    }
    const r = await db()
      .prepare('INSERT INTO gallery_items (image_url, title, occasion, description, featured, sort) VALUES (?,?,?,?,?,?)')
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const deleteGalleryItem = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    await db().prepare('DELETE FROM gallery_items WHERE id = ?').bind(id).run()
    return { ok: true }
  })

// =====================================================================
// Quote requests
// =====================================================================
export interface QuoteInput {
  name: string
  phone: string
  email: string
  occasion: string
  event_date: string
  items: string[]
  cake_shape: string
  cake_size: string
  flavour: string
  colours: string
  cake_message: string
  guests: number
  fulfilment: 'pickup' | 'delivery'
  area: string
  budget: string
  details: string
  website?: string // honeypot: real people leave this empty
}

export const submitQuote = createServerFn({ method: 'POST' })
  .validator((d: QuoteInput) => d)
  .handler(async ({ data }) => {
    if (data.website) return { code: 'Q-0' } // quietly ignore bots
    const name = str(data.name, 100)
    const phone = str(data.phone, 40)
    if (!name) throw new Error('Please enter your name.')
    if (phone.replace(/\D/g, '').length < 7) throw new Error('Please enter a phone number we can reach you on.')
    const items = (Array.isArray(data.items) ? data.items : []).map((i) => str(i, 60)).filter(Boolean).join(', ')
    const r = await db()
      .prepare(
        `INSERT INTO quote_requests (code, name, phone, email, occasion, event_date, items, cake_shape, cake_size, flavour,
         colours, cake_message, guests, fulfilment, area, budget, details) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        `pending-${randomHex(6)}`,
        name,
        phone,
        str(data.email, 150),
        str(data.occasion, 80),
        str(data.event_date, 20),
        items,
        str(data.cake_shape, 60),
        str(data.cake_size, 60),
        str(data.flavour, 60),
        str(data.colours, 120),
        str(data.cake_message, 200),
        Math.max(0, int(data.guests)),
        data.fulfilment === 'delivery' ? 'delivery' : 'pickup',
        str(data.area, 80),
        str(data.budget, 60),
        str(data.details, 2000),
      )
      .run()
    const id = Number(r.meta.last_row_id)
    const code = `Q-${1000 + id}`
    await db().prepare('UPDATE quote_requests SET code = ? WHERE id = ?').bind(code, id).run()
    return { code }
  })

export const listQuotes = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  const { results } = await db().prepare('SELECT * FROM quote_requests ORDER BY id DESC LIMIT 500').all<QuoteRequest>()
  return results
})

export const updateQuote = createServerFn({ method: 'POST' })
  .validator((d: { id: number; status: QuoteRequest['status']; admin_note: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    const allowed = ['new', 'contacted', 'quoted', 'confirmed', 'declined']
    const status = allowed.includes(data.status) ? data.status : 'new'
    await db()
      .prepare('UPDATE quote_requests SET status = ?, admin_note = ? WHERE id = ?')
      .bind(status, str(data.admin_note, 2000), int(data.id))
      .run()
    return { ok: true }
  })

export const deleteQuote = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    await db().prepare('DELETE FROM quote_requests WHERE id = ?').bind(id).run()
    return { ok: true }
  })

// =====================================================================
// Customers (clients)
// =====================================================================
export const listClients = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const { results } = await db()
    .prepare(
      `SELECT c.*, COUNT(r.id) AS receipt_count, COALESCE(SUM(r.amount_paid), 0) AS total_spent
       FROM clients c LEFT JOIN receipts r ON r.client_id = c.id
       GROUP BY c.id ORDER BY c.name COLLATE NOCASE`,
    )
    .all<Client>()
  return results
})

export interface ClientInput {
  id?: number
  name: string
  phone: string
  email: string
  address: string
  area: string
  birthday: string
  notes: string
  source?: string
}

async function upsertClient(data: ClientInput) {
  const name = str(data.name, 100)
  if (!name) throw new Error('Enter the customer’s name.')
  const values = [name, str(data.phone, 40), str(data.email, 150), str(data.address, 300), str(data.area, 80), str(data.birthday, 40), str(data.notes, 2000)]
  if (data.id) {
    await db()
      .prepare(`UPDATE clients SET name=?, phone=?, email=?, address=?, area=?, birthday=?, notes=?, updated_at=datetime('now') WHERE id=?`)
      .bind(...values, int(data.id))
      .run()
    return int(data.id)
  }
  const r = await db()
    .prepare('INSERT INTO clients (name, phone, email, address, area, birthday, notes, source) VALUES (?,?,?,?,?,?,?,?)')
    .bind(...values, str(data.source ?? 'manual', 20))
    .run()
  return Number(r.meta.last_row_id)
}

export const saveClient = createServerFn({ method: 'POST' })
  .validator((d: ClientInput) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    return { id: await upsertClient(data) }
  })

export const deleteClient = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    await db().batch([
      db().prepare('UPDATE receipts SET client_id = NULL WHERE client_id = ?').bind(id),
      db().prepare('DELETE FROM clients WHERE id = ?').bind(id),
    ])
    return { ok: true }
  })

/** Saves the person from a quote request as a customer (or returns the existing one with that phone). */
export const clientFromQuote = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireAdmin()
    const q = await db().prepare('SELECT * FROM quote_requests WHERE id = ?').bind(id).first<QuoteRequest>()
    if (!q) throw new Error('That quote request no longer exists.')
    const existing = await db().prepare('SELECT id FROM clients WHERE phone = ? AND phone != ?').bind(q.phone, '').first<{ id: number }>()
    if (existing) return { id: existing.id, existed: true }
    const newId = await upsertClient({
      name: q.name,
      phone: q.phone,
      email: q.email,
      address: '',
      area: q.area,
      birthday: '',
      notes: `From quote ${q.code}${q.occasion ? ` (${q.occasion})` : ''}`,
      source: 'quote',
    })
    return { id: newId, existed: false }
  })

// =====================================================================
// Receipts
// =====================================================================
type ReceiptRow = Omit<Receipt, 'items'> & { items_json: string }

function mapReceipt(row: ReceiptRow): Receipt {
  let items: ReceiptItem[] = []
  try {
    const parsed = JSON.parse(row.items_json || '[]')
    if (Array.isArray(parsed)) items = parsed
  } catch {
    items = []
  }
  const { items_json: _ignored, ...rest } = row
  return { ...rest, items }
}

export const listReceipts = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const { results } = await db().prepare('SELECT * FROM receipts ORDER BY id DESC LIMIT 1000').all<ReceiptRow>()
  return results.map(mapReceipt)
})

export const getReceiptAdmin = createServerFn({ method: 'GET' })
  .validator((d: { id: string; quoteId?: number; clientId?: number; orderId?: number; bookingId?: number }) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const { results: clients } = await db()
      .prepare('SELECT id, name, phone, email, address, area FROM clients ORDER BY name COLLATE NOCASE')
      .all<Pick<Client, 'id' | 'name' | 'phone' | 'email' | 'address' | 'area'>>()
    if (data.id === 'new') {
      const quote = data.quoteId
        ? await db().prepare('SELECT * FROM quote_requests WHERE id = ?').bind(int(data.quoteId)).first<QuoteRequest>()
        : null
      const order = data.orderId ? await loadOrder('WHERE o.id = ?', [int(data.orderId)]) : null
      const found = data.bookingId ? await loadBooking(db(), 'WHERE b.id = ?', [int(data.bookingId)]) : null
      const booking = found ? { ...found.booking, lines: parseQuoteLines(found.booking.quote_items_json) } : null
      return { receipt: null, clients, quote, clientId: data.clientId ? int(data.clientId) : null, order, booking }
    }
    const row = await db().prepare('SELECT * FROM receipts WHERE id = ?').bind(int(data.id)).first<ReceiptRow>()
    if (!row) throw new Error('That receipt no longer exists.')
    return { receipt: mapReceipt(row), clients, quote: null, clientId: null, order: null, booking: null }
  })

/** Public: the customer's receipt link. The token makes it unguessable. */
export const getReceiptByToken = createServerFn({ method: 'GET' })
  .validator((token: string) => String(token).slice(0, 64))
  .handler(async ({ data: token }) => {
    const row = await db().prepare('SELECT * FROM receipts WHERE token = ?').bind(token).first<ReceiptRow>()
    if (!row) throw notFound()
    return mapReceipt(row)
  })

export interface ReceiptInput {
  id?: number
  client_id: number | null
  save_client: boolean
  client_name: string
  client_phone: string
  client_email: string
  client_address: string
  items: ReceiptItem[]
  delivery_fee: number
  discount: number
  amount_paid: number
  payment_method: Receipt['payment_method']
  fulfilment: string
  event_date: string
  note: string
  issued_on: string
}

export const saveReceipt = createServerFn({ method: 'POST' })
  .validator((d: ReceiptInput) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const name = str(data.client_name, 100)
    if (!name) throw new Error('Enter the customer’s name.')
    const items = (Array.isArray(data.items) ? data.items : [])
      .map((i) => ({ description: str(i.description, 200), qty: Math.max(1, int(i.qty, 1)), price: money(i.price) }))
      .filter((i) => i.description)
    if (!items.length) throw new Error('Add at least one item to the receipt.')

    let clientId = data.client_id ? int(data.client_id) : null
    if (!clientId && data.save_client) {
      clientId = await upsertClient({
        name,
        phone: data.client_phone,
        email: data.client_email,
        address: data.client_address,
        area: '',
        birthday: '',
        notes: '',
        source: 'receipt',
      })
    }

    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
    const delivery = money(data.delivery_fee)
    const discount = Math.min(money(data.discount), subtotal + delivery)
    const total = subtotal + delivery - discount
    const paid = Math.min(money(data.amount_paid), total)
    const status = paid >= total ? 'paid' : paid > 0 ? 'part_paid' : 'unpaid'
    const method = ['transfer', 'cash', 'pos', 'paystack'].includes(data.payment_method) ? data.payment_method : 'transfer'
    const issued = /^\d{4}-\d{2}-\d{2}$/.test(data.issued_on) ? data.issued_on : new Date().toISOString().slice(0, 10)

    const values = [
      clientId,
      name,
      str(data.client_phone, 40),
      str(data.client_email, 150),
      str(data.client_address, 300),
      JSON.stringify(items),
      subtotal,
      delivery,
      discount,
      total,
      paid,
      method,
      status,
      data.fulfilment === 'delivery' ? 'delivery' : 'pickup',
      str(data.event_date, 20),
      str(data.note, 1000),
      issued,
    ]

    if (data.id) {
      await db()
        .prepare(
          `UPDATE receipts SET client_id=?, client_name=?, client_phone=?, client_email=?, client_address=?, items_json=?,
           subtotal=?, delivery_fee=?, discount=?, total=?, amount_paid=?, payment_method=?, status=?, fulfilment=?,
           event_date=?, note=?, issued_on=?, updated_at=datetime('now') WHERE id=?`,
        )
        .bind(...values, int(data.id))
        .run()
      return { id: int(data.id) }
    }

    const r = await db()
      .prepare(
        `INSERT INTO receipts (code, token, client_id, client_name, client_phone, client_email, client_address, items_json,
         subtotal, delivery_fee, discount, total, amount_paid, payment_method, status, fulfilment, event_date, note, issued_on)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(`pending-${randomHex(6)}`, randomHex(16), ...values)
      .run()
    const id = Number(r.meta.last_row_id)
    const code = `MC-${issued.slice(0, 4)}-${String(id).padStart(4, '0')}`
    await db().prepare('UPDATE receipts SET code = ? WHERE id = ?').bind(code, id).run()
    return { id }
  })

export const deleteReceipt = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    await db().prepare('DELETE FROM receipts WHERE id = ?').bind(id).run()
    return { ok: true }
  })
