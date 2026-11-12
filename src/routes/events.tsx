import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { DatePicker } from '~/components/DatePicker'
import { FulfilmentChoice } from '~/components/FulfilmentChoice'
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

type Me = { name: string; email: string; phone: string } | null

function emptyForm(me: Me, minDate: string): BookingRequestInput {
  return {
    event_type: '',
    event_date: minDate,
    event_time: '',
    guests: 0,
    items: [],
    details: '',
    fulfilment: 'delivery',
    zone_id: null,
    address: '',
    contact_phone: me?.phone ?? '',
    contact_name: me?.name ?? '',
    contact_email: me?.email ?? '',
  }
}

function BookingForm() {
  const s = root.useLoaderData()
  const { me, zones, blocked, minDate, minDays } = Route.useLoaderData()
  const router = useRouter()
  const occasionGroups = parseOccasions(s.occasions)
  const itemOptions = lines(s.quote_items)
  const [form, setForm] = useState<BookingRequestInput>(() => emptyForm(me, minDate))
  const [otherOccasion, setOtherOccasion] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const set = <K extends keyof BookingRequestInput>(k: K, v: BookingRequestInput[K]) => setForm((f) => ({ ...f, [k]: v }))

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

  return (
    <form onSubmit={submit} className="rounded-[2rem] bg-soft p-6 sm:p-10">
      <h2 className="font-display text-3xl sm:text-4xl">Tell us about your event</h2>
      <p className="mt-2 max-w-2xl text-cocoa/80">
        Please book at least {minDays} days ahead. For anything sooner, message us on WhatsApp. No account needed: we send your quote with
        the price, and you can follow your booking and pay online.
      </p>

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
          <DatePicker id="ev-date" required min={minDate} blocked={blockedMap} className={input} value={form.event_date} onChange={(v) => set('event_date', v)} />
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
        <div className="max-w-3xl">
          <FulfilmentChoice name="ev-ful" value={form.fulfilment} onChange={(v) => set('fulfilment', v)} deliveryLabel="Deliver to the venue" />
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
          s.address && (
            <p className="text-sm text-cocoa/80">
              {form.fulfilment === 'own_rider' ? 'Your rider collects from: ' : 'Pick up from: '}
              <span className="whitespace-pre-line font-semibold">{s.address}</span>
            </p>
          )
        )}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="mb-3 font-display text-xl">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ev-name" className={label}>Your name *</label>
            <input id="ev-name" required autoComplete="name" className={input} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
          </div>
          <div>
            <label htmlFor="ev-email" className={label}>Email *</label>
            <input id="ev-email" type="email" required autoComplete="email" className={input} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="We send your quote here" />
          </div>
          <div>
            <label htmlFor="ev-phone" className={label}>Phone number *</label>
            <input id="ev-phone" type="tel" required autoComplete="tel" className={input} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
          </div>
        </div>
      </fieldset>

      {error && <p role="alert" className="mt-6 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary !px-8 !py-4 text-base" disabled={busy}>
          {busy ? 'Sending…' : 'Send booking request'}
        </button>
        {!me?.email && (
          <Link to="/login" search={{ redirect: '/events#book' }} className="text-sm font-semibold text-brand hover:underline">
            Have an account? Sign in
          </Link>
        )}
      </div>
      {s.events_note && <p className="mt-4 max-w-2xl text-sm text-muted">{s.events_note}</p>}
    </form>
  )
}
