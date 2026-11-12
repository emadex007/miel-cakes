import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { LoopVideo, Reveal } from '~/components/motion'
import { getGallery } from '~/fns/business'
import { lines, paragraphs } from '~/lib/format'
import { ArrowRightIcon } from '~/components/icons'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/about')({
  loader: () => getGallery(),
  head: () => ({ meta: [{ title: 'About · Miel Cakes' }] }),
  component: AboutPage,
})

const pairs = (value: string | undefined) =>
  lines(value).map((l) => {
    const [a, ...rest] = l.split('|')
    return { a: a.trim(), b: rest.join('|').trim() }
  })

function AboutPage() {
  const s = root.useLoaderData()
  const gallery = Route.useLoaderData().slice(0, 6)
  const stats = pairs(s.about_stats)
  const values = pairs(s.about_values)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      {/* Story */}
      <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {s.about_eyebrow && <p className="eyebrow text-brand">{s.about_eyebrow}</p>}
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.about_title}</h1>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-cocoa/85">
            {paragraphs(s.about_body).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {s.about_image_url && (
            <Reveal className={s.about_video_url ? '' : 'col-span-2'}>
              <img src={s.about_image_url} alt="" className="aspect-[3/4] w-full rounded-[1.75rem] object-cover" />
            </Reveal>
          )}
          {s.about_video_url && (
            <Reveal delay={0.12} className={s.about_image_url ? 'mt-10' : 'col-span-2'}>
              <LoopVideo src={s.about_video_url} className="aspect-[3/4] w-full rounded-[1.75rem] bg-soft object-cover" />
            </Reveal>
          )}
        </div>
      </div>

      {/* Numbers */}
      {stats.length > 0 && (
        <Reveal className="mt-20 grid gap-4 rounded-[2rem] bg-cocoa p-8 text-cream sm:grid-cols-3 sm:p-10">
          {stats.map((st) => (
            <div key={st.a + st.b} className="text-center sm:text-left">
              <p className="font-display text-5xl text-accent tabular">{st.a}</p>
              <p className="mt-1 text-cream/80">{st.b}</p>
            </div>
          ))}
        </Reveal>
      )}

      {/* Values */}
      {values.length > 0 && (
        <section className="pt-24">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl">{s.about_values_title}</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {values.map((v, n) => (
              <Reveal key={v.a} delay={n * 0.08} className="rounded-3xl bg-white p-7 ring-1 ring-line">
                <span className="block h-1.5 w-10 rounded-full bg-accent" />
                <h3 className="mt-5 font-display text-2xl">{v.a}</h3>
                <p className="mt-2 text-muted">{v.b}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Gallery preview */}
      {gallery.length > 0 && (
        <section className="pt-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">From our kitchen</h2>
            <Link to="/gallery" className="font-semibold text-brand hover:underline">
              See the full gallery <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
            </Link>
          </Reveal>
          <div className="mt-8 columns-2 gap-4 md:columns-3">
            {gallery.map((g, n) => (
              <Reveal key={g.id} delay={(n % 3) * 0.08} className="mb-4 break-inside-avoid">
                <img src={g.image_url} alt={g.title} loading="lazy" className="w-full rounded-3xl object-cover" />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Closing call to action */}
      {s.about_cta_title && (
        <Reveal className="mt-24 rounded-[2rem] bg-honey p-8 text-center sm:p-14">
          <h2 className="font-display text-3xl sm:text-4xl">{s.about_cta_title}</h2>
          {s.about_cta_body && <p className="mx-auto mt-3 max-w-xl text-cocoa/80">{s.about_cta_body}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/menu" className="btn btn-primary">See the menu</Link>
            <Link to="/contact" hash="quote" className="btn btn-ghost text-cocoa">Get a quote</Link>
          </div>
        </Reveal>
      )}
    </div>
  )
}
