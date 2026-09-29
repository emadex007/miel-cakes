import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Messages, PageTitle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { WhatsAppIcon } from '~/components/icons'
import { clientFromQuote, deleteQuote, listQuotes, updateQuote } from '~/fns/business'
import { toIntlPhone, whatsappLink } from '~/lib/format'
import { downloadFile, toCsv, today } from '~/lib/export'
import type { QuoteRequest } from '~/lib/types'

export const Route = createFileRoute('/admin/quotes')({
  loader: () => listQuotes(),
  component: QuotesAdmin,
})

const STATUSES: { value: QuoteRequest['status']; label: string; className: string }[] = [
  { value: 'new', label: 'New', className: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', className: 'bg-slate-100 text-slate-700' },
  { value: 'quoted', label: 'Price sent', className: 'bg-amber-100 text-amber-900' },
  { value: 'confirmed', label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'declined', label: 'Declined', className: 'bg-red-100 text-red-800' },
]
const statusOf = (v: string) => STATUSES.find((s) => s.value === v) ?? STATUSES[0]

function QuotesAdmin() {
  const quotes = Route.useLoaderData()
  const router = useRouter()
  const { error, notice, run, setNotice } = useAction()
  const [filter, setFilter] = useState<'all' | QuoteRequest['status']>('all')
  const [openId, setOpenId] = useState<number | null>(quotes[0]?.status === 'new' ? quotes[0].id : null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const shown = filter === 'all' ? quotes : quotes.filter((q) => q.status === filter)
  const count = (st: QuoteRequest['status']) => quotes.filter((q) => q.status === st).length

  async function setStatus(q: QuoteRequest, status: QuoteRequest['status']) {
    await run(() => updateQuote({ data: { id: q.id, status, admin_note: notes[q.id] ?? q.admin_note } }))
    router.invalidate()
  }
  async function saveNote(q: QuoteRequest) {
    const ok = await run(() => updateQuote({ data: { id: q.id, status: q.status, admin_note: notes[q.id] ?? q.admin_note } }), 'Note saved.')
    if (ok) router.invalidate()
  }
  async function addCustomer(q: QuoteRequest) {
    const r = await run(() => clientFromQuote({ data: q.id }))
    if (r) setNotice(r.existed ? `${q.name} is already in your customers.` : `${q.name} added to your customers.`)
  }
  async function remove(id: number) {
    const ok = await run(() => deleteQuote({ data: id }), 'Request deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }
  function exportCsv() {
    downloadFile(
      `miel-cakes-quote-requests-${today()}.csv`,
      toCsv(quotes, [
        { label: 'Code', value: (q) => q.code },
        { label: 'Received', value: (q) => q.created_at },
        { label: 'Status', value: (q) => statusOf(q.status).label },
        { label: 'Name', value: (q) => q.name },
        { label: 'Phone', value: (q) => q.phone },
        { label: 'Email', value: (q) => q.email },
        { label: 'Occasion', value: (q) => q.occasion },
        { label: 'Date needed', value: (q) => q.event_date },
        { label: 'Wants', value: (q) => q.items },
        { label: 'Cake shape', value: (q) => q.cake_shape },
        { label: 'Size', value: (q) => q.cake_size },
        { label: 'Flavour', value: (q) => q.flavour },
        { label: 'Colours', value: (q) => q.colours },
        { label: 'Message on cake', value: (q) => q.cake_message },
        { label: 'Guests', value: (q) => q.guests || '' },
        { label: 'Pickup/delivery', value: (q) => q.fulfilment },
        { label: 'Area', value: (q) => q.area },
        { label: 'Budget', value: (q) => q.budget },
        { label: 'Details', value: (q) => q.details },
        { label: 'Your note', value: (q) => q.admin_note },
      ]),
    )
  }

  return (
    <>
      <PageTitle
        title="Quote requests"
        actions={
          <button type="button" className="btn btn-ghost text-cocoa" onClick={exportCsv} disabled={!quotes.length}>
            Download (Excel)
          </button>
        }
      >
        Requests from the &ldquo;Get a quote&rdquo; form on the Contact page. Reply on WhatsApp, then track where each one stands.
      </PageTitle>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#e3e7f0]'}`}
        >
          All ({quotes.length})
        </button>
        {STATUSES.map((st) => (
          <button
            key={st.value}
            type="button"
            onClick={() => setFilter(st.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === st.value ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#e3e7f0]'}`}
          >
            {st.label} ({count(st.value)})
          </button>
        ))}
      </div>
      <div className="mb-4">
        <Messages error={error} notice={notice} />
      </div>

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          No requests here yet. They appear as soon as a customer fills in the quote form.
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((q) => {
            const st = statusOf(q.status)
            const isOpen = openId === q.id
            const reply = whatsappLink(
              toIntlPhone(q.phone),
              `Hello ${q.name.split(' ')[0]}, thank you for your quote request (${q.code}) with Miel Cakes${q.occasion ? ` for your ${q.occasion.toLowerCase()}` : ''}. `,
            )
            return (
              <li key={q.id} className="admin-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.className}`}>{st.label}</span>
                  <span className="font-semibold">{q.name}</span>
                  <span className="text-sm text-[#667085]">
                    {[q.occasion, q.items, q.event_date && formatDate(q.event_date)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="ml-auto text-xs text-[#98a2b3]">
                    {q.code} · {formatDate(q.created_at)}
                  </span>
                </button>

                {isOpen && (
                  <div className="grid gap-6 border-t border-[#eceff5] p-5 lg:grid-cols-[1.2fr_1fr]">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      {[
                        ['Phone', q.phone],
                        ['Email', q.email],
                        ['Occasion', q.occasion],
                        ['Date needed', q.event_date && formatDate(q.event_date)],
                        ['Wants', q.items],
                        ['Guests', q.guests ? String(q.guests) : ''],
                        ['Cake shape', q.cake_shape],
                        ['Size / tiers', q.cake_size],
                        ['Flavour', q.flavour],
                        ['Colours / theme', q.colours],
                        ['Message on cake', q.cake_message],
                        ['Pickup or delivery', q.fulfilment === 'delivery' ? `Delivery${q.area ? ` to ${q.area}` : ''}` : 'Pickup'],
                        ['Budget', q.budget],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">{k}</dt>
                            <dd className="mt-0.5 select-all">{v}</dd>
                          </div>
                        ))}
                      {q.details && (
                        <div className="col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">Details</dt>
                          <dd className="mt-0.5 whitespace-pre-line">{q.details}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {reply && (
                          <a href={reply} target="_blank" rel="noopener" className="btn btn-primary !py-2.5 text-sm">
                            <WhatsAppIcon className="h-4 w-4" /> Reply on WhatsApp
                          </a>
                        )}
                        <button type="button" className="btn btn-ghost !py-2.5 text-sm text-cocoa" onClick={() => addCustomer(q)}>
                          Save as customer
                        </button>
                        <Link
                          to="/admin/receipts/$id"
                          params={{ id: 'new' }}
                          search={{ quote: q.id }}
                          className="btn btn-ghost !py-2.5 text-sm text-cocoa"
                        >
                          Create receipt
                        </Link>
                      </div>
                      <div>
                        <label htmlFor={`status-${q.id}`} className="admin-label">Status</label>
                        <select
                          id={`status-${q.id}`}
                          className="admin-input"
                          value={q.status}
                          onChange={(e) => setStatus(q, e.target.value as QuoteRequest['status'])}
                        >
                          {STATUSES.map((s2) => (
                            <option key={s2.value} value={s2.value}>{s2.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`note-${q.id}`} className="admin-label">Your notes (only you see these)</label>
                        <textarea
                          id={`note-${q.id}`}
                          rows={3}
                          className="admin-input"
                          value={notes[q.id] ?? q.admin_note}
                          onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                          placeholder="e.g. Quoted ₦85,000, waiting for deposit"
                        />
                        <div className="mt-2 flex justify-between text-sm">
                          <button type="button" className="font-semibold text-brand hover:underline" onClick={() => saveNote(q)}>
                            Save note
                          </button>
                          {confirmId === q.id ? (
                            <span className="flex gap-2">
                              <button type="button" className="font-semibold text-red-700" onClick={() => remove(q.id)}>Delete</button>
                              <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                            </span>
                          ) : (
                            <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmId(q.id)}>
                              Delete request
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
