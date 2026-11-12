import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BookingTracker } from '~/components/BookingTracker'
import { OrderTracker } from '~/components/OrderTracker'
import { formatNaira } from '~/lib/format'
import { trackOrder } from '~/fns/shop'

export const Route = createFileRoute('/track')({
  validateSearch: (search: Record<string, unknown>): { code?: string } =>
    typeof search.code === 'string' && search.code ? { code: search.code.slice(0, 20) } : {},
  head: () => ({ meta: [{ title: 'Track your order or booking · Miel Cakes' }] }),
  component: TrackPage,
})

type Result = Awaited<ReturnType<typeof trackOrder>>

function TrackPage() {
  const search = Route.useSearch()
  const [code, setCode] = useState(search.code ?? '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setResult(await trackOrder({ data: { code, phone } }))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Track your order</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Where&rsquo;s my cake?</h1>
      <p className="mt-3 text-muted">
        Enter your order number (like MC-1042) or event booking number (like MB-1003), and the phone number you used.{' '}
        <Link to="/account" className="font-semibold text-brand hover:underline">Signed in? See all your orders.</Link>
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-3xl bg-soft p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="t-code" className="mb-1.5 block text-sm font-semibold">Order or booking number</label>
          <input id="t-code" required className={`${input} uppercase`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="MC-1042" />
        </div>
        <div>
          <label htmlFor="t-phone" className="mb-1.5 block text-sm font-semibold">Phone number</label>
          <input id="t-phone" type="tel" required className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0801 234 5678" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Checking…' : 'Track'}</button>
      </form>

      {error && <p role="alert" className="mt-6 rounded-2xl bg-highlight/10 px-4 py-3 font-semibold text-highlight">{error}</p>}

      {result?.kind === 'order' && (
        <div className="mt-8 space-y-4">
          <h2 className="font-display text-3xl">Order {result.code}</h2>
          <p className="text-muted">
            {result.fulfilment === 'delivery' ? `Delivery${result.zone_name ? ` to ${result.zone_name}` : ''}` : 'Pickup'} on{' '}
            {new Date(`${result.needed_date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
            {result.time_slot ? `, ${result.time_slot}` : ''}
          </p>
          <OrderTracker status={result.status} fulfilment={result.fulfilment} events={result.events} />
          <ul className="rounded-3xl bg-white p-6 text-sm ring-1 ring-line">
            {result.items.map((i, n) => (
              <li key={n} className="py-1">
                <strong>{i.qty} ×</strong> {i.name} <span className="text-muted">({i.option_label})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.kind === 'booking' && (
        <div className="mt-8 space-y-4">
          <h2 className="font-display text-3xl">Event booking {result.code}</h2>
          <p className="text-muted">
            {result.event_type} for {result.guests} guests on{' '}
            {new Date(`${result.event_date}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
            {result.event_time ? `, ${result.event_time}` : ''}
            {result.fulfilment === 'delivery' ? ` · delivery${result.zone_name ? ` to ${result.zone_name}` : ''}` : ' · pickup'}
          </p>
          <BookingTracker booking={result} events={result.events} />
          {result.quote_amount > 0 && (
            <dl className="space-y-1 rounded-3xl bg-white p-6 text-sm ring-1 ring-line tabular">
              <div className="flex justify-between"><dt className="text-muted">Quote</dt><dd className="font-semibold">{formatNaira(result.quote_amount)}</dd></div>
              {result.deposit_amount > 0 && <div className="flex justify-between"><dt className="text-muted">Deposit</dt><dd>{formatNaira(result.deposit_amount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Paid so far</dt><dd className="font-semibold text-emerald-700">{formatNaira(result.paid_amount)}</dd></div>
              {result.quote_amount > result.paid_amount && (
                <div className="flex justify-between"><dt className="text-muted">Balance</dt><dd className="font-semibold">{formatNaira(result.quote_amount - result.paid_amount)}</dd></div>
              )}
            </dl>
          )}
          <Link to="/bookings/$code" params={{ code: result.code }} className="btn btn-primary">
            See the full quote and pay
          </Link>
        </div>
      )}
    </div>
  )
}
