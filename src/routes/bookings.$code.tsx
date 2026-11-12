import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { BookingTracker } from '~/components/BookingTracker'
import { CheckIcon, WhatsAppIcon } from '~/components/icons'
import { getMyBooking, payBookingByCard } from '~/fns/bookings'
import { formatNaira, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/bookings/$code')({
  validateSearch: (search: Record<string, unknown>): { paid?: boolean; new?: boolean } => ({
    ...(search.paid === true || search.paid === 1 || search.paid === '1' ? { paid: true } : {}),
    ...(search.new === true || search.new === 'true' ? { new: true } : {}),
  }),
  loaderDeps: ({ search }) => ({ paid: !!search.paid }),
  loader: ({ params, deps }) => getMyBooking({ data: { code: params.code, checkPayment: deps.paid } }),
  head: ({ params }) => ({ meta: [{ title: `Booking ${params.code} · Miel Cakes` }, { name: 'robots', content: 'noindex' }] }),
  component: BookingPage,
})

const niceDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '')
const METHOD = { transfer: 'Bank transfer', paystack: 'Card (Paystack)', cash: 'Cash', pos: 'POS' } as const

function BookingPage() {
  const s = root.useLoaderData()
  const data = Route.useLoaderData()
  const { new: isNew, paid: fromPaystack } = Route.useSearch()
  const { code } = Route.useParams()
  const router = useRouter()

  if (data.needLogin) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Booking {code}</h1>
        <p className="mt-3 text-muted">Sign in to see your booking.</p>
        <Link to="/login" search={{ redirect: `/bookings/${code}` }} className="btn btn-primary mt-8">Sign in</Link>
      </div>
    )
  }
  if (data.notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Booking not found</h1>
        <p className="mt-3 text-muted">We couldn&rsquo;t find booking {code} on your account.</p>
        <Link to="/account" className="btn btn-primary mt-8">Your account</Link>
      </div>
    )
  }

  const { booking: b, lines, events, payments, due, pay } = data
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, about my event booking ${b.code} (${b.event_type}, ${niceDate(b.event_date)}): `)
  const hasQuote = b.quote_amount > 0 && !['requested'].includes(b.status)
  const itemsTotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
      {isNew && (
        <div className="mb-6 rounded-3xl bg-honey p-6 sm:p-8" role="status">
          <p className="font-display text-3xl">Request sent. Thank you, {b.customer_name?.split(' ')[0]}!</p>
          <p className="mt-2 text-cocoa/85">
            We&rsquo;ll look at your booking <strong>{b.code}</strong> and send your quote, usually within a day. It will appear on this page,
            and we&rsquo;ll let you know on WhatsApp.
          </p>
        </div>
      )}
      {fromPaystack && due.kind !== 'none' && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-5 py-4 text-amber-900">
          We haven&rsquo;t received confirmation of your card payment yet. If you were charged, it will update in a few minutes. Refresh this page, or message us.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Event booking</p>
          <h1 className="font-display text-4xl sm:text-5xl">{b.code}</h1>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost text-cocoa">
            <WhatsAppIcon /> Ask about this booking
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <BookingTracker booking={b} events={events} />

          {b.status === 'requested' && (
            <div className="rounded-3xl bg-soft p-6">
              <h2 className="font-display text-2xl">Waiting for your quote</h2>
              <p className="mt-2 text-cocoa/80">
                We&rsquo;re working out the price for your event. Nothing to pay yet. Want to add a picture or change something? Message us on WhatsApp.
              </p>
              {!b.reference_image && <ReferenceUpload code={b.code} onDone={() => router.invalidate()} />}
            </div>
          )}

          {hasQuote && (
            <section className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
              <h2 className="font-display text-2xl">Your quote</h2>
              {b.quote_message && <p className="mt-3 whitespace-pre-line rounded-2xl bg-soft p-4 text-cocoa/85">{b.quote_message}</p>}
              <ul className="mt-4 space-y-2 text-sm">
                {lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span><strong>{l.qty} ×</strong> {l.description}</span>
                    <span className="tabular">{formatNaira(l.qty * l.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-line pt-4 tabular">
                <div className="flex justify-between text-sm"><span className="text-muted">Items</span><span>{formatNaira(itemsTotal)}</span></div>
                {b.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Delivery</span><span>{formatNaira(b.delivery_fee)}</span></div>}
                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatNaira(b.quote_amount)}</span></div>
                {b.deposit_amount > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Deposit to book your date</span><span>{formatNaira(b.deposit_amount)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-muted">Paid so far</span><span className="font-semibold text-emerald-700">{formatNaira(b.paid_amount)}</span></div>
                {b.quote_amount > b.paid_amount && (
                  <div className="flex justify-between text-sm"><span className="text-muted">Balance</span><span className="font-semibold">{formatNaira(b.quote_amount - b.paid_amount)}</span></div>
                )}
              </div>
            </section>
          )}

          {due.kind !== 'none' && (
            <PayBox
              code={b.code}
              due={due}
              proofPending={!!b.proof_pending}
              canCard={pay.paystack}
              onChanged={() => router.invalidate()}
            />
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="font-display text-2xl">Your event</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Occasion" value={b.event_type} />
            <Row label="Date" value={`${niceDate(b.event_date)}${b.event_time ? `, ${b.event_time}` : ''}`} />
            <Row label="Guests" value={String(b.guests)} />
            <Row label={b.fulfilment === 'delivery' ? 'Venue' : b.own_rider ? 'Your rider collects from' : 'Pickup'} value={b.fulfilment === 'delivery' ? `${b.address}${b.zone_name ? `, ${b.zone_name}` : ''}` : s.address} />
            <Row label="Phone" value={b.contact_phone} />
          </dl>
          {(b.items_wanted || b.details) && (
            <div className="space-y-2 border-t border-line pt-4 text-sm">
              {b.items_wanted && <p><span className="text-muted">You asked for:</span> <span className="font-semibold">{b.items_wanted}</span></p>}
              {b.details && <p className="whitespace-pre-line rounded-2xl bg-soft p-3">{b.details}</p>}
              {b.reference_image && <p className="text-muted"><CheckIcon className="mr-1 inline h-4 w-4 align-[-3px]" />Picture received</p>}
            </div>
          )}
          {payments.length > 0 && (
            <div className="border-t border-line pt-4 text-sm">
              <h3 className="font-semibold">Payments</h3>
              <ul className="mt-2 space-y-1">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-muted">{new Date(p.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} · {METHOD[p.method] ?? p.method}</span>
                    <span className="tabular font-semibold">{formatNaira(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link to="/account" className="block text-center text-sm font-semibold text-muted hover:text-brand">Your orders & bookings</Link>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}

function ReferenceUpload({ code, onDone }: { code: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(f: File | undefined) {
    if (!f) return
    setBusy(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch(`/api/bookings/reference?code=${encodeURIComponent(code)}`, { method: 'POST', body })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !d.ok) throw new Error(d.error || 'Upload failed. Try again.')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-4">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <button type="button" className="btn btn-ghost !py-2.5 text-sm text-cocoa" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'Uploading…' : 'Add a picture of what you want'}
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-highlight">{error}</p>}
    </div>
  )
}

function PayBox({
  code,
  due,
  proofPending,
  canCard,
  onChanged,
}: {
  code: string
  due: { kind: 'deposit' | 'balance'; amount: number; full: number }
  proofPending: boolean
  canCard: boolean
  onChanged: () => void
}) {
  const s = root.useLoaderData()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const isDeposit = due.kind === 'deposit'
  const proofWa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, here is my proof of payment for event booking ${code}.`)

  async function payByCard(full: boolean) {
    setBusy(full ? 'full' : 'card')
    setError('')
    try {
      const { payUrl } = await payBookingByCard({ data: { code, full } })
      window.location.href = payUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start card payment.')
      setBusy('')
    }
  }
  async function upload(f: File | undefined) {
    if (!f) return
    setBusy('upload')
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch(`/api/bookings/proof?code=${encodeURIComponent(code)}`, { method: 'POST', body })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !d.ok) throw new Error(d.error || 'Upload failed. Try again.')
      setNotice('Thank you! We’ve received your proof of payment and will confirm it shortly.')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    } finally {
      setBusy('')
      if (file.current) file.current.value = ''
    }
  }

  return (
    <div className="space-y-4 rounded-3xl bg-soft p-6">
      <h2 className="font-display text-2xl">
        {proofPending ? 'We’re checking your payment' : isDeposit ? 'Pay your deposit to book the date' : 'Pay your balance'}
      </h2>
      {proofPending ? (
        <p className="text-cocoa/80">We&rsquo;ve received your proof of payment and will confirm it shortly. Uploaded the wrong file? Upload again below.</p>
      ) : (
        <p className="text-cocoa/80">
          {isDeposit ? (
            <>
              Pay the deposit of <strong className="tabular">{formatNaira(due.amount)}</strong> to secure your date
              {due.full > due.amount ? <>, or the full <strong className="tabular">{formatNaira(due.full)}</strong> at once</> : ''}.
            </>
          ) : (
            <>Please pay the balance of <strong className="tabular">{formatNaira(due.amount)}</strong> before your event.</>
          )}
        </p>
      )}

      {canCard && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => payByCard(false)} className="btn btn-primary" disabled={!!busy}>
            {busy === 'card' ? 'Opening Paystack…' : `Pay ${formatNaira(due.amount)} by card`}
          </button>
          {isDeposit && due.full > due.amount && (
            <button type="button" onClick={() => payByCard(true)} className="btn btn-ghost text-cocoa" disabled={!!busy}>
              {busy === 'full' ? 'Opening Paystack…' : `Pay all ${formatNaira(due.full)}`}
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-line">
        <p className="text-sm font-semibold">{canCard ? 'Or pay by bank transfer' : 'Pay by bank transfer'}</p>
        {s.bank_account_number ? (
          <>
            <p className="mt-1 text-sm text-muted">{s.bank_name}</p>
            <p className="font-display text-2xl tabular select-all">{s.bank_account_number}</p>
            {s.bank_account_name && <p className="text-sm text-muted">{s.bank_account_name}</p>}
            <p className="mt-2 text-sm">Use <strong>{code}</strong> as the transfer description, then upload your screenshot or receipt.</p>
          </>
        ) : (
          <p className="mt-1 text-sm">Message us on WhatsApp for our account details.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" onClick={() => file.current?.click()} className={`btn ${canCard ? 'btn-ghost text-cocoa' : 'btn-primary'}`} disabled={!!busy}>
          {busy === 'upload' ? 'Uploading…' : proofPending ? 'Upload again' : 'Upload proof of payment'}
        </button>
        {proofWa && (
          <a href={proofWa} target="_blank" rel="noopener" className="btn btn-ghost text-cocoa">
            <WhatsAppIcon /> Or send on WhatsApp
          </a>
        )}
      </div>
      {notice && <p role="status" className="text-sm font-semibold text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-highlight">{error}</p>}
    </div>
  )
}
