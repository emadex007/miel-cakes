import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { BookingTracker } from '~/components/BookingTracker'
import { Messages, PageTitle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { ArrowLeftIcon, CloseIcon, WhatsAppIcon } from '~/components/icons'
import {
  deleteBookingPayment,
  dismissBookingProof,
  getBookingAdmin,
  recordBookingPayment,
  saveBookingNote,
  sendBookingQuote,
  setBookingStatus,
} from '~/fns/bookings'
import { BOOKING_STATUS, type BookingStatus, type QuoteLine } from '~/lib/bookings'
import { formatNaira, toIntlPhone, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/admin/bookings/$id')({
  loader: ({ params }) => getBookingAdmin({ data: Number(params.id) }),
  component: BookingAdmin,
})

const METHODS = [
  { key: 'transfer', label: 'Bank transfer' },
  { key: 'cash', label: 'Cash' },
  { key: 'pos', label: 'POS' },
  { key: 'paystack', label: 'Paystack' },
] as const
const METHOD_LABEL: Record<string, string> = { transfer: 'Bank transfer', cash: 'Cash', pos: 'POS', paystack: 'Card (Paystack)' }

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0
const show = (n: number) => (n ? n.toLocaleString('en-NG') : '')

function BookingAdmin() {
  const { admin } = Route.useRouteContext()
  const isOwner = admin?.role === 'owner'
  const s = root.useLoaderData()
  const { booking: b, events, payments, lines, due, depositPercent } = Route.useLoaderData()
  const router = useRouter()
  const status = useAction()
  const [statusNote, setStatusNote] = useState('')
  const [confirmClose, setConfirmClose] = useState<BookingStatus | null>(null)

  const first = (b.customer_name ?? '').split(' ')[0]
  const link = typeof window !== 'undefined' ? `${window.location.origin}/bookings/${b.code}` : ''
  const eventDate = formatDate(b.event_date)
  const balance = Math.max(0, b.quote_amount - b.paid_amount)
  const closed = ['completed', 'declined', 'cancelled'].includes(b.status)

  const waMessage = (() => {
    const sign = `\n\n${s.business_name}`
    switch (b.status) {
      case 'requested':
        return `Hello ${first}, thank you for your booking request for your ${b.event_type} on ${eventDate}. We're preparing your quote and will send it shortly.${sign}`
      case 'quoted':
      case 'checking':
        return `Hello ${first}, thank you for choosing ${s.business_name} for your ${b.event_type} on ${eventDate}. Your quote is ${formatNaira(b.quote_amount)}.${b.deposit_amount ? ` To book the date, please pay a deposit of ${formatNaira(b.deposit_amount)}.` : ''} See the full breakdown and pay here: ${link}${sign}`
      case 'booked':
        return balance > 0
          ? `Hello ${first}, we've received your payment. Your ${b.event_type} on ${eventDate} is booked! The balance of ${formatNaira(balance)} is due before the day. Details: ${link}${sign}`
          : `Hello ${first}, you're all paid up for your ${b.event_type} on ${eventDate}. Thank you! Details: ${link}${sign}`
      case 'completed':
        return `Hello ${first}, thank you for celebrating with ${s.business_name}! We hope your ${b.event_type} was wonderful.${sign}`
      case 'declined':
        return `Hello ${first}, thank you for your booking request for ${eventDate}. We're sorry, we're not able to take it this time.${sign}`
      default:
        return `Hello ${first}, an update on your booking ${b.code}: ${link}${sign}`
    }
  })()
  const wa = whatsappLink(toIntlPhone(b.contact_phone), waMessage)

  async function move(next: BookingStatus) {
    const ok = await status.run(() => setBookingStatus({ data: { id: b.id, status: next, note: statusNote } }), `Booking marked as "${BOOKING_STATUS[next].admin}".`)
    if (ok) {
      setStatusNote('')
      setConfirmClose(null)
      router.invalidate()
    }
  }

  return (
    <>
      <Link to="/admin/bookings" className="text-sm font-semibold text-[#667085] hover:text-cocoa"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />All bookings</Link>
      <div className="mt-3">
        <PageTitle
          title={`Booking ${b.code}`}
          actions={
            isOwner && (
              <Link to="/admin/receipts/$id" params={{ id: 'new' }} search={{ booking: b.id }} className="btn btn-ghost text-cocoa">
              Create receipt
            </Link>
            )
          }
        >
          {b.event_type} for {b.guests} guests on {eventDate}. Requested {formatDate(b.created_at)} by {b.customer_name}.
        </PageTitle>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {!!b.proof_pending && <ProofCheck id={b.id} amount={due.amount} kind={due.kind} onDone={() => router.invalidate()} />}

          <BookingTracker booking={b} events={events} admin />

          {!closed && (
            <QuoteEditor
              key={`${b.id}-${b.quoted_at}`}
              id={b.id}
              initialLines={lines}
              initialDelivery={b.delivery_fee}
              initialDeposit={b.deposit_amount}
              initialMessage={b.quote_message}
              depositPercent={depositPercent}
              hasQuote={b.quote_amount > 0}
              onSaved={() => router.invalidate()}
            />
          )}

          <Payments
            id={b.id}
            quote={b.quote_amount}
            deposit={b.deposit_amount}
            paid={b.paid_amount}
            suggested={due.amount}
            payments={payments}
            onChanged={() => router.invalidate()}
          />

          <section className="admin-card space-y-4 p-5">
            <h2 className="text-lg font-bold">Update the booking</h2>
            <div>
              <label htmlFor="b-note" className="admin-label">Note for the customer (optional)</label>
              <input id="b-note" className="admin-input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="e.g. Delivery at 11am, our driver is Musa" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(b.status === 'quoted' || b.status === 'checking') && (
                <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-[#d0d5e2] hover:ring-brand" onClick={() => move('booked')} disabled={status.busy}>
                  Book the date without a deposit
                </button>
              )}
              {b.status === 'booked' && (
                <button type="button" className="btn btn-primary !py-2 text-sm" onClick={() => move('completed')} disabled={status.busy}>
                  Mark as completed
                </button>
              )}
              {closed && (
                <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-[#d0d5e2] hover:ring-brand" onClick={() => move(b.paid_amount > 0 ? 'booked' : 'quoted')} disabled={status.busy}>
                  Reopen booking
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-[#eceff5] pt-4">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="btn btn-primary !py-2.5 text-sm">
                  <WhatsAppIcon className="h-4 w-4" /> Message customer on WhatsApp
                </a>
              )}
              {!closed &&
                (confirmClose ? (
                  <span className="flex items-center gap-2 text-sm">
                    {confirmClose === 'declined' ? 'Decline this booking?' : 'Cancel this booking?'}
                    <button type="button" className="font-semibold text-red-700" onClick={() => move(confirmClose)}>Yes</button>
                    <button type="button" className="text-[#667085]" onClick={() => setConfirmClose(null)}>No</button>
                  </span>
                ) : (
                  <>
                    {b.status === 'requested' && (
                      <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => setConfirmClose('declined')}>Can&rsquo;t take it (decline)</button>
                    )}
                    <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => setConfirmClose('cancelled')}>Cancel booking</button>
                  </>
                ))}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-[#667085]">See the WhatsApp message</summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-[#f6f7fb] p-4 font-sans">{waMessage}</pre>
            </details>
            <Messages error={status.error} notice={status.notice} />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="admin-card space-y-2 p-5 text-sm">
            <h2 className="text-lg font-bold">Customer</h2>
            <p className="font-semibold">{b.customer_name}</p>
            <p className="select-all tabular">{b.contact_phone}</p>
            <p className="select-all break-all text-[#667085]">{b.customer_email}</p>
          </section>

          <section className="admin-card space-y-3 p-5 text-sm">
            <h2 className="text-lg font-bold">The event</h2>
            <dl className="space-y-1.5">
              <Row label="Occasion" value={b.event_type} />
              <Row label="Date" value={`${eventDate}${b.event_time ? `, ${b.event_time}` : ''}`} />
              <Row label="Guests" value={String(b.guests)} />
              <Row label={b.fulfilment === 'delivery' ? 'Venue' : 'Pickup'} value={b.fulfilment === 'delivery' ? `${b.address}${b.zone_name ? `, ${b.zone_name}` : ''}` : b.own_rider ? 'Customer sends their own rider' : 'Customer picks up'} />
              {b.budget && <Row label="Budget" value={b.budget} />}
            </dl>
            {b.items_wanted && <p className="border-t border-[#eceff5] pt-3"><span className="text-[#667085]">Wants:</span> <strong>{b.items_wanted}</strong></p>}
            {b.details && <p className="whitespace-pre-line rounded-lg bg-[#f6f7fb] p-3">{b.details}</p>}
            {b.reference_image && (
              <a href={`/api/admin/booking-file/${b.id}/reference`} target="_blank" rel="noopener" className="block">
                <img src={`/api/admin/booking-file/${b.id}/reference`} alt="Picture the customer sent" className="max-h-64 w-full rounded-xl bg-[#eef1f7] object-contain" />
                <span className="mt-1 block text-xs font-semibold text-brand">Open full size</span>
              </a>
            )}
          </section>

          <PrivateNote id={b.id} initial={b.admin_note} />
        </aside>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#667085]">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function ProofCheck({ id, amount, kind, onDone }: { id: number; amount: number; kind: string; onDone: () => void }) {
  const { busy, error, run } = useAction()
  const [value, setValue] = useState(amount)
  async function confirm() {
    if (await run(() => recordBookingPayment({ data: { id, amount: value, method: 'transfer', note: 'Transfer confirmed (proof checked)' } }))) onDone()
  }
  async function notYet() {
    if (await run(() => dismissBookingProof({ data: { id, note: '' } }))) onDone()
  }
  return (
    <section className="admin-card space-y-3 border-amber-300 bg-amber-50/60 p-5">
      <h2 className="text-lg font-bold">Customer sent proof of payment</h2>
      <p className="text-sm text-[#475467]">Check your bank app that the money has arrived, then confirm the amount you received.</p>
      <div className="flex flex-wrap items-end gap-2">
        <a href={`/api/admin/booking-file/${id}/proof`} target="_blank" rel="noopener" className="btn btn-ghost !py-2.5 text-sm text-cocoa">View proof</a>
        <div>
          <label htmlFor="pc-amount" className="admin-label">Amount received (₦)</label>
          <input id="pc-amount" inputMode="numeric" className="admin-input w-40 tabular" value={show(value)} onChange={(e) => setValue(num(e.target.value))} />
        </div>
        <button type="button" className="btn btn-primary !py-2.5 text-sm" onClick={confirm} disabled={busy || value <= 0}>
          Confirm {kind === 'deposit' ? 'deposit' : 'payment'}
        </button>
        <button type="button" className="px-2 py-2.5 text-sm font-semibold text-[#667085] hover:text-red-700" onClick={notYet} disabled={busy}>
          Money not in yet
        </button>
      </div>
      <Messages error={error} />
    </section>
  )
}

function QuoteEditor({
  id,
  initialLines,
  initialDelivery,
  initialDeposit,
  initialMessage,
  depositPercent,
  hasQuote,
  onSaved,
}: {
  id: number
  initialLines: QuoteLine[]
  initialDelivery: number
  initialDeposit: number
  initialMessage: string
  depositPercent: number
  hasQuote: boolean
  onSaved: () => void
}) {
  const [items, setItems] = useState<QuoteLine[]>(initialLines.length ? initialLines : [{ description: '', qty: 1, price: 0 }])
  const [delivery, setDelivery] = useState(initialDelivery)
  const [deposit, setDeposit] = useState(initialDeposit)
  const [depositTouched, setDepositTouched] = useState(hasQuote)
  const [message, setMessage] = useState(initialMessage)
  const { busy, error, notice, run } = useAction()

  const total = items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0) + delivery
  const suggestedDeposit = Math.round((total * depositPercent) / 100 / 100) * 100 // to the nearest ₦100
  const shownDeposit = depositTouched ? deposit : suggestedDeposit
  const setItem = (n: number, patch: Partial<QuoteLine>) => setItems(items.map((i, idx) => (idx === n ? { ...i, ...patch } : i)))

  async function save() {
    const ok = await run(
      () => sendBookingQuote({ data: { id, lines: items, delivery_fee: delivery, deposit_amount: shownDeposit, message } }),
      hasQuote ? 'Quote updated. The customer sees the new price on their booking page.' : 'Quote sent. The customer can now see it and pay the deposit. Let them know on WhatsApp below.',
    )
    if (ok) onSaved()
  }

  return (
    <section className="admin-card space-y-4 p-5">
      <h2 className="text-lg font-bold">{hasQuote ? 'Quote' : 'Send a quote'}</h2>
      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_70px_130px_28px] gap-2 text-xs font-semibold uppercase tracking-wide text-[#667085] sm:grid">
          <span>Item</span>
          <span>Qty</span>
          <span>Price each (₦)</span>
          <span />
        </div>
        {items.map((it, n) => (
          <div key={n} className="grid grid-cols-[1fr_70px_110px_28px] gap-2 sm:grid-cols-[1fr_70px_130px_28px]">
            <input aria-label={`Item ${n + 1}`} className="admin-input" value={it.description} onChange={(e) => setItem(n, { description: e.target.value })} placeholder="e.g. 3-tier wedding cake" />
            <input aria-label={`Quantity ${n + 1}`} inputMode="numeric" className="admin-input tabular" value={it.qty || ''} onChange={(e) => setItem(n, { qty: num(e.target.value) })} />
            <input aria-label={`Price ${n + 1}`} inputMode="numeric" className="admin-input tabular" value={show(it.price)} onChange={(e) => setItem(n, { price: num(e.target.value) })} />
            <button type="button" aria-label="Remove item" className="flex items-center justify-center text-[#98a2b3] hover:text-red-700" onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== n) : [{ description: '', qty: 1, price: 0 }])}>
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setItems([...items, { description: '', qty: 1, price: 0 }])}>
          + Add item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="q-delivery" className="admin-label">Delivery (₦)</label>
          <input id="q-delivery" inputMode="numeric" className="admin-input tabular" value={show(delivery)} onChange={(e) => setDelivery(num(e.target.value))} placeholder="0 for pickup" />
        </div>
        <div>
          <label htmlFor="q-deposit" className="admin-label">Deposit to book the date (₦)</label>
          <input
            id="q-deposit"
            inputMode="numeric"
            className="admin-input tabular"
            value={show(shownDeposit)}
            onChange={(e) => {
              setDepositTouched(true)
              setDeposit(num(e.target.value))
            }}
          />
          <p className="admin-help">
            {depositTouched ? (
              <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setDepositTouched(false)}>
                Use {depositPercent}% ({formatNaira(suggestedDeposit)})
              </button>
            ) : (
              `${depositPercent}% of the total. Change it if you like.`
            )}
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="q-message" className="admin-label">Message with the quote (optional)</label>
        <textarea id="q-message" rows={3} className="admin-input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Price includes a cake stand and set-up at the venue. Balance due 3 days before the event." />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceff5] pt-4">
        <p className="text-lg font-bold tabular">Total {formatNaira(total)}</p>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy || total <= 0}>
          {busy ? 'Saving…' : hasQuote ? 'Update quote' : 'Send quote'}
        </button>
      </div>
      <Messages error={error} notice={notice} />
    </section>
  )
}

function Payments({
  id,
  quote,
  deposit,
  paid,
  suggested,
  payments,
  onChanged,
}: {
  id: number
  quote: number
  deposit: number
  paid: number
  suggested: number
  payments: { id: number; amount: number; method: string; note: string; created_at: string }[]
  onChanged: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ amount: suggested, method: 'transfer' as (typeof METHODS)[number]['key'], note: '' })
  const [removing, setRemoving] = useState<number | null>(null)
  const { busy, error, notice, run } = useAction()

  async function add() {
    const ok = await run(() => recordBookingPayment({ data: { id, ...form } }), 'Payment recorded.')
    if (ok) {
      setAdding(false)
      setForm({ amount: 0, method: 'transfer', note: '' })
      onChanged()
    }
  }
  async function remove(paymentId: number) {
    const ok = await run(() => deleteBookingPayment({ data: { bookingId: id, paymentId } }), 'Payment removed.')
    if (ok) {
      setRemoving(null)
      onChanged()
    }
  }

  return (
    <section className="admin-card space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">Payments</h2>
        {quote > 0 && (
          <p className="text-sm tabular">
            Paid <strong className="text-emerald-700">{formatNaira(paid)}</strong> of {formatNaira(quote)}
            {deposit > 0 && paid < deposit && <span className="text-[#667085]"> · deposit {formatNaira(deposit)}</span>}
          </p>
        )}
      </div>
      {quote > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-[#eceff5]">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, (paid / quote) * 100)}%` }} />
        </div>
      )}
      {payments.length > 0 ? (
        <ul className="divide-y divide-[#eceff5] text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-semibold tabular">{formatNaira(p.amount)}</span>
              <span className="text-[#667085]">{METHOD_LABEL[p.method] ?? p.method} · {formatDate(p.created_at)}</span>
              {p.note && <span className="text-xs text-[#98a2b3]">{p.note}</span>}
              <span className="ml-auto">
                {removing === p.id ? (
                  <span className="flex items-center gap-2">
                    Remove?
                    <button type="button" className="font-semibold text-red-700" onClick={() => remove(p.id)} disabled={busy}>Yes</button>
                    <button type="button" className="text-[#667085]" onClick={() => setRemoving(null)}>No</button>
                  </span>
                ) : (
                  <button type="button" className="text-xs text-[#98a2b3] hover:text-red-700" onClick={() => setRemoving(p.id)}>Remove</button>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#667085]">No payments yet.</p>
      )}
      {adding ? (
        <div className="grid gap-3 rounded-xl bg-[#f6f7fb] p-4 sm:grid-cols-[140px_150px_1fr]">
          <div>
            <label htmlFor="p-amount" className="admin-label">Amount (₦)</label>
            <input id="p-amount" inputMode="numeric" className="admin-input tabular" value={show(form.amount)} onChange={(e) => setForm({ ...form, amount: num(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="p-method" className="admin-label">Paid by</label>
            <select id="p-method" className="admin-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as typeof form.method })}>
              {METHODS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-note" className="admin-label">Note (optional)</label>
            <input id="p-note" className="admin-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Paid by her husband" />
          </div>
          <div className="flex gap-2 sm:col-span-3">
            <button type="button" className="btn btn-primary !py-2.5 text-sm" onClick={add} disabled={busy || form.amount <= 0}>Save payment</button>
            <button type="button" className="px-3 text-sm font-semibold text-[#667085]" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="text-sm font-semibold text-brand hover:underline"
          onClick={() => {
            setForm({ amount: suggested, method: 'transfer', note: '' })
            setAdding(true)
          }}
        >
          + Record a payment (transfer, cash or POS)
        </button>
      )}
      <Messages error={error} notice={notice} />
    </section>
  )
}

function PrivateNote({ id, initial }: { id: number; initial: string }) {
  const [note, setNote] = useState(initial)
  const { busy, error, notice, run } = useAction()
  return (
    <section className="admin-card space-y-3 p-5">
      <h2 className="text-lg font-bold">Private notes</h2>
      <p className="text-sm text-[#667085]">Only you and your staff see this.</p>
      <textarea aria-label="Private notes" rows={4} className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called her on Tuesday. Wants gold leaf on the top tier." />
      <button type="button" className="btn btn-ghost !py-2 text-sm text-cocoa" onClick={() => run(() => saveBookingNote({ data: { id, note } }), 'Saved.')} disabled={busy}>
        Save note
      </button>
      <Messages error={error} notice={notice} />
    </section>
  )
}
