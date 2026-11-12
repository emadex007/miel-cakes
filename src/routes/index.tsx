import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { openChat } from '~/components/Chat'
import { FaqTeaser, ReviewCards, Stars } from '~/components/Extras'
import { AnimatedHeadline, LoopVideo, Reveal, Rotator } from '~/components/motion'
import { ProductCard } from '~/components/ProductCard'
import { ArrowRightIcon, CheckIcon, GiftIcon, PhoneIcon, WhatsAppIcon } from '~/components/icons'
import { getHomeData } from '~/fns/public'
import { formatNaira, lines, whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/')({
  loader: () => getHomeData(),
  component: HomePage,
})

const pairs = (value: string | undefined) =>
  lines(value).map((l) => {
    const [title, ...rest] = l.split('|')
    return { title: title.trim(), text: rest.join('|').trim() }
  })

function SectionHead({ eyebrow, title, link }: { eyebrow?: string; title: string; link?: { to: string; label: string } }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow text-brand">{eyebrow}</p>}
        <h2 className={`${eyebrow ? 'mt-2 ' : ''}font-display text-3xl sm:text-4xl`}>{title}</h2>
      </div>
      {link && (
        <a href={link.to} className="font-semibold text-brand hover:underline">
          {link.label} <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
        </a>
      )}
    </Reveal>
  )
}

/** A number that counts up when it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(to)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setN(0)
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1600)
        setN(Math.round(to * (1 - Math.pow(1 - t, 3))))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])
  return <span ref={ref}>{n.toLocaleString('en-NG')}</span>
}

function HomePage() {
  const s = root.useLoaderData()
  const { categories, featured, ready, labelled, cakesFrom, delivered, zones, gallery, reviews } = Route.useLoaderData()
  const priceLine = s.hero_price_text && cakesFrom ? s.hero_price_text.replace('{price}', formatNaira(cakesFrom)) : ''
  const collections = pairs(s.home_collections)
    .map((c) => ({ title: c.text || c.title, items: labelled.filter((p) => (p.badge ?? '').toLowerCase() === c.title.toLowerCase()).slice(0, 8) }))
    .filter((c) => c.items.length > 0)
  const counter = s.home_counter_label ? Math.max(0, Number(s.home_counter_start) || 0) + delivered : 0
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to place an order.`)
  const marqueeItems = lines(s.hero_rotating)
  const why = pairs(s.home_why_points)
  const steps = pairs(s.home_steps)
  const cateringPoints = lines(s.home_catering_points)
  const occasionLinks = pairs(s.home_occasion_links).filter((o) => o.title)
  const hours = lines(s.opening_hours)
  const cheapestZone = zones.length ? Math.min(...zones.map((z) => z.fee)) : 0
  const avgRating = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0
  const chatOn = s.chat_enabled === '1'

  return (
    <>
      {/* ---------- 1. Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-cocoa text-cream">
        {s.hero_video_url ? (
          <LoopVideo src={s.hero_video_url} poster={s.hero_image_url} className="hero-media" />
        ) : (
          s.hero_image_url && <img src={s.hero_image_url} alt="" fetchPriority="high" className="hero-media" />
        )}
        <div className="hero-shade" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
          <p className="eyebrow text-accent">{s.hero_eyebrow}</p>
          {(priceLine || s.perk_text) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {priceLine && <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-cocoa tabular">{priceLine}</span>}
              {s.perk_text && <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-cream ring-1 ring-white/25 backdrop-blur"><GiftIcon className="mr-1.5 inline h-4 w-4 align-[-3px]" />{s.perk_text}</span>}
            </div>
          )}
          <AnimatedHeadline
            text={s.hero_title}
            highlight={s.hero_highlight}
            className="mt-4 max-w-3xl font-display text-[2.6rem] leading-[1.08] sm:text-6xl lg:text-7xl"
          />
          {marqueeItems.length > 0 && (
            <p className="mt-6 text-lg font-semibold text-cream/90 sm:text-xl">
              Fresh in Abuja today: <Rotator items={marqueeItems} className="text-accent" />
            </p>
          )}
          <p className="mt-4 max-w-xl text-base text-cream/80 sm:text-lg">{s.hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-primary">
              See the menu
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="btn btn-light">
                <WhatsAppIcon /> Order on WhatsApp
              </a>
            )}
          </div>
          {reviews.length > 0 && (
            <p className="mt-8 flex items-center gap-2 text-sm text-cream/80">
              <Stars rating={Math.round(avgRating)} />
              Loved by {reviews.length > 1 ? `${reviews.length}+ ` : ''}customers across Abuja
            </p>
          )}
        </div>
      </section>

      {/* ---------- 2. Shop by category ---------- */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
          <SectionHead title={s.home_categories_title} link={{ to: '/menu', label: 'Full menu' }} />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, n) => (
              <Reveal key={c.id} delay={(n % 4) * 0.08}>
                <Link to="/menu" search={{ c: c.slug }} className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-soft">
                  {c.image_url && <img src={c.image_url} alt="" loading="lazy" className="zoom-img h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-cocoa/85 via-cocoa/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-cream">
                    <h3 className="font-display text-xl leading-tight sm:text-2xl">{c.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-cream/80">{c.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- 3. Customer favourites ---------- */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <SectionHead title={s.home_featured_title} link={{ to: '/menu', label: 'See everything' }} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, n) => (
              <Reveal key={p.id} delay={(n % 4) * 0.08}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- 3b. Labelled rows: Popular, New, Kids… ---------- */}
      {collections.map((c) => (
        <section key={c.title} className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <SectionHead title={c.title} link={{ to: '/menu', label: 'See all' }} />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {c.items.map((p, n) => (
              <Reveal key={p.id} delay={(n % 4) * 0.08}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </section>
      ))}

      {/* ---------- 4. Why choose us ---------- */}
      {s.home_why_title && (
        <section className="mt-24 bg-cocoa py-20 text-cream">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              {s.home_why_image ? (
                <img src={s.home_why_image} alt="" loading="lazy" className="aspect-[4/5] w-full rounded-[2rem] object-cover lg:aspect-[4/5]" />
              ) : null}
            </Reveal>
            <div>
              <Reveal>
                <p className="eyebrow text-accent">Why us</p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">{s.home_why_title}</h2>
                {s.home_why_story && <p className="mt-4 text-lg text-cream/80">{s.home_why_story}</p>}
              </Reveal>
              {counter > 0 && (
                <Reveal className="mt-8 flex items-end gap-3">
                  <span className="font-display text-5xl leading-none text-accent tabular sm:text-6xl">
                    <CountUp to={counter} />+
                  </span>
                  <span className="pb-1 text-lg font-semibold text-cream/85">{s.home_counter_label}</span>
                </Reveal>
              )}
              {why.length > 0 && (
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {why.map((w, n) => (
                    <Reveal as="li" key={w.title} delay={n * 0.07} className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                      <h3 className="font-display text-xl text-accent">{w.title}</h3>
                      {w.text && <p className="mt-1.5 text-sm text-cream/75">{w.text}</p>}
                    </Reveal>
                  ))}
                </ul>
              )}
              <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                {reviews.length > 0 && (
                  <span className="flex items-center gap-2 text-sm text-cream/85">
                    <Stars rating={Math.round(avgRating)} />
                    <strong className="tabular">{avgRating.toFixed(1)}</strong> from {reviews.length} review{reviews.length === 1 ? '' : 's'}
                  </span>
                )}
                <Link to="/about" className="font-semibold text-accent hover:underline">
                  Our story <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ---------- 5. Ready to go ---------- */}
      {s.home_ready_title && ready.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <SectionHead eyebrow="No long wait" title={s.home_ready_title} link={{ to: '/menu', label: 'More treats' }} />
          {s.home_ready_intro && (
            <Reveal>
              <p className="mt-3 max-w-2xl text-muted">{s.home_ready_intro}</p>
            </Reveal>
          )}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ready.map((p, n) => (
              <Reveal key={p.id} delay={(n % 4) * 0.08}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- 6. Corporate & event catering ---------- */}
      {s.event_title && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <Reveal className="grid overflow-hidden rounded-[2rem] bg-honey md:grid-cols-2">
            <div className="relative min-h-64 md:min-h-full">
              {s.event_image_url && <img src={s.event_image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div className="p-8 sm:p-12">
              <p className="eyebrow text-brand">Events & catering</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">{s.event_title}</h2>
              {s.event_body && <p className="mt-4 text-cocoa/80">{s.event_body}</p>}
              {cateringPoints.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {cateringPoints.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true"><CheckIcon className="h-3 w-3" /></span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/events" className="btn btn-primary">
                  Book your event
                </Link>
                <Link to="/contact" hash="quote" className="btn btn-ghost text-cocoa">
                  Request a quotation
                </Link>
              </div>
              {occasionLinks.length > 0 && (
                <div className="mt-8 border-t border-cocoa/10 pt-5">
                  <p className="text-sm font-semibold text-cocoa/70">Popular occasions</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {occasionLinks.map((o) => (
                      <li key={o.title}>
                        <a href={o.text || '/gallery'} className="inline-block rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold ring-1 ring-cocoa/10 transition hover:bg-brand hover:text-white">
                          {o.title}
                        </a>
                      </li>
                    ))}
                    <li>
                      <Link to="/gallery" className="inline-block px-2 py-1.5 text-sm font-semibold text-brand hover:underline">
                        All occasions <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------- 7. Gallery & testimonials ---------- */}
      {(gallery.length > 0 || reviews.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <SectionHead eyebrow="Our work" title={s.home_gallery_title || 'Our work'} link={gallery.length ? { to: '/gallery', label: 'See the gallery' } : undefined} />
          {gallery.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((g, n) => (
                <Reveal key={g.id} delay={(n % 3) * 0.08}>
                  <Link to="/gallery" className="group relative block aspect-square overflow-hidden rounded-3xl bg-soft">
                    <img src={g.image_url} alt={g.title} loading="lazy" className="zoom-img h-full w-full object-cover" />
                    {g.occasion && <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-cocoa">{g.occasion}</span>}
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
          {reviews.length > 0 && (
            <div className={gallery.length ? 'mt-10' : 'mt-8'}>
              <ReviewCards reviews={reviews.slice(0, 6)} />
            </div>
          )}
        </section>
      )}

      {/* ---------- 8. How to order & FAQs ---------- */}
      {steps.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <SectionHead eyebrow="How to order" title="Ordering is easy" />
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, n) => (
              <Reveal as="li" key={st.title} delay={n * 0.1} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-lg text-white tabular">{n + 1}</span>
                <h3 className="mt-4 font-display text-xl">{st.title}</h3>
                <p className="mt-2 text-muted">{st.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>
      )}
      <FaqTeaser s={s} />

      {/* ---------- 9. Location & final call to action ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <Reveal className="grid overflow-hidden rounded-[2rem] bg-cocoa text-cream lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-accent">Find us</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">{s.home_location_title || 'Visit us'}</h2>
            {s.home_location_body && <p className="mt-3 text-cream/80">{s.home_location_body}</p>}
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              {s.address && (
                <div>
                  <dt className="text-sm font-semibold text-accent">Address</dt>
                  <dd className="mt-1 whitespace-pre-line">{s.address}</dd>
                </div>
              )}
              {hours.length > 0 && (
                <div>
                  <dt className="text-sm font-semibold text-accent">Opening hours</dt>
                  <dd className="mt-1 space-y-0.5">
                    {hours.map((h) => (
                      <span key={h} className="block">{h}</span>
                    ))}
                  </dd>
                </div>
              )}
              {(s.phone || s.email) && (
                <div>
                  <dt className="text-sm font-semibold text-accent">Contact</dt>
                  <dd className="mt-1 space-y-0.5">
                    {s.phone && <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="block hover:text-accent">{s.phone}</a>}
                    {s.email && <a href={`mailto:${s.email}`} className="block break-all hover:text-accent">{s.email}</a>}
                  </dd>
                </div>
              )}
              {zones.length > 0 && (
                <div>
                  <dt className="text-sm font-semibold text-accent">Delivery</dt>
                  <dd className="mt-1">
                    Across Abuja from <strong className="tabular">{formatNaira(cheapestZone)}</strong>. Pickup is free.{' '}
                    <Link to="/contact" className="underline hover:text-accent">See fees</Link>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/menu" className="btn btn-primary">Order now</Link>
              {chatOn && (
                <button type="button" onClick={openChat} className="btn btn-light">
                  Chat with us
                </button>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
              {s.phone && !wa && (
                <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="btn btn-ghost">
                  <PhoneIcon /> Call us
                </a>
              )}
            </div>
          </div>
          {s.home_map_query ? (
            <iframe
              title={`Map: ${s.home_map_query}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(s.home_map_query)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-80 w-full border-0 lg:h-full lg:min-h-[420px]"
            />
          ) : (
            s.home_why_image && <img src={s.home_why_image} alt="" loading="lazy" className="h-80 w-full object-cover lg:h-full" />
          )}
        </Reveal>
      </section>
    </>
  )
}
