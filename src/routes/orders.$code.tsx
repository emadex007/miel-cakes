import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { OrderTracker } from '~/components/OrderTracker'
import { CheckIcon, StarIcon, WhatsAppIcon } from '~/components/icons'
import { getMyOrder, retryCardPayment, submitOrderReview, switchToTransfer } from '~/fns/shop'
import { CustomDetails } from '~/components/CakeCustomizer'
import { describeCustom } from '~/lib/custom'
import { formatNaira, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/orders/$code')({
  validateSearch: (search: Record<string, unknown>): { paid?: boolean; new?: boolean } => ({
    ...(search.paid === true || search.paid === 1 || search.paid === '1' ? { paid: true } : {}),
    ...(search.new === true || search.new === 'true' ? { new: true } : {}),
  }),
  loaderDeps: ({ search }) => ({ paid: !!search.paid }),
  loader: ({ params, deps }) => getMyOrder({ data: { code: params.code, checkPayment: deps.paid } }),
  head: ({ params }) => ({ meta: [{ title: `Order ${params.code} · Miel Cakes` }, { name: 'robots', content: 'noindex' }] }),
  component: OrderPage,
})

const niceDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' }) : '')

function OrderPage() {
  const s = root.useLoaderData()
  const data = Route.useLoaderData()
  const { new: isNew, paid: fromPaystack } = Route.useSearch()
  const { code } = Route.useParams()
  const router = useRouter()

  if (data.needLogin) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Order {code}</h1>
        <p className="mt-3 text-muted">Sign in to see this order, or track it with your order number and phone.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" search={{ redirect: `/orders/${code}` }} className="btn btn-primary">Sign in</Link>
          <Link to="/track" className="btn btn-ghost text-cocoa">Track without signing in</Link>
        </div>
      </div>
    )
  }
  if (data.notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Order not found</h1>
        <p className="mt-3 text-muted">We couldn&rsquo;t find order {code} on your account.</p>
        <Link to="/account" className="btn btn-primary mt-8">Your orders</Link>
      </div>
    )
  }

  const { order, items, events, pay, myReview } = data
  const unpaid = order.payment_status !== 'paid' && order.status !== 'cancelled'
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, about my order ${order.code}: `)

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
      {isNew && (
        <div className="mb-6 rounded-3xl bg-honey p-6 sm:p-8" role="status">
          <p className="font-display text-3xl">Thank you, {order.customer_name?.split(' ')[0]}!</p>
          <p className="mt-2 text-cocoa/85">
            Your order <strong>{order.code}</strong> has been placed.
            {unpaid && order.payment_method === 'transfer' ? ' Next, pay by transfer and upload your proof of payment below.' : ''}
          </p>
        </div>
      )}
      {fromPaystack && unpaid && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-5 py-4 text-amber-900">
          We haven&rsquo;t received confirmation of your card payment yet. If you were charged, it will update in a few minutes.
          Refresh this page, or message us.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Order</p>
          <h1 className="font-display text-4xl sm:text-5xl">{order.code}</h1>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost text-cocoa">
            <WhatsAppIcon /> Ask about this order
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <OrderTracker status={order.status} fulfilment={order.fulfilment} events={events} />
          {order.status === 'completed' && <ReviewBox code={order.code} existing={myReview} onDone={() => router.invalidate()} />}
          {unpaid && (
            <PayBox
              code={order.code}
              total={order.total}
              method={order.payment_method}
              hasProof={!!order.proof_key}
              canCard={pay.paystack}
              onChanged={() => router.invalidate()}
            />
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="font-display text-2xl">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">Date</dt><dd className="text-right font-semibold">{niceDate(order.needed_date)}{order.time_slot && <span className="block font-normal text-muted">{order.time_slot}</span>}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{order.fulfilment === 'delivery' ? 'Delivery to' : 'Pickup'}</dt>
              <dd className="text-right font-semibold">{order.fulfilment === 'delivery' ? `${order.address}${order.zone_name ? `, ${order.zone_name}` : ''}` : s.address}</dd>
            </div>
            <div className="flex justify-between gap-3"><dt className="text-muted">Phone</dt><dd className="font-semibold tabular">{order.contact_phone}</dd></div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Payment</dt>
              <dd className="font-semibold">{order.payment_status === 'paid' ? <span className="inline-flex items-center gap-1 text-emerald-700">Paid <CheckIcon /></span> : order.payment_method === 'paystack' ? 'Card (not paid yet)' : 'Bank transfer'}</dd>
            </div>
          </dl>
          <ul className="space-y-2 border-t border-line pt-4 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold">{i.qty} × {i.name}</span>
                  <span className="block text-muted">{i.option_label}</span>
                  {i.note && <span className="block italic text-cocoa/70">&ldquo;{i.note}&rdquo;</span>}
                  <CustomDetails rows={describeCustom(i.custom_json)} refUrl={i.ref_key ? `/api/my/ref/o-${i.id}` : undefined} />
                </span>
                <span className="tabular">{formatNaira(i.unit_price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-line pt-4 tabular">
            <div className="flex justify-between text-sm"><span className="text-muted">Items</span><span>{formatNaira(order.subtotal)}</span></div>
            {order.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Delivery</span><span>{formatNaira(order.delivery_fee)}</span></div>}
            {order.discount > 0 && <div className="flex justify-between text-sm text-emerald-700"><span>Discount ({order.discount_code})</span><span>−{formatNaira(order.discount)}</span></div>}
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatNaira(order.total)}</span></div>
          </div>
          {order.note && <p className="rounded-2xl bg-soft p-3 text-sm">Your note: {order.note}</p>}
          <Link to="/account" className="block text-center text-sm font-semibold text-muted hover:text-brand">All your orders</Link>
        </aside>
      </div>
    </div>
  )
}

function PayBox({
  code,
  total,
  method,
  hasProof,
  canCard,
  onChanged,
}: {
  code: string
  total: number
  method: 'paystack' | 'transfer'
  hasProof: boolean
  canCard: boolean
  onChanged: () => void
}) {
  const s = root.useLoaderData()
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const proofWa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, here is my proof of payment for order ${code} (${formatNaira(total)}).`)

  async function payByCard() {
    setBusy('card')
    setError('')
    try {
      const { payUrl } = await retryCardPayment({ data: code })
      window.location.href = payUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start card payment.')
      setBusy('')
    }
  }
  async function useTransfer() {
    setBusy('transfer')
    await switchToTransfer({ data: code })
    setBusy('')
    onChanged()
  }
  async function upload(f: File | undefined) {
    if (!f) return
    setBusy('upload')
    setError('')
    setNotice('')
    try {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch(`/api/orders/proof?code=${encodeURIComponent(code)}`, { method: 'POST', body })
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !d.ok) throw new Error(d.error || 'Upload failed. Try again.')
      setNotice('Thank you! We’ve received your proof of payment and will confirm your order shortly.')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    } finally {
      setBusy('')
      if (file.current) file.current.value = ''
    }
  }

  if (method === 'paystack') {
    return (
      <div className="space-y-4 rounded-3xl bg-soft p-6">
        <h2 className="font-display text-2xl">Complete your payment</h2>
        <p className="text-cocoa/80">Your order is waiting for payment of <strong className="tabular">{formatNaira(total)}</strong>.</p>
        <div className="flex flex-wrap gap-3">
          {canCard && (
            <button type="button" onClick={payByCard} className="btn btn-primary" disabled={!!busy}>
              {busy === 'card' ? 'Opening Paystack…' : `Pay ${formatNaira(total)} now`}
            </button>
          )}
          <button type="button" onClick={useTransfer} className="btn btn-ghost text-cocoa" disabled={!!busy}>
            Pay by bank transfer instead
          </button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-highlight">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-3xl bg-soft p-6">
      <h2 className="font-display text-2xl">{hasProof ? 'We’re checking your payment' : 'Pay by bank transfer'}</h2>
      {hasProof ? (
        <p className="text-cocoa/80">We&rsquo;ve received your proof of payment. We&rsquo;ll confirm your order shortly. Uploaded the wrong file? Upload again below.</p>
      ) : (
        <p className="text-cocoa/80">Transfer <strong className="tabular">{formatNaira(total)}</strong> to the account below, then upload your screenshot or receipt.</p>
      )}
      {s.bank_account_number ? (
        <div className="rounded-2xl bg-white px-5 py-4 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">{s.bank_name}</p>
          <p className="font-display text-2xl tabular select-all">{s.bank_account_number}</p>
          {s.bank_account_name && <p className="text-sm text-muted">{s.bank_account_name}</p>}
          <p className="mt-2 text-sm">Use <strong>{code}</strong> as the transfer description.</p>
        </div>
      ) : (
        <p className="rounded-2xl bg-white px-5 py-4 text-sm ring-1 ring-line">Message us on WhatsApp for our account details.</p>
      )}
      <div className="flex flex-wrap gap-3">
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" onClick={() => file.current?.click()} className="btn btn-primary" disabled={!!busy}>
          {busy === 'upload' ? 'Uploading…' : hasProof ? 'Upload again' : 'Upload proof of payment'}
        </button>
        {proofWa && (
          <a href={proofWa} target="_blank" rel="noopener" className="btn btn-ghost text-cocoa">
            <WhatsAppIcon /> Or send on WhatsApp
          </a>
        )}
        {canCard && (
          <button type="button" onClick={payByCard} className="btn btn-ghost text-cocoa" disabled={!!busy}>
            Pay by card instead
          </button>
        )}
      </div>
      {notice && <p role="status" className="text-sm font-semibold text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="text-sm font-semibold text-highlight">{error}</p>}
    </div>
  )
}

/** "Rate your order" once it's delivered or collected. */
function ReviewBox({ code, existing, onDone }: { code: string; existing: { rating: number; body: string; is_visible: number } | null; onDone: () => void }) {
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (existing) {
    return (
      <div id="review" className="scroll-mt-28 rounded-3xl bg-honey p-6">
        <h2 className="font-display text-2xl">Thank you for your review!</h2>
        <p className="mt-2 flex items-center gap-1 text-brand" aria-label={`${existing.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon key={n} filled={n <= existing.rating} className="h-5 w-5" />
          ))}
        </p>
        <p className="mt-2 text-cocoa/80">&ldquo;{existing.body}&rdquo;</p>
        <p className="mt-2 text-sm text-muted">{existing.is_visible ? 'It’s on our website now.' : 'It will appear on our website once we’ve had a look.'}</p>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await submitOrderReview({ data: { code, rating, body } })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your review. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form id="review" onSubmit={submit} className="scroll-mt-28 space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
      <div>
        <h2 className="font-display text-2xl">How was your order?</h2>
        <p className="mt-1 text-muted">Your review helps other customers, and helps us bake even better.</p>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={n === rating}
              className={`rounded-xl p-1.5 transition ${n <= rating ? 'text-accent' : 'text-line'} hover:scale-110`}
            >
              <StarIcon filled={n <= rating} className="h-8 w-8" />
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="rv-body" className="mb-1.5 block text-sm font-semibold">Your review</label>
        <textarea
          id="rv-body"
          rows={3}
          maxLength={1200}
          required
          className="w-full rounded-2xl border-0 bg-cream px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand"
          placeholder="How did it taste and look? Was it on time?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-highlight">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send review'}</button>
    </form>
  )
}
