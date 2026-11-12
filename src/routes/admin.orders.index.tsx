import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageTitle } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { listOrders } from '~/fns/orders-admin'
import { downloadFile, toCsv, today } from '~/lib/export'
import { formatNaira, fulfilmentLabel } from '~/lib/format'
import { ORDER_STATUS, type OrderStatus } from '~/lib/orders'

export const Route = createFileRoute('/admin/orders/')({
  loader: () => listOrders(),
  component: OrdersAdmin,
})

const FILTERS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: 'action', label: 'Needs action', match: (s) => ['awaiting_confirmation', 'received', 'baking', 'ready', 'out_for_delivery'].includes(s) },
  { key: 'check', label: 'Check payment', match: (s) => s === 'awaiting_confirmation' },
  { key: 'unpaid', label: 'Awaiting payment', match: (s) => s === 'pending_payment' },
  { key: 'done', label: 'Completed', match: (s) => s === 'completed' },
  { key: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' },
  { key: 'all', label: 'All', match: () => true },
]

function OrdersAdmin() {
  const orders = Route.useLoaderData()
  const [filter, setFilter] = useState('action')
  const [q, setQ] = useState('')
  const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0]
  const term = q.trim().toLowerCase()
  const shown = orders.filter(
    (o) => f.match(o.status) && (!term || [o.code, o.customer_name ?? '', o.contact_phone].some((v) => v.toLowerCase().includes(term))),
  )
  // Soonest date first for active orders, newest first otherwise
  if (filter === 'action' || filter === 'check') shown.sort((a, b) => a.needed_date.localeCompare(b.needed_date))

  function exportCsv() {
    downloadFile(
      `miel-cakes-orders-${today()}.csv`,
      toCsv(shown, [
        { label: 'Order', value: (o) => o.code },
        { label: 'Placed', value: (o) => o.created_at },
        { label: 'Customer', value: (o) => o.customer_name ?? '' },
        { label: 'Phone', value: (o) => o.contact_phone },
        { label: 'Date needed', value: (o) => o.needed_date },
        { label: 'Time', value: (o) => o.time_slot },
        { label: 'Pickup/delivery', value: (o) => (o.fulfilment === 'delivery' ? `Delivery (${o.zone_name ?? ''})` : fulfilmentLabel(o.fulfilment, o.own_rider)) },
        { label: 'Items', value: (o) => o.item_count },
        { label: 'Discount (NGN)', value: (o) => o.discount },
        { label: 'Discount code', value: (o) => o.discount_code },
        { label: 'Total (NGN)', value: (o) => o.total },
        { label: 'Payment', value: (o) => `${o.payment_method} / ${o.payment_status}` },
        { label: 'Status', value: (o) => ORDER_STATUS[o.status].admin },
      ]),
    )
  }

  return (
    <>
      <PageTitle
        title="Orders"
        actions={
          <button type="button" className="btn btn-ghost text-cocoa" onClick={exportCsv} disabled={!shown.length}>
            Download (Excel)
          </button>
        }
      >
        Orders placed on the website. Confirm transfer payments, then move each order along so customers can track it.
      </PageTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = orders.filter((o) => x.match(o.status)).length
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => setFilter(x.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === x.key ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#e3e7f0]'}`}
            >
              {x.label} ({n})
            </button>
          )
        })}
      </div>
      <input id="order-search" type="search" className="admin-input mb-4 max-w-sm" placeholder="Search order no., name or phone" value={q} onChange={(e) => setQ(e.target.value)} />

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          {orders.length ? 'No orders here.' : 'No online orders yet. They appear here as soon as a customer checks out.'}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[#e3e7f0] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Needed</th>
                <th className="px-4 py-3 font-semibold">How</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {shown.map((o) => (
                <tr key={o.id} className="hover:bg-[#f6f7fb]">
                  <td className="px-4 py-3">
                    <Link to="/admin/orders/$id" params={{ id: String(o.id) }} className="font-semibold text-brand hover:underline">{o.code}</Link>
                    <span className="block text-xs text-[#98a2b3]">{formatDate(o.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {o.customer_name}
                    <span className="block text-xs text-[#667085] tabular">{o.contact_phone}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatDate(o.needed_date)}
                    {o.time_slot && <span className="block text-xs font-normal text-[#667085]">{o.time_slot}</span>}
                  </td>
                  <td className="px-4 py-3">{o.fulfilment === 'delivery' ? `Delivery · ${o.zone_name ?? ''}` : fulfilmentLabel(o.fulfilment, o.own_rider)}</td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatNaira(o.total)}
                    <span className={`block text-xs ${o.payment_status === 'paid' ? 'text-emerald-700' : 'text-[#98a2b3]'}`}>
                      {o.payment_status === 'paid' ? 'Paid' : o.payment_method === 'paystack' ? 'Card, unpaid' : o.proof_key ? 'Proof sent' : 'Transfer, unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ORDER_STATUS[o.status].className}`}>{ORDER_STATUS[o.status].admin}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
