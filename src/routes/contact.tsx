import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { Reveal } from '~/components/motion'
import { WhatsAppIcon } from '~/components/icons'
import { getZones } from '~/fns/public'
import { formatNaira, lines, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/contact')({
  loader: () => getZones(),
  head: () => ({ meta: [{ title: 'Contact & delivery · Miel Cakes' }] }),
  component: ContactPage,
})

function ContactPage() {
  const s = root.useLoaderData()
  const zones = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}!`)
  const mapLink = s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}` : ''
  const shown = zones.filter((z) => z.name.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Get in touch</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Contact & delivery</h1>

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
          <ul className="mt-5 divide-y divide-cocoa/10 rounded-2xl bg-white/70">
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
    </div>
  )
}
