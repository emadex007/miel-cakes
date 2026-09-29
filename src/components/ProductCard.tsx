import { Link } from '@tanstack/react-router'
import { formatNaira, fromPrice } from '~/lib/format'
import type { Product } from '~/lib/types'

export function ProductCard({ p }: { p: Product }) {
  const soldOut = !p.is_available
  return (
    <Link
      to="/menu/$slug"
      params={{ slug: p.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_0_var(--c-line)] ring-1 ring-line transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_var(--c-dark)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {p.image_url && (
          <img src={p.image_url} alt={p.name} loading="lazy" className={`zoom-img h-full w-full object-cover ${soldOut ? 'grayscale' : ''}`} />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-cocoa px-2.5 py-1 text-xs font-bold text-cream">Sold out today</span>
          ) : p.availability === 'preorder' ? (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-cocoa">
              Order {p.notice_days > 0 ? `${p.notice_days} day${p.notice_days > 1 ? 's' : ''} ahead` : 'ahead'}
            </span>
          ) : (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-cocoa">Available daily</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.category_name}</p>
        <h3 className="font-display text-xl leading-snug">{p.name}</h3>
        <p className="mt-auto pt-3 font-semibold text-brand tabular">
          {p.options.length > 1 ? 'From ' : ''}
          {formatNaira(fromPrice(p.options))}
        </p>
      </div>
    </Link>
  )
}
