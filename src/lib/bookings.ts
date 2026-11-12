// Event booking statuses, labels and the customer-facing progress steps.

export type BookingStatus = 'requested' | 'quoted' | 'checking' | 'booked' | 'completed' | 'declined' | 'cancelled'

export const BOOKING_STATUS: Record<BookingStatus, { label: string; admin: string; className: string }> = {
  requested: { label: 'Request received', admin: 'New request: send a quote', className: 'bg-amber-100 text-amber-900' },
  quoted: { label: 'Quote ready: pay deposit to book', admin: 'Quote sent: awaiting deposit', className: 'bg-slate-100 text-slate-700' },
  checking: { label: 'Checking your payment', admin: 'Proof sent: check payment', className: 'bg-amber-100 text-amber-900' },
  booked: { label: 'Date booked', admin: 'Booked', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', admin: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Not available', admin: 'Declined', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', admin: 'Cancelled', className: 'bg-red-100 text-red-800' },
}

export const BOOKING_STEPS = [
  { key: 'requested', label: 'Request sent' },
  { key: 'quoted', label: 'Quote ready' },
  { key: 'booked', label: 'Deposit paid, date booked' },
  { key: 'paid', label: 'Paid in full' },
  { key: 'completed', label: 'Event day' },
]

export function bookingStepIndex(b: { status: BookingStatus; quote_amount: number; paid_amount: number }) {
  switch (b.status) {
    case 'requested':
    case 'declined':
    case 'cancelled':
      return 0
    case 'quoted':
    case 'checking':
      return 1
    case 'booked':
      return b.quote_amount > 0 && b.paid_amount >= b.quote_amount ? 3 : 2
    case 'completed':
      return 4
  }
}

/** What the customer should pay next: the rest of the deposit first, then the balance. */
export function amountDue(b: { status: BookingStatus; quote_amount: number; deposit_amount: number; paid_amount: number }) {
  if (!['quoted', 'checking', 'booked'].includes(b.status) || b.quote_amount <= 0) return { kind: 'none' as const, amount: 0, full: 0 }
  const full = Math.max(0, b.quote_amount - b.paid_amount)
  if (full === 0) return { kind: 'none' as const, amount: 0, full: 0 }
  const depositLeft = Math.max(0, b.deposit_amount - b.paid_amount)
  if (depositLeft > 0) return { kind: 'deposit' as const, amount: depositLeft, full }
  return { kind: 'balance' as const, amount: full, full }
}

export interface QuoteLine {
  description: string
  qty: number
  price: number
}

export function parseQuoteLines(json: string): QuoteLine[] {
  try {
    const v = JSON.parse(json || '[]')
    return Array.isArray(v)
      ? v
          .filter((l) => l && typeof l.description === 'string')
          .map((l) => ({ description: String(l.description), qty: Math.max(1, Math.round(Number(l.qty) || 1)), price: Math.max(0, Math.round(Number(l.price) || 0)) }))
      : []
  } catch {
    return []
  }
}

export interface Booking {
  id: number
  code: string
  customer_id: number
  event_type: string
  event_date: string
  event_time: string
  guests: number
  items_wanted: string
  details: string
  budget: string
  reference_image: string
  fulfilment: 'pickup' | 'delivery'
  own_rider?: number
  contact_name?: string
  contact_email?: string
  zone_id: number | null
  zone_name?: string | null
  address: string
  contact_phone: string
  status: BookingStatus
  quote_amount: number
  deposit_amount: number
  paid_amount: number
  delivery_fee: number
  quote_items_json: string
  quote_message: string
  quoted_at: string
  paystack_ref: string
  proof_key: string
  proof_uploaded_at: string
  proof_pending: number
  admin_note: string
  created_at: string
  updated_at: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

export interface BookingEvent {
  id: number
  status: BookingStatus
  note: string
  created_at: string
}

export interface BookingPayment {
  id: number
  amount: number
  method: 'transfer' | 'paystack' | 'cash' | 'pos'
  reference: string | null
  note: string
  created_at: string
}
