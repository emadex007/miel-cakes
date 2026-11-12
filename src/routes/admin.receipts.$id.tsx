import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, PageTitle, useAction } from '~/components/admin/ui'
import { PAYMENT_METHODS, ReceiptSheet } from '~/components/ReceiptSheet'
import { ArrowLeftIcon, CloseIcon, WhatsAppIcon } from '~/components/icons'
import { deleteReceipt, getReceiptAdmin, saveReceipt, type ReceiptInput } from '~/fns/business'
import { customOneLine } from '~/lib/custom'
import { formatNaira, toIntlPhone, whatsappLink } from '~/lib/format'
import type { Receipt } from '~/lib/types'
import { DatePicker } from '~/components/DatePicker'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/admin/receipts/$id')({
  validateSearch: (search: Record<string, unknown>): { quote?: number; client?: number; order?: number; booking?: number; edit?: boolean } => ({
    ...(Number(search.order) > 0 ? { order: Number(search.order) } : {}),
    ...(Number(search.booking) > 0 ? { booking: Number(search.booking) } : {}),
    ...(Number(search.quote) > 0 ? { quote: Number(search.quote) } : {}),
    ...(Number(search.client) > 0 ? { client: Number(search.client) } : {}),
    ...(search.edit === true || search.edit === 'true' ? { edit: true } : {}),
  }),
  loaderDeps: ({ search }) => ({ quote: search.quote, client: search.client, order: search.order, booking: search.booking }),
  loader: ({ params, deps }) =>
    getReceiptAdmin({ data: { id: params.id, quoteId: deps.quote, clientId: deps.client, orderId: deps.order, bookingId: deps.booking } }),
  component: ReceiptPage,
})

function ReceiptPage() {
  const data = Route.useLoaderData()
  const { edit } = Route.useSearch()
  if (!data.receipt || edit) return <ReceiptEditor />
  return <ReceiptView r={data.receipt} />
}

// ------------------------------------------------------------------
// View + send
// ------------------------------------------------------------------
function ReceiptView({ r }: { r: Receipt }) {
  const s = root.useLoaderData()
  const router = useRouter()
  const { error, notice, run, setNotice } = useAction()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const link = typeof window !== 'undefined' ? `${window.location.origin}/receipt/${r.token}` : `/receipt/${r.token}`
  const first = r.client_name.split(' ')[0]
  const balance = r.total - r.amount_paid
  const message = [
    `Hello ${first},`,
    '',
    s.receipt_thanks,
    '',
    `Here is your receipt ${r.code} for ${formatNaira(r.total)}${balance > 0 ? ` (balance due: ${formatNaira(balance)})` : ' (fully paid)'}.`,
    `View, print or save it here: ${link}`,
    '',
    `${s.business_name}${s.phone ? ` · ${s.phone}` : ''}`,
  ].join('\n')
  const wa = r.client_phone ? whatsappLink(toIntlPhone(r.client_phone), message) : ''
  const mail = r.client_email
    ? `mailto:${r.client_email}?subject=${encodeURIComponent(`Your ${s.business_name} receipt ${r.code}`)}&body=${encodeURIComponent(message)}`
    : ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Receipt link copied. Paste it anywhere to share.')
    } catch {
      setNotice(`Receipt link: ${link}`)
    }
  }
  async function remove() {
    const ok = await run(() => deleteReceipt({ data: r.id }))
    if (ok) {
      await router.invalidate()
      router.navigate({ to: '/admin/receipts' })
    }
  }

  return (
    <>
      <div className="no-print">
        <Link to="/admin/receipts" className="text-sm font-semibold text-[#667085] hover:text-cocoa"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />All receipts</Link>
        <div className="mt-3">
          <PageTitle title={`Receipt ${r.code}`}>Send it to {first} with a thank-you message, or print it.</PageTitle>
        </div>

        <div className="admin-card mb-6 space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="btn btn-primary">
                <WhatsAppIcon /> Send on WhatsApp
              </a>
            ) : (
              <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.5 }} title="Add the customer's phone number to send on WhatsApp">
                <WhatsAppIcon /> Send on WhatsApp
              </span>
            )}
            {mail && (
              <a href={mail} className="btn btn-ghost text-cocoa">Send by email</a>
            )}
            <button type="button" onClick={() => window.print()} className="btn btn-ghost text-cocoa">Print / save PDF</button>
            <button type="button" onClick={copyLink} className="btn btn-ghost text-cocoa">Copy link</button>
            <Link to="/admin/receipts/$id" params={{ id: String(r.id) }} search={{ edit: true }} className="btn btn-ghost text-cocoa">Edit</Link>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-[#667085]">See the message that will be sent</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-[#f6f7fb] p-4 font-sans">{message}</pre>
          </details>
          <Messages error={error} notice={notice} />
        </div>
      </div>

      <ReceiptSheet r={r} s={s} />

      <div className="no-print mt-8 text-center text-sm">
        {confirmDelete ? (
          <span className="inline-flex gap-3">
            <span>Delete this receipt for good?</span>
            <button type="button" className="font-semibold text-red-700" onClick={remove}>Yes, delete</button>
            <button type="button" className="text-[#667085]" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </span>
        ) : (
          <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmDelete(true)}>Delete receipt</button>
        )}
      </div>
    </>
  )
}

// ------------------------------------------------------------------
// Create / edit
// ------------------------------------------------------------------
function ReceiptEditor() {
  const { receipt, clients, quote, clientId, order: fromOrder, booking: fromBooking } = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, run } = useAction()
  const todayIso = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState<ReceiptInput>(() => {
    if (receipt) {
      return {
        id: receipt.id,
        client_id: receipt.client_id,
        save_client: false,
        client_name: receipt.client_name,
        client_phone: receipt.client_phone,
        client_email: receipt.client_email,
        client_address: receipt.client_address,
        items: receipt.items,
        delivery_fee: receipt.delivery_fee,
        discount: receipt.discount,
        amount_paid: receipt.amount_paid,
        payment_method: receipt.payment_method,
        fulfilment: receipt.fulfilment,
        event_date: receipt.event_date,
        note: receipt.note,
        issued_on: receipt.issued_on,
      }
    }
    if (fromOrder) {
      const o = fromOrder.order
      const known = clients.find((x) => x.phone && x.phone.replace(/\D/g, '').slice(-10) === (o.customer_phone ?? '').replace(/\D/g, '').slice(-10))
      return {
        client_id: known?.id ?? null,
        save_client: !known,
        client_name: o.customer_name ?? '',
        client_phone: o.contact_phone,
        client_email: o.customer_email ?? '',
        client_address: o.fulfilment === 'delivery' ? `${o.address}${o.zone_name ? `, ${o.zone_name}` : ''}` : '',
        items: fromOrder.items.map((i) => ({
          description: `${i.name} (${[i.option_label, customOneLine(i.custom_json)].filter(Boolean).join(' · ')})${i.note ? `: "${i.note}"` : ''}`,
          qty: i.qty,
          price: i.unit_price,
        })),
        delivery_fee: o.delivery_fee,
        discount: o.discount ?? 0,
        amount_paid: o.payment_status === 'paid' ? o.total : 0,
        payment_method: o.payment_method === 'paystack' ? 'paystack' : 'transfer',
        fulfilment: o.fulfilment,
        event_date: o.needed_date,
        note: `Online order ${o.code}`,
        issued_on: todayIso,
      }
    }
    if (fromBooking) {
      const b = fromBooking
      const known = clients.find((x) => x.phone && x.phone.replace(/\D/g, '').slice(-10) === b.contact_phone.replace(/\D/g, '').slice(-10))
      return {
        client_id: known?.id ?? null,
        save_client: !known,
        client_name: b.customer_name ?? '',
        client_phone: b.contact_phone,
        client_email: b.customer_email ?? '',
        client_address: b.fulfilment === 'delivery' ? `${b.address}${b.zone_name ? `, ${b.zone_name}` : ''}` : '',
        items: b.lines.length ? b.lines : [{ description: b.event_type, qty: 1, price: Math.max(0, b.quote_amount - b.delivery_fee) }],
        delivery_fee: b.delivery_fee,
        discount: 0,
        amount_paid: b.paid_amount,
        payment_method: 'transfer',
        fulfilment: b.fulfilment,
        event_date: b.event_date,
        note: `Event booking ${b.code} (${b.event_type}, ${b.guests} guests)`,
        issued_on: todayIso,
      }
    }
    const c = clients.find((x) => x.id === clientId)
    const itemFromQuote = quote
      ? [
          quote.cake_shape || quote.flavour || quote.cake_size
            ? `Cake${[quote.cake_size, quote.cake_shape, quote.flavour].filter(Boolean).length ? ` (${[quote.cake_size, quote.cake_shape, quote.flavour].filter(Boolean).join(', ')})` : ''}`
            : quote.items || 'Order',
        ]
      : []
    return {
      client_id: c?.id ?? null,
      save_client: !c,
      client_name: c?.name ?? quote?.name ?? '',
      client_phone: c?.phone ?? quote?.phone ?? '',
      client_email: c?.email ?? quote?.email ?? '',
      client_address: c?.address ?? '',
      items: itemFromQuote.length ? itemFromQuote.map((d) => ({ description: d, qty: 1, price: 0 })) : [{ description: '', qty: 1, price: 0 }],
      delivery_fee: 0,
      discount: 0,
      amount_paid: 0,
      payment_method: 'transfer',
      fulfilment: quote?.fulfilment ?? 'pickup',
      event_date: quote?.event_date ?? '',
      note: quote ? `For quote ${quote.code}${quote.occasion ? ` (${quote.occasion})` : ''}` : '',
      issued_on: todayIso,
    }
  })
  const set = <K extends keyof ReceiptInput>(k: K, v: ReceiptInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setItem = (n: number, patch: Partial<ReceiptInput['items'][number]>) =>
    set('items', form.items.map((i, idx) => (idx === n ? { ...i, ...patch } : i)))
  const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0
  const show = (n: number) => (n ? n.toLocaleString('en-NG') : '')

  const subtotal = form.items.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0)
  const total = Math.max(0, subtotal + form.delivery_fee - form.discount)

  function pickClient(id: string) {
    if (!id) return setForm((f) => ({ ...f, client_id: null, save_client: true }))
    const c = clients.find((x) => x.id === Number(id))
    if (!c) return
    setForm((f) => ({ ...f, client_id: c.id, save_client: false, client_name: c.name, client_phone: c.phone, client_email: c.email, client_address: c.address }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const out = await run(() => saveReceipt({ data: form }))
    if (out) {
      await router.invalidate()
      router.navigate({ to: '/admin/receipts/$id', params: { id: String(out.id) }, search: {} })
    }
  }

  return (
    <>
      <Link to="/admin/receipts" className="text-sm font-semibold text-[#667085] hover:text-cocoa"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />All receipts</Link>
      <div className="mt-3">
        <PageTitle title={receipt ? `Edit receipt ${receipt.code}` : 'New receipt'}>
          {fromOrder
            ? `Filled in from online order ${fromOrder.order.code}. Check it and save.`
            : quote
              ? `Filled in from quote request ${quote.code}. Add the prices you agreed.`
              : 'Fill in what the customer bought and paid.'}
        </PageTitle>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="admin-card grid gap-5 p-6 sm:grid-cols-2">
            <h2 className="text-lg font-bold sm:col-span-2">Customer</h2>
            <div className="sm:col-span-2">
              <Field label="Choose a saved customer" htmlFor="r-client">
                <select id="r-client" className="admin-input" value={form.client_id ?? ''} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">New customer (type details below)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Name *" htmlFor="r-name">
              <input id="r-name" required className="admin-input" value={form.client_name} onChange={(e) => set('client_name', e.target.value)} />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="r-phone">
              <input id="r-phone" type="tel" className="admin-input" value={form.client_phone} onChange={(e) => set('client_phone', e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="r-email">
              <input id="r-email" type="email" className="admin-input" value={form.client_email} onChange={(e) => set('client_email', e.target.value)} />
            </Field>
            <Field label="Address" htmlFor="r-address">
              <input id="r-address" className="admin-input" value={form.client_address} onChange={(e) => set('client_address', e.target.value)} />
            </Field>
            {!form.client_id && (
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" checked={form.save_client} onChange={(e) => set('save_client', e.target.checked)} className="h-4 w-4 accent-[var(--c-primary)]" />
                Also save to my customers
              </label>
            )}
          </section>

          <section className="admin-card space-y-3 p-6">
            <h2 className="text-lg font-bold">What they bought</h2>
            <div className="hidden grid-cols-[1fr_4.5rem_8rem_2rem] gap-2 text-xs font-semibold uppercase tracking-wide text-[#667085] sm:grid">
              <span>Item</span>
              <span>Qty</span>
              <span>Price (₦)</span>
              <span />
            </div>
            {form.items.map((i, n) => (
              <div key={n} className="grid grid-cols-[1fr_4.5rem_8rem_2rem] items-center gap-2">
                <input id={`ri-desc-${n}`} aria-label="Item" className="admin-input" value={i.description} onChange={(e) => setItem(n, { description: e.target.value })} placeholder="e.g. 8-inch red velvet birthday cake" />
                <input id={`ri-qty-${n}`} aria-label="Quantity" type="number" min={1} className="admin-input tabular" value={i.qty} onChange={(e) => setItem(n, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                <input id={`ri-price-${n}`} aria-label="Price in naira" inputMode="numeric" className="admin-input tabular" value={show(i.price)} onChange={(e) => setItem(n, { price: num(e.target.value) })} />
                <button
                  type="button"
                  className="text-xl text-[#98a2b3] hover:text-red-700 disabled:opacity-30"
                  onClick={() => set('items', form.items.filter((_, idx) => idx !== n))}
                  disabled={form.items.length === 1}
                  aria-label="Remove item"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => set('items', [...form.items, { description: '', qty: 1, price: 0 }])}>
              + Add another item
            </button>
          </section>

          <section className="admin-card grid gap-5 p-6 sm:grid-cols-2">
            <h2 className="text-lg font-bold sm:col-span-2">Order details</h2>
            <Field label="Pickup or delivery" htmlFor="r-fulfil">
              <select id="r-fulfil" className="admin-input" value={form.fulfilment} onChange={(e) => set('fulfilment', e.target.value)}>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </Field>
            <Field label="Date of event / delivery" htmlFor="r-event">
              <DatePicker id="r-event" variant="admin" className="admin-input" value={form.event_date} onChange={(v) => set('event_date', v)} />
            </Field>
            <Field label="Receipt date" htmlFor="r-issued">
              <DatePicker id="r-issued" variant="admin" className="admin-input" value={form.issued_on} onChange={(v) => set('issued_on', v)} />
            </Field>
            <Field label="Payment method" htmlFor="r-method">
              <select id="r-method" className="admin-input" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value as ReceiptInput['payment_method'])}>
                {Object.entries(PAYMENT_METHODS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note on receipt (optional)" htmlFor="r-note">
                <textarea id="r-note" rows={2} className="admin-input" value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Message on cake: Happy 30th Ada" />
              </Field>
            </div>
          </section>
        </div>

        <aside className="admin-card h-fit space-y-4 p-6 lg:sticky lg:top-8">
          <h2 className="text-lg font-bold">Totals</h2>
          <div className="flex justify-between tabular"><span className="text-[#667085]">Items</span><span>{formatNaira(subtotal)}</span></div>
          <Field label="Delivery fee (₦)" htmlFor="r-delivery">
            <input id="r-delivery" inputMode="numeric" className="admin-input tabular" value={show(form.delivery_fee)} onChange={(e) => set('delivery_fee', num(e.target.value))} />
          </Field>
          <Field label="Discount (₦)" htmlFor="r-discount">
            <input id="r-discount" inputMode="numeric" className="admin-input tabular" value={show(form.discount)} onChange={(e) => set('discount', num(e.target.value))} />
          </Field>
          <div className="flex justify-between border-t border-[#e3e7f0] pt-3 text-lg font-bold tabular"><span>Total</span><span>{formatNaira(total)}</span></div>
          <Field label="Amount paid (₦)" htmlFor="r-paid">
            <div className="flex gap-2">
              <input id="r-paid" inputMode="numeric" className="admin-input tabular" value={show(form.amount_paid)} onChange={(e) => set('amount_paid', num(e.target.value))} />
              <button type="button" className="btn btn-ghost shrink-0 !px-3 !py-2 text-sm text-cocoa" onClick={() => set('amount_paid', total)}>Paid in full</button>
            </div>
          </Field>
          {total - form.amount_paid > 0 && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 tabular">
              Balance due: {formatNaira(total - form.amount_paid)}
            </p>
          )}
          <Messages error={error} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : receipt ? 'Save changes' : 'Create receipt'}
          </button>
          <p className="text-xs text-[#667085]">Next, you can send it on WhatsApp or email, or print it.</p>
        </aside>
      </form>
    </>
  )
}
