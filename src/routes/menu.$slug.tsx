import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Reveal, burstSprinkles } from '~/components/motion'
import { ProductCard } from '~/components/ProductCard'
import { WhatsAppIcon } from '~/components/icons'
import { getProduct } from '~/fns/public'
import { formatNaira, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/menu/$slug')({
  loader: ({ params }) => getProduct({ data: params.slug }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} · Miel Cakes` },
          { name: 'description', content: loaderData.product.description },
          { property: 'og:image', content: loaderData.product.image_url },
        ]
      : [],
  }),
  component: ProductPage,
})

function ProductPage() {
  const s = root.useLoaderData()
  const { product: p, related } = Route.useLoaderData()
  const [optIndex, setOptIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const btnRef = useRef<HTMLAnchorElement>(null)

  const option = p.options[optIndex] ?? p.options[0]
  const total = (option?.price ?? 0) * qty
  const soldOut = !p.is_available

  const message = [
    `Hello ${s.business_name}, I'd like to order:`,
    `• ${qty} × ${p.name}${option ? ` (${option.label})` : ''}: ${formatNaira(total)}`,
    note.trim() ? `Note: ${note.trim()}` : '',
    'Pickup or delivery: ',
    'Date needed: ',
  ]
    .filter(Boolean)
    .join('\n')
  const wa = whatsappLink(s.whatsapp, message)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/menu" className="hover:text-brand">Menu</Link>
        <span className="px-2">/</span>
        <Link to="/menu" search={{ c: p.category_slug }} className="hover:text-brand">{p.category_name}</Link>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-soft lg:sticky lg:top-24 lg:self-start">
          {p.image_url && <img src={p.image_url} alt={p.name} className={`h-full w-full object-cover ${soldOut ? 'grayscale' : ''}`} />}
          {p.availability === 'preorder' && !soldOut && (
            <span className="float absolute right-4 top-4 rounded-full bg-accent px-4 py-2 text-sm font-bold text-cocoa shadow-lg">
              Order {p.notice_days} day{p.notice_days === 1 ? '' : 's'} ahead
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-3 text-2xl font-bold text-brand tabular">{formatNaira(total)}</p>
          {p.description && <p className="mt-5 text-lg leading-relaxed text-cocoa/80">{p.description}</p>}

          {p.options.length > 1 && (
            <fieldset className="mt-8">
              <legend className="font-semibold">Choose a size</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.options.map((o, n) => (
                  <label
                    key={o.label}
                    className={`cursor-pointer rounded-2xl px-4 py-3 ring-1 transition ${
                      n === optIndex ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'
                    }`}
                  >
                    <input type="radio" name="option" className="sr-only" checked={n === optIndex} onChange={() => setOptIndex(n)} />
                    <span className="block font-semibold">{o.label}</span>
                    <span className={`block text-sm tabular ${n === optIndex ? 'text-cream/75' : 'text-muted'}`}>{formatNaira(o.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="font-semibold">Quantity</span>
            <div className="flex items-center rounded-full bg-white ring-1 ring-line">
              <button type="button" className="h-11 w-11 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
              <span className="w-10 text-center font-bold tabular" aria-live="polite">{qty}</span>
              <button type="button" className="h-11 w-11 text-xl" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="More">+</button>
            </div>
          </div>

          <label className="mt-8 block">
            <span className="font-semibold">Message on cake or special request</span>
            <textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Happy 30th Birthday Tolu, pink and gold colours"
              className="mt-2 w-full rounded-2xl border-0 bg-white p-4 ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </label>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {soldOut ? (
              <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.55 }}>Sold out today</span>
            ) : wa ? (
              <a
                ref={btnRef}
                href={wa}
                target="_blank"
                rel="noopener"
                className="btn btn-primary sprinkle-host !px-7 !py-4 text-base"
                onClick={() => btnRef.current && burstSprinkles(btnRef.current)}
              >
                <WhatsAppIcon /> Order on WhatsApp · <span className="tabular">{formatNaira(total)}</span>
              </a>
            ) : (
              <p className="rounded-2xl bg-honey px-4 py-3 text-sm">
                Online ordering is being set up. Call us{s.phone ? ` on ${s.phone}` : ''} to order.
              </p>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">
            Pickup is free. Delivery fees depend on your area. <Link to="/contact" className="font-semibold text-brand hover:underline">See delivery fees</Link>
          </p>
          {s.order_note && <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-cocoa/80 ring-1 ring-line">{s.order_note}</p>}
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-24">
          <Reveal>
            <h2 className="font-display text-3xl">More {p.category_name}</h2>
          </Reveal>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r, n) => (
              <Reveal key={r.id} delay={n * 0.07}>
                <ProductCard p={r} />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
