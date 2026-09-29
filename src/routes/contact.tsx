import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PaymentInfo } from '~/components/PaymentInfo'
import { Reveal } from '~/components/motion'
import { WhatsAppIcon } from '~/components/icons'
import { submitQuote, type QuoteInput } from '~/fns/business'
import { getZones } from '~/fns/public'
import { formatNaira, lines, whatsappLink } from '~/lib/format'
import { parseOccasions, type SiteSettings } from '~/lib/site-fields'
import type { DeliveryZone } from '~/lib/types'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/contact')({
  loader: () => getZones(),
  head: () => ({ meta: [{ title: 'Contact & quotes · Miel Cakes' }] }),
  component: ContactPage,
})

function ContactPage() {
  const s = root.useLoaderData()
  const zones = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}!`)
  const mapLink = s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}` : ''
  const shown = zones.filter((z) => z.name.toLowerCase().includes(query.trim().toLowerCase()))

  // Scroll to the quote form when arriving with #quote
  useEffect(() => {
    if (window.location.hash === '#quote') {
      setTimeout(() => document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Get in touch</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Contact, quotes & delivery</h1>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="space-y-6 rounded-[2rem] bg-white p-7 ring-1 ring-line sm:p-9">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="btn btn-primary w-full sm:w-auto">
              <WhatsAppIcon /> Chat on WhatsApp
            </a>
          )}
          <dl className="space-y-5">
            {s.phone && (
              <div>
                <dt className="eyebrow text-muted">Phone</dt>
                <dd className="mt-1 text-lg font-semibold tabular select-all">{s.phone}</dd>
              </div>
            )}
            {s.email && (
              <div>
                <dt className="eyebrow text-muted">Email</dt>
                <dd className="mt-1 break-all text-lg font-semibold select-all">{s.email}</dd>
              </div>
            )}
            {s.address && (
              <div>
                <dt className="eyebrow text-muted">Pickup address</dt>
                <dd className="mt-1 whitespace-pre-line text-lg">{s.address}</dd>
                {mapLink && (
                  <a href={mapLink} target="_blank" rel="noopener" className="mt-1 inline-block font-semibold text-brand hover:underline">
                    Open in Google Maps →
                  </a>
                )}
              </div>
            )}
            <div>
              <dt className="eyebrow text-muted">Opening hours</dt>
              <dd className="mt-1 space-y-1">
                {lines(s.opening_hours).map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </dd>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={0.1} className="rounded-[2rem] bg-honey p-7 sm:p-9">
          <h2 className="font-display text-3xl">Delivery fees</h2>
          <p className="mt-2 text-cocoa/75">Pickup is free. Can&rsquo;t find your area? Message us and we&rsquo;ll give you a price.</p>
          <label className="mt-6 block">
            <span className="sr-only">Find your area</span>
            <input
              id="zone-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your area, e.g. Gwarinpa"
              className="w-full rounded-full border-0 bg-white px-5 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </label>
          <ul className="mt-5 max-h-80 divide-y divide-cocoa/10 overflow-y-auto rounded-2xl bg-white/70">
            {shown.map((z) => (
              <li key={z.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-semibold">{z.name}</span>
                <span className="tabular">{formatNaira(z.fee)}</span>
              </li>
            ))}
            {!shown.length && <li className="px-5 py-4 text-muted">No match. Message us for a delivery price.</li>}
          </ul>
        </Reveal>
      </div>

      <section id="quote" className="scroll-mt-28 pt-20">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <QuoteForm s={s} zones={zones} />
          <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <PaymentInfo s={s} />
          </div>
        </div>
      </section>
    </div>
  )
}

const BUDGETS = ['Not sure yet', 'Under ₦30,000', '₦30,000 – ₦70,000', '₦70,000 – ₦150,000', '₦150,000 – ₦300,000', 'Above ₦300,000']

const emptyQuote = (): QuoteInput => ({
  name: '',
  phone: '',
  email: '',
  occasion: '',
  event_date: '',
  items: [],
  cake_shape: '',
  cake_size: '',
  flavour: '',
  colours: '',
  cake_message: '',
  guests: 0,
  fulfilment: 'pickup',
  area: '',
  budget: '',
  details: '',
  website: '',
})

function buildMessage(s: SiteSettings, q: QuoteInput, code: string) {
  const row = (label: string, value: string | number) => (value ? `${label}: ${value}` : null)
  return [
    `Hello ${s.business_name}, I'd like a quote (${code}).`,
    '',
    row('Name', q.name),
    row('Phone', q.phone),
    row('Occasion', q.occasion),
    row('Date needed', q.event_date),
    row('I want', q.items.join(', ')),
    row('Cake shape', q.cake_shape),
    row('Size / tiers', q.cake_size),
    row('Flavour', q.flavour),
    row('Colours / theme', q.colours),
    row('Message on cake', q.cake_message),
    row('Guests', q.guests || ''),
    row('Pickup or delivery', q.fulfilment === 'delivery' ? `Delivery${q.area ? ` to ${q.area}` : ''}` : 'Pickup'),
    row('Budget', q.budget),
    row('More details', q.details),
    '',
    'I can send a picture of what I want here on WhatsApp.',
  ]
    .filter((l) => l !== null)
    .join('\n')
}

function QuoteForm({ s, zones }: { s: SiteSettings; zones: DeliveryZone[] }) {
  const [q, setQ] = useState<QuoteInput>(emptyQuote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ code: string; wa: string; mail: string } | null>(null)
  const set = <K extends keyof QuoteInput>(k: K, v: QuoteInput[K]) => setQ((prev) => ({ ...prev, [k]: v }))

  const occasionGroups = parseOccasions(s.occasions)
  const itemOptions = lines(s.quote_items)
  const shapes = lines(s.cake_shapes)
  const flavours = lines(s.cake_flavours)
  const wantsCake = q.items.some((i) => /cake/i.test(i))
  const today = new Date().toISOString().slice(0, 10)

  const toggleItem = (item: string) =>
    set('items', q.items.includes(item) ? q.items.filter((i) => i !== item) : [...q.items, item])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!q.items.length) return setError('Tick at least one thing you would like a quote for.')
    setBusy(true)
    try {
      const { code } = await submitQuote({ data: q })
      const message = buildMessage(s, q, code)
      setDone({
        code,
        wa: whatsappLink(s.whatsapp, message),
        mail: s.email ? `mailto:${s.email}?subject=${encodeURIComponent(`Quote request ${code}`)}&body=${encodeURIComponent(message)}` : '',
      })
      document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again, or message us on WhatsApp.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-[2rem] bg-white p-8 ring-1 ring-line sm:p-10">
        <p className="eyebrow text-brand">Request {done.code}</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">Almost done. Send it to us on WhatsApp</h2>
        <p className="mt-3 text-cocoa/80">
          We&rsquo;ve saved your request. Tap the button below to send it to us on WhatsApp. Everything you filled in is already in the
          message. You can also attach a picture of the design you want.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {done.wa ? (
            <a href={done.wa} target="_blank" rel="noopener" className="btn btn-primary !px-7 !py-4 text-base">
              <WhatsAppIcon /> Send on WhatsApp
            </a>
          ) : (
            <p className="rounded-2xl bg-honey px-4 py-3">We&rsquo;ll call you on {q.phone} soon.</p>
          )}
          {done.mail && (
            <a href={done.mail} className="btn btn-ghost text-cocoa">
              Send by email instead
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setDone(null)
            setQ(emptyQuote())
          }}
          className="mt-8 text-sm font-semibold text-muted hover:text-brand"
        >
          Start another request
        </button>
      </div>
    )
  }

  const input = 'w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
  const label = 'mb-1.5 block text-sm font-semibold'

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-soft p-6 sm:p-10" noValidate>
      <h2 className="font-display text-3xl sm:text-4xl">{s.quote_title}</h2>
      {s.quote_intro && <p className="mt-2 text-cocoa/80">{s.quote_intro}</p>}

      {/* Honeypot for bots: hidden from people */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={q.website} onChange={(e) => set('website', e.target.value)} className="hidden" aria-hidden="true" />

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-xl">About you</legend>
        <div>
          <label htmlFor="q-name" className={label}>Your name *</label>
          <input id="q-name" required className={input} value={q.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="q-phone" className={label}>Phone / WhatsApp *</label>
          <input id="q-phone" required type="tel" className={input} value={q.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" placeholder="0801 234 5678" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="q-email" className={label}>Email (optional)</label>
          <input id="q-email" type="email" className={input} value={q.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </div>
      </fieldset>

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-xl">Your occasion</legend>
        <div>
          <label htmlFor="q-occasion" className={label}>Occasion</label>
          <select id="q-occasion" className={input} value={q.occasion} onChange={(e) => set('occasion', e.target.value)}>
            <option value="">Choose an occasion</option>
            {occasionGroups.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </optgroup>
            ))}
            <option value="Other">Something else</option>
          </select>
        </div>
        <div>
          <label htmlFor="q-date" className={label}>Date needed</label>
          <input id="q-date" type="date" min={today} className={input} value={q.event_date} onChange={(e) => set('event_date', e.target.value)} />
        </div>
        <div>
          <label htmlFor="q-guests" className={label}>Number of guests (roughly)</label>
          <input
            id="q-guests"
            type="number"
            min={0}
            inputMode="numeric"
            className={input}
            value={q.guests || ''}
            onChange={(e) => set('guests', Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label htmlFor="q-budget" className={label}>Budget</label>
          <select id="q-budget" className={input} value={q.budget} onChange={(e) => set('budget', e.target.value)}>
            <option value="">Choose a range</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="mb-3 font-display text-xl">What would you like? *</legend>
        <div className="flex flex-wrap gap-2">
          {itemOptions.map((item) => {
            const on = q.items.includes(item)
            return (
              <label
                key={item}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${on ? 'bg-brand text-white ring-brand' : 'bg-white ring-line hover:ring-brand'}`}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleItem(item)} />
                {on ? '✓ ' : ''}
                {item}
              </label>
            )
          })}
        </div>
      </fieldset>

      {wantsCake && (
        <fieldset className="mt-8 grid gap-4 rounded-3xl bg-white p-5 ring-1 ring-line sm:grid-cols-2 sm:p-6">
          <legend className="mb-3 px-1 font-display text-xl">Your cake</legend>
          <div className="sm:col-span-2">
            <span className={label}>Shape</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cake shape">
              {shapes.map((shape) => (
                <label
                  key={shape}
                  className={`cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                    q.cake_shape === shape ? 'bg-cocoa text-cream ring-cocoa' : 'bg-cream ring-line hover:ring-brand'
                  }`}
                >
                  <input type="radio" name="shape" className="sr-only" checked={q.cake_shape === shape} onChange={() => set('cake_shape', shape)} />
                  {shape}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="q-size" className={label}>Size or tiers</label>
            <input id="q-size" className={input} value={q.cake_size} onChange={(e) => set('cake_size', e.target.value)} placeholder="e.g. 8 inch, or 3 tiers" />
          </div>
          <div>
            <label htmlFor="q-flavour" className={label}>Flavour</label>
            <select id="q-flavour" className={input} value={q.flavour} onChange={(e) => set('flavour', e.target.value)}>
              <option value="">Choose a flavour</option>
              {flavours.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-colours" className={label}>Colours or theme</label>
            <input id="q-colours" className={input} value={q.colours} onChange={(e) => set('colours', e.target.value)} placeholder="e.g. blue and gold, Spider-Man" />
          </div>
          <div>
            <label htmlFor="q-message" className={label}>Message on the cake</label>
            <input id="q-message" className={input} value={q.cake_message} onChange={(e) => set('cake_message', e.target.value)} placeholder="e.g. Happy 40th, Tunde!" />
          </div>
        </fieldset>
      )}

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-xl">Pickup or delivery</legend>
        <div className="flex gap-2 sm:col-span-2">
          {(['pickup', 'delivery'] as const).map((f) => (
            <label
              key={f}
              className={`flex-1 cursor-pointer rounded-2xl px-4 py-3 text-center font-semibold ring-1 transition ${
                q.fulfilment === f ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'
              }`}
            >
              <input type="radio" name="fulfilment" className="sr-only" checked={q.fulfilment === f} onChange={() => set('fulfilment', f)} />
              {f === 'pickup' ? 'I’ll pick up (free)' : 'Deliver to me'}
            </label>
          ))}
        </div>
        {q.fulfilment === 'delivery' && (
          <div className="sm:col-span-2">
            <label htmlFor="q-area" className={label}>Your area</label>
            <select id="q-area" className={input} value={q.area} onChange={(e) => set('area', e.target.value)}>
              <option value="">Choose your area</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.name} (delivery {formatNaira(z.fee)})
                </option>
              ))}
              <option value="Other area">My area isn&rsquo;t listed</option>
            </select>
          </div>
        )}
      </fieldset>

      <div className="mt-8">
        <label htmlFor="q-details" className={label}>Anything else?</label>
        <textarea
          id="q-details"
          rows={4}
          className={input}
          value={q.details}
          onChange={(e) => set('details', e.target.value)}
          placeholder="Describe the design, dietary needs, or anything we should know. You can send a picture on WhatsApp next."
        />
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary !px-8 !py-4 text-base" disabled={busy}>
          {busy ? 'Saving…' : 'Get my quote'}
        </button>
        <p className="text-sm text-muted">Next, you&rsquo;ll send this to us on WhatsApp.</p>
      </div>
    </form>
  )
}
