import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { LoopVideo, Reveal } from '~/components/motion'
import { lines, paragraphs } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About · Miel Cakes' }] }),
  component: AboutPage,
})

function AboutPage() {
  const s = root.useLoaderData()
  const gallery = lines(s.gallery)
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow text-brand">Our story</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.about_title}</h1>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-cocoa/85">
            {paragraphs(s.about_body).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-primary">See the menu</Link>
            <Link to="/contact" className="btn btn-ghost">Contact us</Link>
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

      {gallery.length > 0 && (
        <section className="pt-24">
          <Reveal>
            <h2 className="font-display text-3xl sm:text-4xl">From our kitchen</h2>
          </Reveal>
          <div className="mt-8 columns-2 gap-4 md:columns-3">
            {gallery.map((src, n) => (
              <Reveal key={src + n} delay={(n % 3) * 0.08} className="mb-4 break-inside-avoid">
                <img src={src} alt="" loading="lazy" className="w-full rounded-3xl object-cover" />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
