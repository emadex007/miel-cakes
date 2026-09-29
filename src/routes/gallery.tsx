import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CloseIcon } from '~/components/icons'
import { Reveal } from '~/components/motion'
import { getGallery } from '~/fns/business'
import type { GalleryItem } from '~/lib/types'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/gallery')({
  validateSearch: (search: Record<string, unknown>): { o?: string } =>
    typeof search.o === 'string' && search.o ? { o: search.o } : {},
  loader: () => getGallery(),
  head: () => ({ meta: [{ title: 'Gallery · Miel Cakes' }] }),
  component: GalleryPage,
})

function GalleryPage() {
  const s = root.useLoaderData()
  const items = Route.useLoaderData()
  const { o } = Route.useSearch()
  const [open, setOpen] = useState<GalleryItem | null>(null)

  const occasions = Array.from(new Set(items.map((i) => i.occasion).filter(Boolean)))
  const shown = o ? items.filter((i) => i.occasion.toLowerCase() === o.toLowerCase()) : items

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = shown.findIndex((i) => i.id === open.id)
        const next = shown[(idx + (e.key === 'ArrowRight' ? 1 : shown.length - 1)) % shown.length]
        if (next) setOpen(next)
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, shown])

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Gallery</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.gallery_title}</h1>
      {s.gallery_intro && <p className="mt-4 max-w-2xl text-lg text-muted">{s.gallery_intro}</p>}

      {occasions.length > 1 && (
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter by occasion">
          <Link
            to="/gallery"
            search={{}}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${!o ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`}
          >
            All
          </Link>
          {occasions.map((occ) => (
            <Link
              key={occ}
              to="/gallery"
              search={{ o: occ }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                o?.toLowerCase() === occ.toLowerCase() ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'
              }`}
            >
              {occ}
            </Link>
          ))}
        </nav>
      )}

      {shown.length ? (
        <div className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4">
          {shown.map((g, n) => (
            <Reveal key={g.id} delay={(n % 4) * 0.06} className="mb-4 break-inside-avoid">
              <button
                type="button"
                onClick={() => setOpen(g)}
                className="group relative block w-full overflow-hidden rounded-3xl bg-soft text-left"
                aria-label={`View ${g.title || 'photo'}`}
              >
                <img src={g.image_url} alt={g.title} loading="lazy" className="zoom-img w-full object-cover" />
                {(g.title || g.occasion) && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa/85 to-transparent p-4 pt-10 text-cream opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    {g.occasion && <span className="block text-xs font-bold uppercase tracking-wider text-accent">{g.occasion}</span>}
                    {g.title && <span className="block font-semibold">{g.title}</span>}
                  </span>
                )}
              </button>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-3xl bg-white p-10 text-center ring-1 ring-line">
          <p className="font-display text-2xl">No photos for {o} yet</p>
          <p className="mt-2 text-muted">We bake for this occasion. Tell us what you have in mind.</p>
          <Link to="/contact" hash="quote" className="btn btn-primary mt-6">Get a quote</Link>
        </div>
      )}

      <Reveal className="mt-20 flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-cocoa p-8 text-cream sm:flex-row sm:items-center sm:p-12">
        <div>
          <h2 className="font-display text-3xl">Like what you see?</h2>
          <p className="mt-2 text-cream/80">Send us a picture of what you want and we&rsquo;ll give you a price.</p>
        </div>
        <Link to="/contact" hash="quote" className="btn btn-light">Get a quote</Link>
      </Reveal>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={open.title || 'Photo'} onClick={() => setOpen(null)}>
          <button type="button" onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <CloseIcon className="h-7 w-7" />
          </button>
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={open.image_url} alt={open.title} className="max-h-[80vh] w-auto rounded-2xl object-contain" />
            {(open.title || open.occasion || open.description) && (
              <figcaption className="mt-4 text-center text-cream">
                {open.occasion && <span className="block text-xs font-bold uppercase tracking-wider text-accent">{open.occasion}</span>}
                {open.title && <span className="block font-display text-xl">{open.title}</span>}
                {open.description && <span className="mt-1 block text-sm text-cream/75">{open.description}</span>}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  )
}
