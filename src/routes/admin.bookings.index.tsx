import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageTitle } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { listBookings } from '~/fns/bookings'
import { BOOKING_STATUS, type Booking } from '~/lib/bookings'
import { downloadFile, toCsv, today } from '~/lib/export'
import { formatNaira, fulfilmentLabel } from '~/lib/format'

export const Route = createFileRoute('/admin/bookings/')({
  loader: () => listBookings(),
  component: BookingsAdmin,
})

const needsAction = (b: Booking) => b.status === 'requested' || b.status === 'checking' || !!b.proof_pending

const FILTERS: { key: string; label: string; match: (b: Booking) => boolean; soonestFirst?: boolean }[] = [
  { key: 'action', label: 'Needs action', match: needsAction, soonestFirst: true },
  { key: 'quoted', label: 'Awaiting deposit', match: (b) => b.status === 'quoted', soonestFirst: true },
  { key: 'upcoming', label: 'Booked', match: (b) => b.status === 'booked', soonestFirst: true },
  { key: 'done', label: 'Completed', match: (b) => b.status === 'completed' },
  { key: 'closed', label: 'Declined / cancelled', match: (b) => b.status === 'declined' || b.status === 'cancelled' },
  { key: 'all', label: 'All', match: () => true },
]

function BookingsAdmin() {
  const bookings = Route.useLoaderData()
  const [filter, setFilter] = useState('action')
  const [q, setQ] = useState('')
  const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0]
  const term = q.trim().toLowerCase()
  const shown = bookings.filter(
    (b) => f.match(b) && (!term || [b.code, b.customer_name ?? '', b.contact_phone, b.event_type].some((v) => v.toLowerCase().includes(term))),
  )
  if (f.soonestFirst) shown.sort((a, b) => a.event_date.localeCompare(b.event_date))

  function exportCsv() {
    downloadFile(
      `miel-cakes-bookings-${today()}.csv`,
      toCsv(shown, [
        { label: 'Booking', value: (b) => b.code },
        { label: 'Requested', value: (b) => b.created_at },
        { label: 'Customer', value: (b) => b.customer_name ?? '' },
        { label: 'Phone', value: (b) => b.contact_phone },
        { label: 'Occasion', value: (b) => b.event_type },
        { label: 'Event date', value: (b) => b.event_date },
        { label: 'Time', value: (b) => b.event_time },
        { label: 'Guests', value: (b) => b.guests },
        { label: 'Pickup/delivery', value: (b) => (b.fulfilment === 'delivery' ? `Delivery (${b.zone_name ?? ''})` : fulfilmentLabel(b.fulfilment, b.own_rider)) },
        { label: 'Quote (NGN)', value: (b) => b.quote_amount },
        { label: 'Deposit (NGN)', value: (b) => b.deposit_amount },
        { label: 'Paid (NGN)', value: (b) => b.paid_amount },
        { label: 'Balance (NGN)', value: (b) => Math.max(0, b.quote_amount - b.paid_amount) },
        { label: 'Status', value: (b) => BOOKING_STATUS[b.status].admin },
      ]),
    )
  }

  return (
    <>
      <PageTitle
        title="Event bookings"
        actions={
          <button type="button" className="btn btn-ghost text-cocoa" onClick={exportCsv} disabled={!shown.length}>
            Download (Excel)
          </button>
        }
      >
        Customers request a booking on the Events page. Send each one a quote, confirm their deposit, and their date is booked.
      </PageTitle>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => {
          const n = bookings.filter(x.match).length
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
      <input type="search" aria-label="Search bookings" className="admin-input mb-4 max-w-sm" placeholder="Search booking no., name, phone or occasion" value={q} onChange={(e) => setQ(e.target.value)} />

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          {bookings.length ? 'No bookings here.' : 'No event bookings yet. They appear here when a customer sends a request from the Events page.'}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-[#e3e7f0] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-semibold">Booking</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Quote / paid</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {shown.map((b) => (
                <tr key={b.id} className="hover:bg-[#f6f7fb]">
                  <td className="px-4 py-3">
                    <Link to="/admin/bookings/$id" params={{ id: String(b.id) }} className="font-semibold text-brand hover:underline">{b.code}</Link>
                    <span className="block text-xs text-[#98a2b3]">{formatDate(b.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {b.customer_name}
                    <span className="block text-xs text-[#667085] tabular">{b.contact_phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    {b.event_type}
                    <span className="block text-xs text-[#667085]">{b.guests} guests · {b.fulfilment === 'delivery' ? b.zone_name ?? 'Delivery' : fulfilmentLabel(b.fulfilment, b.own_rider)}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatDate(b.event_date)}
                    {b.event_time && <span className="block text-xs font-normal text-[#667085]">{b.event_time}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    {b.quote_amount ? formatNaira(b.quote_amount) : <span className="text-[#98a2b3]">No quote yet</span>}
                    {b.quote_amount > 0 && (
                      <span className={`block text-xs ${b.paid_amount >= b.quote_amount ? 'text-emerald-700' : 'text-[#667085]'}`}>
                        {b.paid_amount >= b.quote_amount ? 'Paid in full' : `Paid ${formatNaira(b.paid_amount)}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BOOKING_STATUS[b.status].className}`}>{BOOKING_STATUS[b.status].admin}</span>
                    {!!b.proof_pending && b.status !== 'checking' && <span className="mt-1 block text-xs font-semibold text-amber-700">Proof sent: check payment</span>}
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
