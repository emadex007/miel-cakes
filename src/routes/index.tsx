import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { FaqTeaser, ReviewsSection } from '~/components/Extras'
import { AnimatedHeadline, LoopVideo, Reveal, Rotator } from '~/components/motion'
import { ProductCard } from '~/components/ProductCard'
import { WhatsAppIcon } from '~/components/icons'
import { getHomeData } from '~/fns/public'
import { formatNaira, lines, whatsappLink } from '~/lib/format'
import { parseOccasions } from '~/lib/site-fields'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/')({
  loader: () => getHomeData(),
  component: HomePage,
})

function HomePage() {
  const s = root.useLoaderData()
  const { categories, featured, zones, gallery, reviews } = Route.useLoaderData()
  const occasions = parseOccasions(s.occasions)
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to place an order.`)
  const eventWa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to book you for an event.`)
  const steps = lines(s.home_steps).map((l) => {
    const [title, ...rest] = l.split('|')
    return { title: title.trim(), text: rest.join('|').trim() }
  })
  const cheapestZone = zones.length ? Math.min(...zones.map((z) => z.fee)) : 0
  const marqueeItems = lines(s.hero_rotating)

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-cocoa text-cream">
        {s.hero_video_url ? (
          <LoopVideo src={s.hero_video_url} poster={s.hero_image_url} className="hero-media" />
        ) : (
          s.hero_image_url && <img src={s.hero_image_url} alt="" className="hero-media" />
        )}
        <div className="hero-shade" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
          <p className="eyebrow text-accent">{s.hero_eyebrow}</p>
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
        </div>
      </section>

      {/* ---------- Scrolling strip ---------- */}
      {marqueeItems.length > 0 && (
        <div className="overflow-hidden border-b border-line bg-honey py-3" aria-hidden="true">
          <div className="marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {[...marqueeItems, ...marqueeItems].map((item, n) => (
                  <span key={`${copy}-${n}`} className="flex items-center font-display text-lg text-cocoa">
                    <span className="px-6">{item}</span>
                    <span className="text-highlight">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Categories ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl sm:text-4xl">{s.home_categories_title}</h2>
          <Link to="/menu" className="font-semibold text-brand hover:underline">
            Full menu →
          </Link>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c, n) => (
            <Reveal key={c.id} delay={(n % 4) * 0.08}>
              <Link
                to="/menu"
                search={{ c: c.slug }}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-soft"
              >
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

      {/* ---------- Featured ---------- */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl">{s.home_featured_title}</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p, n) => (
              <Reveal key={p.id} delay={(n % 4) * 0.08}>
                <ProductCard p={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <ReviewsSection reviews={reviews} />

      {/* ---------- Occasions ---------- */}
      {occasions.length > 0 && (
        <section className="mt-24 bg-cocoa py-20 text-cream">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="eyebrow text-accent">Occasions</p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">{s.occasions_title}</h2>
              {s.occasions_intro && <p className="mt-3 text-cream/75">{s.occasions_intro}</p>}
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {occasions.map((o, n) => (
                <Reveal key={o.group} delay={(n % 3) * 0.08} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <h3 className="font-display text-2xl text-accent">{o.group}</h3>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {o.items.map((item) => (
                      <li key={item}>
                        <Link
                          to="/gallery"
                          search={{ o: item }}
                          className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-accent hover:text-cocoa"
                        >
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
              <Reveal delay={0.16} className="flex flex-col justify-between rounded-3xl bg-accent p-6 text-cocoa">
                <div>
                  <h3 className="font-display text-2xl">Don’t see yours?</h3>
                  <p className="mt-2 text-cocoa/80">Tell us about your event and we’ll bake for it.</p>
                </div>
                <Link to="/contact" hash="quote" className="btn btn-primary mt-6 self-start">
                  Get a quote
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Recent work ---------- */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">Recent work</h2>
            <Link to="/gallery" className="font-semibold text-brand hover:underline">
              See the gallery →
            </Link>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {gallery.map((g, n) => (
              <Reveal key={g.id} delay={(n % 3) * 0.08}>
                <Link to="/gallery" className="group relative block aspect-square overflow-hidden rounded-3xl bg-soft">
                  <img src={g.image_url} alt={g.title} loading="lazy" className="zoom-img h-full w-full object-cover" />
                  {g.occasion && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-cocoa">{g.occasion}</span>
                  )}
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      {steps.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl">How ordering works</h2>
          </Reveal>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, n) => (
              <Reveal as="li" key={st.title} delay={n * 0.1} className="rounded-3xl bg-white p-6 ring-1 ring-line">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-lg text-white tabular">
                  {n + 1}
                </span>
                <h3 className="mt-4 font-display text-xl">{st.title}</h3>
                <p className="mt-2 text-muted">{st.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {/* ---------- Events ---------- */}
      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <Reveal className="grid overflow-hidden rounded-[2rem] bg-cocoa text-cream md:grid-cols-2">
          <div className="relative min-h-64 md:min-h-full">
            {s.event_image_url && <img src={s.event_image_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
          </div>
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-accent">Events & custom orders</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">{s.event_title}</h2>
            <p className="mt-4 text-cream/80">{s.event_body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact" hash="quote" className="btn btn-primary">
                Get a quote
              </Link>
              {eventWa && (
                <a href={eventWa} target="_blank" rel="noopener" className="btn btn-ghost">
                  <WhatsAppIcon /> Chat about your event
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <FaqTeaser s={s} />

      {/* ---------- Delivery ---------- */}
      {zones.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <Reveal className="rounded-[2rem] bg-honey p-8 sm:p-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-brand">Pickup or delivery</p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">We deliver across Abuja</h2>
                <p className="mt-2 text-cocoa/75">
                  Delivery from <strong className="tabular">{formatNaira(cheapestZone)}</strong>, depending on your area. Pickup is free.
                </p>
              </div>
              <Link to="/contact" className="btn btn-primary">
                See delivery fees
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {zones.map((z) => (
                <li key={z.id} className="rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-semibold">
                  {z.name}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      )}
    </>
  )
}
