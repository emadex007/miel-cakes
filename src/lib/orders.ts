// Order statuses, labels and the customer-facing tracking steps.

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_confirmation'
  | 'received'
  | 'baking'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export const ORDER_STATUS: Record<OrderStatus, { label: string; admin: string; className: string }> = {
  pending_payment: { label: 'Waiting for payment', admin: 'Awaiting payment', className: 'bg-slate-100 text-slate-700' },
  awaiting_confirmation: { label: 'Checking your payment', admin: 'Proof sent: check payment', className: 'bg-amber-100 text-amber-900' },
  received: { label: 'Order confirmed', admin: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
  baking: { label: 'Baking', admin: 'Baking', className: 'bg-violet-100 text-violet-800' },
  ready: { label: 'Ready', admin: 'Ready', className: 'bg-cyan-100 text-cyan-800' },
  out_for_delivery: { label: 'Out for delivery', admin: 'Out for delivery', className: 'bg-indigo-100 text-indigo-800' },
  completed: { label: 'Completed', admin: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', admin: 'Cancelled', className: 'bg-red-100 text-red-800' },
}

export const ADMIN_NEXT_STATUSES: OrderStatus[] = ['received', 'baking', 'ready', 'out_for_delivery', 'completed', 'cancelled']

/** The steps a customer sees on the tracking bar. */
export function trackingSteps(fulfilment: string) {
  return [
    { key: 'placed', label: 'Order placed' },
    { key: 'received', label: 'Payment confirmed' },
    { key: 'baking', label: 'Baking' },
    { key: 'ready', label: fulfilment === 'delivery' ? 'Ready' : 'Ready for pickup' },
    ...(fulfilment === 'delivery' ? [{ key: 'out_for_delivery', label: 'Out for delivery' }] : []),
    { key: 'completed', label: fulfilment === 'delivery' ? 'Delivered' : 'Collected' },
  ]
}

/** Index of the current step on the tracking bar. */
export function currentStepIndex(status: OrderStatus, fulfilment: string) {
  const steps = trackingSteps(fulfilment).map((s) => s.key)
  if (status === 'pending_payment' || status === 'awaiting_confirmation' || status === 'cancelled') return 0
  const i = steps.indexOf(status === 'out_for_delivery' && fulfilment !== 'delivery' ? 'ready' : status)
  return i < 0 ? 0 : i
}

export interface OrderItemRow {
  id: number
  product_id: number | null
  name: string
  option_label: string
  unit_price: number
  qty: number
  note: string
  custom_json: string
  ref_key: string
}

export interface OrderEvent {
  id: number
  status: OrderStatus
  note: string
  created_at: string
}

export interface Order {
  id: number
  code: string
  customer_id: number
  status: OrderStatus
  fulfilment: 'pickup' | 'delivery'
  own_rider?: number
  contact_name?: string
  contact_email?: string
  zone_id: number | null
  zone_name?: string | null
  address: string
  contact_phone: string
  needed_date: string
  time_slot: string
  subtotal: number
  delivery_fee: number
  discount_code: string
  discount: number
  total: number
  payment_method: 'paystack' | 'transfer'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  paystack_ref: string
  proof_key: string
  proof_uploaded_at: string
  paid_at: string
  note: string
  created_at: string
  updated_at: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

export interface CartLine {
  id: number
  product_id: number
  name: string
  slug: string
  image_url: string
  option_label: string
  unit_price: number
  qty: number
  note: string
  is_available: number
  availability: 'daily' | 'preorder'
  notice_days: number
  custom_json: string
  ref_key: string
  extras: number
}
