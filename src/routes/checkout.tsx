import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useShop } from '~/components/Shop'
import { checkDiscount, getCheckout, placeOrder, type PlaceOrderInput } from '~/fns/shop'
import { customOneLine } from '~/lib/custom'
import { formatNaira } from '~/lib/format'
import { GiftIcon } from '~/components/icons'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/checkout')({
  loader: () => getCheckout(),
  head: () => ({ meta: [{ title: 'Checkout · Miel Cakes' }] }),
  component: CheckoutPage,
})

const niceDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long' })

function CheckoutPage() {
  const s = root.useLoaderData()
  const data = Route.useLoaderData()
  const router = useRouter()
  const { refresh } = useShop()

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Checkout</h1>
        <p className="mt-3 text-muted">Please sign in to check out.</p>
        <Link to="/login" search={{ redirect: '/checkout' }} className="btn btn-primary mt-8">Sign in</Link>
      </div>
    )
  }
  if (!data.lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <Link to="/menu" className="btn btn-primary mt-8">See the menu</Link>
      </div>
    )
  }
  return <CheckoutForm key={data.me.id} data={data} bank={s} onDone={async (code) => {
    await refresh()
    router.navigate({ to: '/orders/$code', params: { code }, search: { new: true } })
  }} />
}

function CheckoutForm({
  data,
  bank,
  onDone,
}: {
  data: NonNullable<ReturnType<typeof Route.useLoaderData>>
  bank: Record<string, string>
  onDone: (code: string) => Promise<void>
}) {
  const { lines, zones, blocked, pay, minDate, maxNotice, me, slots } = data
  const [form, setForm] = useState<PlaceOrderInput>({
    fulfilment: 'pickup',
    zone_id: null,
    address: '',
    contact_phone: me.phone,
    needed_date: minDate,
    time_slot: '',
    discount_code: '',
    note: '',
    payment_method: pay.paystack ? 'paystack' : 'transfer',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof PlaceOrderInput>(k: K, v: PlaceOrderInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
  const zone = zones.find((z) => z.id === form.zone_id)
  const deliveryFee = form.fulfilment === 'delivery' && zone ? zone.fee : 0
  const [codeInput, setCodeInput] = useState('')
  const [applied, setApplied] = useState<{ code: string; amount: number; label: string } | null>(null)
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeError, setCodeError] = useState('')
  const discount = applied ? Math.min(applied.amount, subtotal) : 0
  const total = subtotal + deliveryFee - discount

  async function applyCode() {
    if (!codeInput.trim()) return
    setCodeBusy(true)
    setCodeError('')
    try {
      const r = await checkDiscount({ data: codeInput })
      setApplied(r)
      set('discount_code', r.code)
    } catch (err) {
      setApplied(null)
      set('discount_code', '')
      setCodeError(err instanceof Error ? err.message : 'That code isn’t valid.')
    } finally {
      setCodeBusy(false)
    }
  }
  function removeCode() {
    setApplied(null)
    setCodeInput('')
    set('discount_code', '')
  }
  const blockedSet = useMemo(() => new Map(blocked.map((b) => [b.date, b.reason])), [blocked])
  const dateBlocked = blockedSet.has(form.needed_date)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.fulfilment === 'delivery' && !form.zone_id) return setError('Please choose your delivery area.')
    if (dateBlocked) return setError('We’re fully booked on that date. Please choose another.')
    if (slots.length && !form.time_slot) return setError('Please choose a time for your order.')
    setBusy(true)
    try {
      const r = await placeOrder({ data: { ...form, zone_id: form.fulfilment === 'delivery' ? form.zone_id : null } })
      if (r.payUrl) {
        window.location.href = r.payUrl // off to Paystack; they come back to the order page
        return
      }
      await onDone(r.code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
  const label = 'mb-1.5 block text-sm font-semibold'
  const choice = (on: boolean) =>
    `flex-1 cursor-pointer rounded-2xl px-4 py-3 text-center font-semibold ring-1 transition ${on ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <h1 className="font-display text-4xl sm:text-5xl">Checkout</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-3xl bg-soft p-6">
            <h2 className="font-display text-2xl">1. Pickup or delivery</h2>
            <div className="flex gap-2">
              <label className={choice(form.fulfilment === 'pickup')}>
                <input type="radio" name="fulfilment" className="sr-only" checked={form.fulfilment === 'pickup'} onChange={() => set('fulfilment', 'pickup')} />
                Pickup (free)
              </label>
              <label className={choice(form.fulfilment === 'delivery')}>
                <input type="radio" name="fulfilment" className="sr-only" checked={form.fulfilment === 'delivery'} onChange={() => set('fulfilment', 'delivery')} />
                Delivery
              </label>
            </div>
            {form.fulfilment === 'pickup' ? (
              bank.address && <p className="text-sm text-cocoa/80">Pick up from: <span className="whitespace-pre-line font-semibold">{bank.address}</span></p>
            ) : (
              <div className="grid gap-4">
                <div>
                  <label htmlFor="co-zone" className={label}>Delivery area</label>
                  <select id="co-zone" className={input} value={form.zone_id ?? ''} onChange={(e) => set('zone_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Choose your area</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}: {formatNaira(z.fee)}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">Area not listed? Message us on WhatsApp before ordering.</p>
                </div>
                <div>
                  <label htmlFor="co-address" className={label}>Full delivery address</label>
                  <textarea id="co-address" rows={2} className={input} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="House number, street, landmark" />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-3xl bg-soft p-6">
            <h2 className="font-display text-2xl">2. When do you need it?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="co-date" className={label}>Date</label>
                <input id="co-date" type="date" required min={minDate} className={input} value={form.needed_date} onChange={(e) => set('needed_date', e.target.value)} />
                <p className="mt-1 text-xs text-muted">
                  Earliest: {niceDate(minDate)}
                  {maxNotice > 0 ? ` (${maxNotice} days’ notice for some items)` : ''}
                </p>
                {dateBlocked && (
                  <p className="mt-1 text-sm font-semibold text-highlight">
                    Fully booked{blockedSet.get(form.needed_date) ? `: ${blockedSet.get(form.needed_date)}` : ''}. Please pick another date.
                  </p>
                )}
              </div>
              {slots.length > 0 && (
                <div>
                  <label htmlFor="co-slot" className={label}>{form.fulfilment === 'delivery' ? 'Delivery time' : 'Pickup time'}</label>
                  <select id="co-slot" required className={input} value={form.time_slot} onChange={(e) => set('time_slot', e.target.value)}>
                    <option value="">Choose a time</option>
                    {slots.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="co-phone" className={label}>Phone on the day</label>
                <input id="co-phone" type="tel" required className={input} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="co-note" className={label}>Note for us (optional)</label>
              <textarea id="co-note" rows={2} className={input} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Deliver before 2pm, call the gate man" />
            </div>
          </section>

          <section className="space-y-4 rounded-3xl bg-soft p-6">
            <h2 className="font-display text-2xl">3. Payment</h2>
            <div className="grid gap-2">
              {pay.paystack && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ${form.payment_method === 'paystack' ? 'ring-2 ring-brand' : 'ring-line'}`}>
                  <input type="radio" name="pay" className="mt-1 accent-[var(--c-primary)]" checked={form.payment_method === 'paystack'} onChange={() => set('payment_method', 'paystack')} />
                  <span>
                    <span className="block font-semibold">Pay now by card, bank or USSD (Paystack)</span>
                    <span className="text-sm text-muted">Secure. Your order is confirmed as soon as payment goes through.</span>
                  </span>
                </label>
              )}
              {pay.transfer && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ${form.payment_method === 'transfer' ? 'ring-2 ring-brand' : 'ring-line'}`}>
                  <input type="radio" name="pay" className="mt-1 accent-[var(--c-primary)]" checked={form.payment_method === 'transfer'} onChange={() => set('payment_method', 'transfer')} />
                  <span>
                    <span className="block font-semibold">Bank transfer</span>
                    <span className="text-sm text-muted">
                      Transfer to {bank.bank_name ? `${bank.bank_name} ${bank.bank_account_number}` : 'our account'} after placing your order, then
                      upload your proof of payment. We start once it&rsquo;s confirmed.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line lg:sticky lg:top-28">
          <h2 className="font-display text-2xl">Your order</h2>
          <ul className="space-y-3">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold">{l.qty} × {l.name}</span>
                  <span className="block text-muted">{l.option_label}{customOneLine(l.custom_json) ? ` · ${customOneLine(l.custom_json)}` : ''}</span>
                </span>
                <span className="tabular">{formatNaira(l.unit_price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-line pt-4 tabular">
            <div className="flex justify-between"><span className="text-muted">Items</span><span>{formatNaira(subtotal)}</span></div>
            <div className="flex justify-between">
              <span className="text-muted">Delivery{zone && form.fulfilment === 'delivery' ? ` (${zone.name})` : ''}</span>
              <span>{form.fulfilment === 'delivery' ? (zone ? formatNaira(deliveryFee) : 'Choose area') : 'Free pickup'}</span>
            </div>
            {applied && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({applied.code}, {applied.label})</span>
                <span>−{formatNaira(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 text-xl font-bold"><span>Total</span><span>{formatNaira(total)}</span></div>
          </div>
          <div className="border-t border-line pt-4">
            {applied ? (
              <p className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-emerald-700">Code {applied.code} applied</span>
                <button type="button" onClick={removeCode} className="font-semibold text-muted hover:text-highlight">Remove</button>
              </p>
            ) : (
              <>
                <label htmlFor="co-code" className="mb-1.5 block text-sm font-semibold">Discount code</label>
                <div className="flex gap-2">
                  <input
                    id="co-code"
                    className="min-w-0 flex-1 rounded-2xl border-0 bg-cream px-4 py-2.5 uppercase ring-1 ring-line focus:ring-2 focus:ring-brand"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        applyCode()
                      }
                    }}
                    placeholder="e.g. XMAS10"
                  />
                  <button type="button" onClick={applyCode} disabled={codeBusy || !codeInput.trim()} className="btn btn-ghost !px-4 !py-2 text-sm text-cocoa">
                    {codeBusy ? '…' : 'Apply'}
                  </button>
                </div>
                {codeError && <p role="alert" className="mt-1.5 text-xs font-semibold text-highlight">{codeError}</p>}
              </>
            )}
          </div>
          {bank.perk_text && <p className="rounded-2xl bg-honey px-4 py-3 text-center text-sm font-semibold"><GiftIcon className="mr-1.5 inline h-4 w-4 align-[-3px]" />{bank.perk_text}</p>}
          {error && <p role="alert" className="rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
          <button type="submit" className="btn btn-primary w-full !py-4 text-base" disabled={busy}>
            {busy ? 'Placing your order…' : form.payment_method === 'paystack' ? `Pay ${formatNaira(total)}` : 'Place order'}
          </button>
          <p className="text-center text-xs text-muted">
            By ordering you agree to our <Link to="/terms" className="underline">terms & refunds</Link>.
          </p>
        </aside>
      </form>
    </div>
  )
}
