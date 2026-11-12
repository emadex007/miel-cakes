import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Reveal, burstSprinkles } from '~/components/motion'
import { CakeCustomizer } from '~/components/CakeCustomizer'
import { PaymentInfo } from '~/components/PaymentInfo'
import { ProductCard } from '~/components/ProductCard'
import { ArrowRightIcon, GiftIcon, MinusIcon, PlusIcon, WhatsAppIcon } from '~/components/icons'
import { getProduct } from '~/fns/public'
import { addToCart } from '~/fns/shop'
import { savePendingItem, useShop } from '~/components/Shop'
import { formatNaira, whatsappLink } from '~/lib/format'
import { jsonLd, productJsonLd } from '~/lib/seo'

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
    scripts: loaderData
      ? [{ type: 'application/ld+json', children: jsonLd(productJsonLd(loaderData.product, loaderData.settings, `/menu/${loaderData.product.slug}`)) }]
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
  const btnRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const { setCartCount } = useShop()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [addError, setAddError] = useState('')

  async function addItem() {
    if (!option) return
    setAdding(true)
    setAddError('')
    const item = { product_id: p.id, option_label: option.label, qty, note: note.trim() }
    try {
      const r = await addToCart({ data: item })
      if (r.needLogin) {
        savePendingItem(item)
        router.navigate({ to: '/login', search: { redirect: `/menu/${p.slug}` } })
        return
      }
      setCartCount(r.cartCount)
      setAdded(true)
      if (btnRef.current) burstSprinkles(btnRef.current)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not add to cart. Try again.')
    } finally {
      setAdding(false)
    }
  }

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
          <p className="mt-3 text-2xl font-bold text-brand tabular">
            {p.customizable && p.options.length > 1 ? `From ${formatNaira(Math.min(...p.options.map((o) => o.price)))}` : formatNaira(total)}
          </p>
          {s.perk_text && <p className="mt-3 inline-block rounded-full bg-honey px-4 py-1.5 text-sm font-semibold"><GiftIcon className="mr-1.5 inline h-4 w-4 align-[-3px]" />{s.perk_text}</p>}
          {p.description && <p className="mt-5 text-lg leading-relaxed text-cocoa/80">{p.description}</p>}

          {p.customizable && !soldOut ? (
            <CakeCustomizer p={p} />
          ) : (
            <>
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
              <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer"><MinusIcon /></button>
              <span className="w-10 text-center font-bold tabular" aria-live="polite">{qty}</span>
              <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="More"><PlusIcon /></button>
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

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {soldOut ? (
              <span className="btn btn-primary" aria-disabled="true" style={{ opacity: 0.55 }}>Sold out today</span>
            ) : (
              <>
                <button
                  ref={btnRef}
                  type="button"
                  onClick={addItem}
                  disabled={adding}
                  className="btn btn-primary sprinkle-host !px-7 !py-4 text-base"
                >
                  {adding ? 'Adding…' : added ? 'Added. Add another' : 'Add to cart'} · <span className="tabular">{formatNaira(total)}</span>
                </button>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost !py-4 text-cocoa">
                    <WhatsAppIcon /> Order on WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
          {added && (
            <p className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-honey px-4 py-3 text-sm font-semibold" role="status">
              Added to your cart.
              <Link to="/cart" className="text-brand hover:underline">View cart <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" /></Link>
              <Link to="/menu" className="text-cocoa/70 hover:text-brand">Keep shopping</Link>
            </p>
          )}
          {addError && <p role="alert" className="mt-4 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{addError}</p>}
            </>
          )}
          <p className="mt-4 text-sm text-muted">
            Pickup is free. Delivery fees depend on your area. <Link to="/contact" className="font-semibold text-brand hover:underline">See delivery fees</Link>
          </p>
          {s.order_note && <p className="mt-6 rounded-2xl bg-honey p-4 text-sm text-cocoa/85">{s.order_note}</p>}
          <div className="mt-6">
            <PaymentInfo s={s} compact />
          </div>
          <p className="mt-4 text-sm text-muted">
            Want something custom for an occasion?{' '}
            <Link to="/contact" hash="quote" className="font-semibold text-brand hover:underline">Get a quote</Link>
          </p>
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
