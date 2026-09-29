import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { whatsappLink } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import type { Review } from '~/lib/types'
import { CloseIcon, WhatsAppIcon } from './icons'

/** Offer strip at the very top of the page. The visitor can hide it for this visit. */
export function PromoBanner({ s }: { s: SiteSettings }) {
  const [hidden, setHidden] = useState(false)
  const key = `promo-hidden:${s.promo_text}`
  useEffect(() => {
    try {
      if (sessionStorage.getItem(key) === '1') setHidden(true)
    } catch {
      /* storage blocked: just show it */
    }
  }, [key])
  if (s.promo_enabled !== '1' || !s.promo_text || hidden) return null

  const link = s.promo_link.trim()
  const isInternal = link.startsWith('/')
  const button = s.promo_link_label && link
  return (
    <div className="relative bg-highlight text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-10 py-2.5 text-center text-sm font-semibold">
        <span>{s.promo_text}</span>
        {button &&
          (isInternal ? (
            <a href={link} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-highlight hover:bg-accent hover:text-cocoa">
              {s.promo_link_label}
            </a>
          ) : (
            <a href={link} target="_blank" rel="noopener" className="rounded-full bg-white px-3 py-1 text-xs font-bold text-highlight hover:bg-accent hover:text-cocoa">
              {s.promo_link_label}
            </a>
          ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setHidden(true)
          try {
            sessionStorage.setItem(key, '1')
          } catch {
            /* ignore */
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/85 hover:bg-white/15"
        aria-label="Hide this message"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Round WhatsApp button fixed to the bottom-right corner. */
export function FloatingWhatsApp({ s }: { s: SiteSettings }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(t)
  }, [])
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}! I found you on your website.`)
  if (!wa) return null
  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener"
      aria-label="Chat with us on WhatsApp"
      className={`group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] p-4 text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,.45)] transition-all duration-500 hover:scale-105 sm:bottom-7 sm:right-7 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30 motion-reduce:hidden" aria-hidden="true" />
      <WhatsAppIcon className="h-7 w-7" />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap font-semibold transition-all duration-300 group-hover:max-w-[10rem] group-hover:pr-1 sm:inline">
        Chat with us
      </span>
    </a>
  )
}

/** Five small stars. */
export function Stars({ rating, className = 'h-4 w-4' }: { rating: number; className?: string }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={className} fill={n <= rating ? 'var(--c-accent)' : 'var(--c-line)'} aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  )
}

/** Review cards for the homepage. */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Reviews</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">What our customers say</h2>
        </div>
      </div>
      <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {reviews.map((r) => (
          <figure key={r.id} className="mb-5 break-inside-avoid rounded-3xl bg-white p-6 ring-1 ring-line">
            <Stars rating={r.rating} />
            <blockquote className="mt-3 text-cocoa/90">&ldquo;{r.body}&rdquo;</blockquote>
            {r.photo_url && <img src={r.photo_url} alt="" loading="lazy" className="mt-4 w-full rounded-2xl object-cover" />}
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-display text-lg text-white">
                {r.name.trim().charAt(0).toUpperCase()}
              </span>
              <span>
                <span className="block font-semibold">{r.name}</span>
                {r.occasion && <span className="block text-sm text-muted">{r.occasion}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/** Expandable list of questions. */
export function FaqList({ items, limit }: { items: { q: string; a: string }[]; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items
  return (
    <div className="divide-y divide-line rounded-3xl bg-white ring-1 ring-line">
      {list.map((f) => (
        <details key={f.q} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="text-lg">{f.q}</span>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-honey text-lg leading-none transition group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="mt-3 leading-relaxed text-cocoa/80">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function parseFaqs(value: string | undefined) {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [q, ...rest] = l.split('|')
      return { q: q.trim(), a: rest.join('|').trim() }
    })
    .filter((f) => f.q && f.a)
}

export function FaqTeaser({ s }: { s: SiteSettings }) {
  const faqs = parseFaqs(s.faqs)
  if (!faqs.length) return null
  return (
    <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow text-brand">FAQs</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">{s.faq_title}</h2>
          <p className="mt-3 text-muted">Can&rsquo;t find your answer? Chat with us on WhatsApp.</p>
          <Link to="/faq" className="btn btn-ghost mt-6 text-cocoa">
            All questions
          </Link>
        </div>
        <FaqList items={faqs} limit={4} />
      </div>
    </section>
  )
}
