import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageTitle } from '~/components/admin/ui'
import { PAYMENT_METHODS, RECEIPT_STATUS, formatDate } from '~/components/ReceiptSheet'
import { listReceipts } from '~/fns/business'
import { downloadFile, toCsv, today } from '~/lib/export'
import { formatNaira } from '~/lib/format'

export const Route = createFileRoute('/admin/receipts/')({
  loader: () => listReceipts(),
  component: ReceiptsAdmin,
})

function ReceiptsAdmin() {
  const receipts = Route.useLoaderData()
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('all')

  const months = Array.from(new Set(receipts.map((r) => r.issued_on.slice(0, 7)))).sort().reverse()
  const term = q.trim().toLowerCase()
  const shown = receipts.filter(
    (r) =>
      (month === 'all' || r.issued_on.startsWith(month)) &&
      (!term || [r.code, r.client_name, r.client_phone].some((v) => v.toLowerCase().includes(term))),
  )
  const totalPaid = shown.reduce((sum, r) => sum + r.amount_paid, 0)
  const owed = shown.reduce((sum, r) => sum + Math.max(0, r.total - r.amount_paid), 0)
  const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })

  function exportCsv() {
    downloadFile(
      `miel-cakes-receipts-${month === 'all' ? today() : month}.csv`,
      toCsv(shown, [
        { label: 'Receipt', value: (r) => r.code },
        { label: 'Date', value: (r) => r.issued_on },
        { label: 'Customer', value: (r) => r.client_name },
        { label: 'Phone', value: (r) => r.client_phone },
        { label: 'Items', value: (r) => r.items.map((i) => `${i.qty} x ${i.description}`).join('; ') },
        { label: 'Subtotal (NGN)', value: (r) => r.subtotal },
        { label: 'Delivery (NGN)', value: (r) => r.delivery_fee },
        { label: 'Discount (NGN)', value: (r) => r.discount },
        { label: 'Total (NGN)', value: (r) => r.total },
        { label: 'Paid (NGN)', value: (r) => r.amount_paid },
        { label: 'Balance (NGN)', value: (r) => r.total - r.amount_paid },
        { label: 'Payment', value: (r) => PAYMENT_METHODS[r.payment_method] },
        { label: 'Status', value: (r) => RECEIPT_STATUS[r.status].label },
        { label: 'Pickup/delivery', value: (r) => r.fulfilment },
      ]),
    )
  }

  return (
    <>
      <PageTitle
        title="Receipts"
        actions={
          <>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={exportCsv} disabled={!shown.length}>
              Download (Excel)
            </button>
            <Link to="/admin/receipts/$id" params={{ id: 'new' }} className="btn btn-primary">
              + New receipt
            </Link>
          </>
        }
      >
        Create a receipt, then send it to the customer on WhatsApp or email, or print it. Each one comes with a thank-you note.
      </PageTitle>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="admin-card p-5">
          <p className="text-sm font-semibold text-[#667085]">Receipts</p>
          <p className="mt-1 font-display text-4xl tabular text-cocoa">{shown.length}</p>
        </div>
        <div className="admin-card p-5">
          <p className="text-sm font-semibold text-[#667085]">Money received</p>
          <p className="mt-1 font-display text-3xl tabular text-cocoa">{formatNaira(totalPaid)}</p>
        </div>
        <div className="admin-card col-span-2 p-5 sm:col-span-1">
          <p className="text-sm font-semibold text-[#667085]">Still owed</p>
          <p className={`mt-1 font-display text-3xl tabular ${owed ? 'text-red-700' : 'text-cocoa'}`}>{formatNaira(owed)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input id="receipt-search" type="search" className="admin-input max-w-xs" placeholder="Search name, phone or receipt no." value={q} onChange={(e) => setQ(e.target.value)} />
        <select id="receipt-month" aria-label="Filter by month" className="admin-input max-w-[14rem]" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          {receipts.length ? 'No receipts match.' : 'No receipts yet. Create one after a customer pays.'}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-[#e3e7f0] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-semibold">Receipt</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold tabular">{r.code}</td>
                  <td className="px-4 py-3">
                    {r.client_name}
                    {r.client_phone && <span className="block text-xs text-[#667085] tabular">{r.client_phone}</span>}
                  </td>
                  <td className="px-4 py-3">{formatDate(r.issued_on)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatNaira(r.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${RECEIPT_STATUS[r.status].className}`}>{RECEIPT_STATUS[r.status].label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to="/admin/receipts/$id" params={{ id: String(r.id) }} className="font-semibold text-brand hover:underline">
                      Open
                    </Link>
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
