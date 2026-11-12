import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Messages, PageTitle, useAction } from '~/components/admin/ui'
import { OrderTracker } from '~/components/OrderTracker'
import { formatDate } from '~/components/ReceiptSheet'
import { ArrowLeftIcon, WhatsAppIcon } from '~/components/icons'
import { confirmPayment, getOrderAdmin, resetCustomerPassword, setOrderStatus } from '~/fns/orders-admin'
import { CustomDetails } from '~/components/CakeCustomizer'
import { describeCustom } from '~/lib/custom'
import { formatNaira, toIntlPhone, whatsappLink, fulfilmentLabel } from '~/lib/format'
import { ADMIN_NEXT_STATUSES, ORDER_STATUS, type OrderStatus } from '~/lib/orders'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/admin/orders/$id')({
  loader: ({ params }) => getOrderAdmin({ data: Number(params.id) }),
  component: OrderAdmin,
})

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  received: 'your payment is confirmed and your order is booked in',
  baking: 'your order is in the oven now',
  ready: 'your order is ready',
  out_for_delivery: 'your order is on its way to you',
  completed: 'thank you for ordering with us. We hope you enjoyed every bite',
}

function OrderAdmin() {
  const { admin } = Route.useRouteContext()
  const isOwner = admin?.role === 'owner'
  const s = root.useLoaderData()
  const { order, items, events } = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, notice, run, setNotice } = useAction()
  const [note, setNote] = useState('')
  const [tempPw, setTempPw] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  const first = (order.customer_name ?? '').split(' ')[0]
  const trackLink = typeof window !== 'undefined' ? `${window.location.origin}/track?code=${order.code}` : ''
  const reviewLink = typeof window !== 'undefined' ? `${window.location.origin}/orders/${order.code}#review` : ''
  const statusMsg = STATUS_MESSAGES[order.status]
  const linkLine =
    order.status === 'completed'
      ? reviewLink
        ? ` We'd love to hear what you thought: ${reviewLink}`
        : ''
      : trackLink
        ? ` Track it here: ${trackLink}`
        : ''
  const waStatus = whatsappLink(
    toIntlPhone(order.contact_phone),
    `Hello ${first}, ${statusMsg ? `${statusMsg}` : `an update on your order ${order.code}`}${statusMsg ? ` (order ${order.code})` : ''}.${linkLine}\n\n${s.business_name}`,
  )

  async function move(status: OrderStatus) {
    const ok = await run(() => setOrderStatus({ data: { id: order.id, status, note } }), `Order marked as "${ORDER_STATUS[status].admin}". The customer sees this when they track their order.`)
    if (ok) {
      setNote('')
      setConfirmCancel(false)
      router.invalidate()
    }
  }
  async function markPaid() {
    const ok = await run(() => confirmPayment({ data: { id: order.id, note: note || `Payment confirmed (${order.payment_method === 'paystack' ? 'card' : 'bank transfer'})` } }), 'Payment confirmed. The order is now booked in.')
    if (ok) {
      setNote('')
      router.invalidate()
    }
  }
  async function resetPw() {
    const r = await run(() => resetCustomerPassword({ data: order.customer_id }))
    if (r) {
      setTempPw(r.temp)
      setNotice('')
    }
  }

  const unpaid = order.payment_status !== 'paid'
  return (
    <>
      <Link to="/admin/orders" className="text-sm font-semibold text-[#667085] hover:text-cocoa"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />All orders</Link>
      <div className="mt-3">
        <PageTitle
          title={`Order ${order.code}`}
          actions={
            isOwner && (
              <Link to="/admin/receipts/$id" params={{ id: 'new' }} search={{ order: order.id }} className="btn btn-ghost text-cocoa">
              Create receipt
            </Link>
            )
          }
        >
          Placed {formatDate(order.created_at)} by {order.customer_name}.
        </PageTitle>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {unpaid && order.status !== 'cancelled' && (
            <section className="admin-card space-y-3 border-amber-300 bg-amber-50/60 p-5">
              <h2 className="text-lg font-bold">Payment not confirmed yet</h2>
              <p className="text-sm text-[#475467]">
                {order.payment_method === 'paystack'
                  ? 'The customer chose card payment. Paystack confirms these automatically. Only confirm by hand if you’ve checked your Paystack dashboard.'
                  : order.proof_key
                    ? 'The customer uploaded proof of payment. Check your bank app that the money has arrived, then confirm.'
                    : 'The customer chose bank transfer but hasn’t uploaded proof yet. Confirm once you see the money in your account.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {order.proof_key && (
                  <a href={`/api/admin/proof/${order.id}`} target="_blank" rel="noopener" className="btn btn-ghost !py-2.5 text-sm text-cocoa">
                    View proof of payment
                  </a>
                )}
                <button type="button" className="btn btn-primary !py-2.5 text-sm" onClick={markPaid} disabled={busy}>
                  Confirm payment of {formatNaira(order.total)}
                </button>
              </div>
            </section>
          )}

          <OrderTracker status={order.status} fulfilment={order.fulfilment} events={events} />

          <section className="admin-card space-y-4 p-5">
            <h2 className="text-lg font-bold">Update progress</h2>
            <div>
              <label htmlFor="o-note" className="admin-label">Note for the customer (optional)</label>
              <input id="o-note" className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rider is Musa, 0803 000 0000" />
            </div>
            <div className="flex flex-wrap gap-2">
              {ADMIN_NEXT_STATUSES.filter((st) => st !== 'cancelled' && !(st === 'out_for_delivery' && order.fulfilment !== 'delivery')).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => move(st)}
                  disabled={busy || order.status === st}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                    order.status === st ? 'bg-cocoa text-white ring-cocoa' : 'bg-white ring-[#d0d5e2] hover:ring-brand'
                  }`}
                >
                  {st === 'completed' ? (order.fulfilment === 'delivery' ? 'Delivered' : 'Collected') : ORDER_STATUS[st].admin}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-[#eceff5] pt-4">
              {waStatus && (
                <a href={waStatus} target="_blank" rel="noopener" className="btn btn-primary !py-2.5 text-sm">
                  <WhatsAppIcon className="h-4 w-4" /> Send update on WhatsApp
                </a>
              )}
              {order.status !== 'cancelled' &&
                (confirmCancel ? (
                  <span className="flex items-center gap-2 text-sm">
                    Cancel this order?
                    <button type="button" className="font-semibold text-red-700" onClick={() => move('cancelled')}>Yes, cancel</button>
                    <button type="button" className="text-[#667085]" onClick={() => setConfirmCancel(false)}>No</button>
                  </span>
                ) : (
                  <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => setConfirmCancel(true)}>Cancel order</button>
                ))}
            </div>
            <Messages error={error} notice={notice} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="admin-card space-y-3 p-5 text-sm">
            <h2 className="text-lg font-bold">Customer</h2>
            <p className="font-semibold">{order.customer_name}</p>
            <p className="select-all tabular">{order.contact_phone}</p>
            <p className="select-all break-all text-[#667085]">{order.customer_email}</p>
            <div className="border-t border-[#eceff5] pt-3">
              {tempPw ? (
                <p className="rounded-lg bg-amber-50 p-3">
                  Temporary password: <strong className="select-all font-mono text-base">{tempPw}</strong>
                  <span className="block text-xs text-[#667085]">Send it to them privately. They can change it on their account page.</span>
                </p>
              ) : (
                <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={resetPw} disabled={busy}>
                  Customer forgot their password? Reset it
                </button>
              )}
            </div>
          </section>

          <section className="admin-card space-y-3 p-5 text-sm">
            <h2 className="text-lg font-bold">{fulfilmentLabel(order.fulfilment, order.own_rider)}</h2>
            <p className="text-base font-semibold">
              {formatDate(order.needed_date)}
              {order.time_slot && <span className="block text-sm font-normal text-[#667085]">{order.time_slot}</span>}
            </p>
            {order.fulfilment === 'delivery' && (
              <p>
                {order.address}
                {order.zone_name && <span className="block text-[#667085]">{order.zone_name} · fee {formatNaira(order.delivery_fee)}</span>}
              </p>
            )}
            {order.note && <p className="rounded-lg bg-[#f6f7fb] p-3">Customer note: {order.note}</p>}
          </section>

          <section className="admin-card space-y-3 p-5 text-sm">
            <h2 className="text-lg font-bold">Items</h2>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>
                    <strong>{i.qty} ×</strong> {i.name}
                    <span className="block text-[#667085]">{i.option_label}</span>
                    {i.note && <span className="block italic">&ldquo;{i.note}&rdquo;</span>}
                    <CustomDetails dark rows={describeCustom(i.custom_json)} refUrl={i.ref_key ? `/api/admin/order-item-ref/${i.id}` : undefined} />
                  </span>
                  <span className="tabular">{formatNaira(i.qty * i.unit_price)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-[#eceff5] pt-3 tabular">
              <div className="flex justify-between"><span className="text-[#667085]">Items</span><span>{formatNaira(order.subtotal)}</span></div>
              {order.delivery_fee > 0 && <div className="flex justify-between"><span className="text-[#667085]">Delivery</span><span>{formatNaira(order.delivery_fee)}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount ({order.discount_code})</span><span>−{formatNaira(order.discount)}</span></div>}
              <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatNaira(order.total)}</span></div>
              <p className={`text-right font-semibold ${unpaid ? 'text-amber-700' : 'text-emerald-700'}`}>
                {unpaid ? 'Not paid yet' : `Paid${order.paid_at ? ` · ${formatDate(order.paid_at)}` : ''}`}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
