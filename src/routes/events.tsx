import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckIcon, WhatsAppIcon } from '~/components/icons'
import { Reveal } from '~/components/motion'
import { getBookingForm, requestBooking, type BookingRequestInput } from '~/fns/bookings'
import { formatNaira, lines, whatsappLink } from '~/lib/format'
import { parseOccasions } from '~/lib/site-fields'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/events')({
  loader: () => getBookingForm(),
  head: () => ({
    meta: [
      { title: 'Event bookings · Miel Cakes' },
      { name: 'description', content: 'Book Miel Cakes for your wedding, birthday, naming ceremony, church or office event in Abuja. Cakes, small chops trays, pastries and drinks.' },
    ],
  }),
  component: EventsPage,
})

const DRAFT_KEY = 'mc_event_draft'
const BUDGETS = ['Not sure yet', 'Under ₦100,000', '₦100,000 – ₦250,000', '₦250,000 – ₦500,000', '₦500,000 – ₦1,000,000', 'Above ₦1,000,000']
const niceDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

function EventsPage() {
  const s = root.useLoaderData()
  const steps = lines(s.events_steps).map((l) => {
    const [title, body = ''] = l.split('|')
    return { title: title.trim(), body: body.trim() }
  })
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to talk about an event.`)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow text-brand">Events</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.events_title}</h1>
          {s.events_intro && <p className="mt-4 max-w-xl text-lg text-cocoa/80">{s.events_intro}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#book" className="btn btn-primary">Book your event</a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost text-cocoa">
                <WhatsAppIcon /> Chat with us first
              </a>
            )}
          </div>
        </div>
        {s.events_image_url && (
          <Reveal>
            <img src={s.events_image_url} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
          </Reveal>
        )}
      </div>

      {steps.length > 0 && (
        <section className="pt-20" aria-labelledby="how-title">
          <Reveal>
            <h2 id="how-title" className="font-display text-3xl sm:text-4xl">How booking works</h2>
          </Reveal>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <Reveal key={st.title} as="li" delay={i * 0.06} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-xl text-cocoa">{i + 1}</span>
                <h3 className="mt-4 font-display text-xl">{st.title}</h3>
                {st.body && <p className="mt-2 text-sm text-cocoa/75">{st.body}</p>}
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      <section id="book" className="scroll-mt-28 pt-20">
        <BookingForm />
      </section>
    </div>
  )
}

function emptyForm(phone: string, minDate: string): BookingRequestInput {
  return {
    event_type: '',
    event_date: minDate,
    event_time: '',
    guests: 0,
    items: [],
    details: '',
    budget: '',
    fulfilment: 'delivery',
    zone_id: null,
    address: '',
    contact_phone: phone,
  }
}

function BookingForm() {
  const s = root.useLoaderData()
  const { me, zones, blocked, minDate, minDays } = Route.useLoaderData()
  const router = useRouter()
  const occasionGroups = parseOccasions(s.occasions)
  const itemOptions = lines(s.quote_items)
  const [form, setForm] = useState<BookingRequestInput>(() => emptyForm(me?.phone ?? '', minDate))
  const [otherOccasion, setOtherOccasion] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const set = <K extends keyof BookingRequestInput>(k: K, v: BookingRequestInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Bring back what they typed before signing in
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as BookingRequestInput & { otherOccasion?: boolean }
      setForm({ ...emptyForm(me?.phone ?? '', minDate), ...draft, contact_phone: draft.contact_phone || me?.phone || '' })
      setOtherOccasion(!!draft.otherOccasion)
      setRestored(true)
      if (me) sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      /* no saved draft */
    }
  }, [])

  const blockedMap = useMemo(() => new Map(blocked.map((b) => [b.date, b.reason])), [blocked])
  const dateBlocked = blockedMap.has(form.event_date)
  const zone = zones.find((z) => z.id === form.zone_id)
  const allOccasions = occasionGroups.flatMap((g) => g.items)

  function toggleItem(item: string) {
    set('items', form.items.includes(item) ? form.items.filter((i) => i !== item) : [...form.items, item])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.event_type.trim()) return setError('What is the occasion?')
    if (dateBlocked) return setError('We’re fully booked on that date. Please choose another.')
    if (!me) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, otherOccasion }))
      } catch {
        /* storage blocked: they'll just fill it in again */
      }
      router.history.push(`/login?redirect=${encodeURIComponent('/events#book')}`)
      return
    }
    setBusy(true)
    try {
      const { code } = await requestBooking({ data: { ...form, zone_id: form.fulfilment === 'delivery' ? form.zone_id : null } })
      if (photo) {
        const body = new FormData()
        body.append('file', photo)
        await fetch(`/api/bookings/reference?code=${encodeURIComponent(code)}`, { method: 'POST', body }).catch(() => null)
      }
      router.navigate({ to: '/bookings/$code', params: { code }, search: { new: true } })
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
    <form onSubmit={submit} className="rounded-[2rem] bg-soft p-6 sm:p-10">
      <h2 className="font-display text-3xl sm:text-4xl">Tell us about your event</h2>
      <p className="mt-2 max-w-2xl text-cocoa/80">
        Please book at least {minDays} days ahead. For anything sooner, message us on WhatsApp.
        {!me && ' You’ll sign in (or create a free account) when you send, so you can follow your booking and pay online.'}
      </p>
      {restored && me && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold ring-1 ring-line">Welcome back! We kept what you typed. Check it and send.</p>}

      <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Event details</legend>
        <div className="sm:col-span-2">
          <label htmlFor="ev-type" className={label}>Occasion *</label>
          <select
            id="ev-type"
            className={input}
            value={otherOccasion ? '__other' : form.event_type}
            onChange={(e) => {
              if (e.target.value === '__other') {
                setOtherOccasion(true)
                set('event_type', '')
              } else {
                setOtherOccasion(false)
                set('event_type', e.target.value)
              }
            }}
          >
            <option value="">Choose the occasion</option>
            {occasionGroups.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
            ))}
            {!allOccasions.includes(form.event_type) && form.event_type && !otherOccasion && <option value={form.event_type}>{form.event_type}</option>}
            <option value="__other">Something else</option>
          </select>
          {otherOccasion && (
            <input className={`${input} mt-2`} aria-label="Your occasion" placeholder="e.g. Retirement party" value={form.event_type} onChange={(e) => set('event_type', e.target.value)} />
          )}
        </div>
        <div>
          <label htmlFor="ev-date" className={label}>Event date *</label>
          <input id="ev-date" type="date" required min={minDate} className={input} value={form.event_date} onChange={(e) => set('event_date', e.target.value)} />
          <p className="mt-1 text-xs text-muted">Earliest: {niceDate(minDate)}</p>
          {dateBlocked && (
            <p className="mt-1 text-sm font-semibold text-highlight">
              Fully booked{blockedMap.get(form.event_date) ? `: ${blockedMap.get(form.event_date)}` : ''}. Please pick another date.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="ev-time" className={label}>Time needed</label>
          <input id="ev-time" className={input} placeholder="e.g. 12 noon" value={form.event_time} onChange={(e) => set('event_time', e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-guests" className={label}>Number of guests *</label>
          <input
            id="ev-guests"
            type="number"
            inputMode="numeric"
            min={1}
            required
            className={input}
            value={form.guests || ''}
            onChange={(e) => set('guests', Number(e.target.value) || 0)}
            placeholder="About how many?"
          />
        </div>
        <div>
          <label htmlFor="ev-budget" className={label}>Budget</label>
          <select id="ev-budget" className={input} value={form.budget} onChange={(e) => set('budget', e.target.value)}>
            <option value="">Choose a range</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="mb-3 font-display text-xl">What would you like?</legend>
        <div className="flex flex-wrap gap-2">
          {itemOptions.map((item) => {
            const on = form.items.includes(item)
            return (
              <label key={item} className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${on ? 'bg-brand text-white ring-brand' : 'bg-white ring-line hover:ring-brand'}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleItem(item)} />
                {on && <CheckIcon className="mr-1 inline h-4 w-4 align-[-3px]" />}
                {item}
              </label>
            )
          })}
        </div>
        <label htmlFor="ev-details" className={`${label} mt-5`}>Details</label>
        <textarea
          id="ev-details"
          rows={4}
          className={input}
          value={form.details}
          onChange={(e) => set('details', e.target.value)}
          placeholder="e.g. 3-tier wedding cake in white and gold, 200 small chops packs, 100 meat pies, cupcakes for the children. Tell us any allergies."
        />
        <div className="mt-4">
          <span className={label}>Picture of what you want (optional)</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-ghost !py-2.5 text-sm text-cocoa" onClick={() => fileInput.current?.click()}>
              {photo ? 'Change picture' : 'Add a picture'}
            </button>
            {photo && (
              <span className="text-sm">
                {photo.name}{' '}
                <button type="button" className="font-semibold text-muted hover:text-highlight" onClick={() => setPhoto(null)}>Remove</button>
              </span>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="mb-3 font-display text-xl">Delivery</legend>
        <div className="flex max-w-lg gap-2">
          <label className={choice(form.fulfilment === 'delivery')}>
            <input type="radio" name="ev-ful" className="sr-only" checked={form.fulfilment === 'delivery'} onChange={() => set('fulfilment', 'delivery')} />
            Deliver to the venue
          </label>
          <label className={choice(form.fulfilment === 'pickup')}>
            <input type="radio" name="ev-ful" className="sr-only" checked={form.fulfilment === 'pickup'} onChange={() => set('fulfilment', 'pickup')} />
            I&rsquo;ll pick up
          </label>
        </div>
        {form.fulfilment === 'delivery' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-zone" className={label}>Venue area *</label>
              <select id="ev-zone" className={input} value={form.zone_id ?? ''} onChange={(e) => set('zone_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Choose the area</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}: {formatNaira(z.fee)}</option>
                ))}
              </select>
              {zone && <p className="mt-1 text-xs text-muted">Usual delivery fee {formatNaira(zone.fee)}. Large or tiered orders may cost more; it will be in your quote.</p>}
            </div>
            <div>
              <label htmlFor="ev-address" className={label}>Venue name and address *</label>
              <input id="ev-address" className={input} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Transcorp Hilton, Maitama" />
            </div>
          </div>
        ) : (
          s.address && <p className="text-sm text-cocoa/80">Pick up from: <span className="whitespace-pre-line font-semibold">{s.address}</span></p>
        )}
        <div className="max-w-sm">
          <label htmlFor="ev-phone" className={label}>Your phone number *</label>
          <input id="ev-phone" type="tel" required className={input} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
        </div>
      </fieldset>

      {error && <p role="alert" className="mt-6 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary !px-8 !py-4 text-base" disabled={busy}>
          {busy ? 'Sending…' : me ? 'Send booking request' : 'Sign in and send'}
        </button>
        {!me && (
          <Link to="/signup" search={{ redirect: '/events#book' }} className="text-sm font-semibold text-brand hover:underline">
            New here? Create a free account
          </Link>
        )}
      </div>
      {s.events_note && <p className="mt-4 max-w-2xl text-sm text-muted">{s.events_note}</p>}
    </form>
  )
}
