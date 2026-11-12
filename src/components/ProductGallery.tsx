// The item's pictures and videos: one big view with small thumbnails to switch.
import { useState, type ReactNode } from 'react'
import type { ProductMedia } from '~/lib/types'
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from './icons'

export function ProductGallery({
  main,
  media,
  alt,
  grey,
  children,
}: {
  main: string
  media: ProductMedia[]
  alt: string
  grey?: boolean
  /** Badges drawn over the big view */
  children?: ReactNode
}) {
  const items: ProductMedia[] = [...(main ? [{ url: main, kind: 'image' as const }] : []), ...media.filter((m) => m.url !== main)]
  const [i, setI] = useState(0)
  const cur = items[Math.min(i, items.length - 1)]
  const go = (by: number) => setI((n) => (n + by + items.length) % items.length)

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-soft">
        {cur &&
          (cur.kind === 'video' ? (
            <video key={cur.url} src={cur.url} controls playsInline autoPlay muted loop className="h-full w-full bg-black object-contain" />
          ) : (
            <img src={cur.url} alt={alt} className={`h-full w-full object-cover ${grey ? 'grayscale' : ''}`} />
          ))}
        {children}
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous picture"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-cocoa shadow-md transition hover:bg-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next picture"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2.5 text-cocoa shadow-md transition hover:bg-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((m, k) => (
            <li key={`${m.url}-${k}`} className="shrink-0">
              <button
                type="button"
                aria-label={`Show ${m.kind === 'video' ? 'video' : 'picture'} ${k + 1}`}
                aria-current={k === i}
                onClick={() => setI(k)}
                className={`relative block h-16 w-16 overflow-hidden rounded-xl ring-2 transition sm:h-20 sm:w-20 ${k === i ? 'ring-brand' : 'ring-transparent opacity-80 hover:opacity-100'}`}
              >
                {m.kind === 'video' ? (
                  <>
                    <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                      <PlayIcon className="h-5 w-5" />
                    </span>
                  </>
                ) : (
                  <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
