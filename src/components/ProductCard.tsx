import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addToCart } from '~/fns/shop'
import { formatNaira, fromPrice } from '~/lib/format'
import type { Product } from '~/lib/types'
import { burstSprinkles } from './motion'
import { savePendingItem, useShop } from './Shop'
import { ArrowRightIcon, CakeIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon } from './icons'

/** Adds to cart, or sends them to sign in first (the item is added for them afterwards). */
function useBuy(p: Product) {
  const router = useRouter()
  const { setCartCount } = useShop()
  const [busy, setBusy] = useState<'' | 'add' | 'buy'>('')
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  async function go(kind: 'add' | 'buy', optionLabel: string, qty: number, note = '', sprinkleFrom?: HTMLElement | null) {
    setBusy(kind)
    setError('')
    const item = { product_id: p.id, option_label: optionLabel, qty, note: note.trim() }
    try {
      const r = await addToCart({ data: item })
      if (r.needLogin) {
        savePendingItem(item)
        router.navigate({ to: '/login', search: { redirect: kind === 'buy' ? '/checkout' : `/menu/${p.slug}` } })
        return
      }
      setCartCount(r.cartCount)
      if (kind === 'buy') {
        router.navigate({ to: '/checkout' })
        return
      }
      setAdded(true)
      if (sprinkleFrom) burstSprinkles(sprinkleFrom)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to cart. Try again.')
    } finally {
      setBusy('')
    }
  }
  return { busy, error, added, go }
}

const badgeClass = (badge: string) => {
  const b = badge.toLowerCase()
  if (b === 'hot' || b === 'bestseller') return 'bg-highlight text-white'
  if (b === 'new') return 'bg-brand text-white'
  return 'bg-accent text-cocoa'
}

export function ProductCard({ p }: { p: Product }) {
  const soldOut = !p.is_available
  const [quick, setQuick] = useState(false)
  const { busy, error, go } = useBuy(p)
  const singleOption = p.options.length <= 1

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_0_var(--c-line)] ring-1 ring-line transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_var(--c-dark)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <Link to="/menu/$slug" params={{ slug: p.slug }} tabIndex={-1} aria-hidden="true">
          {p.image_url && <img src={p.image_url} alt="" loading="lazy" className={`zoom-img h-full w-full object-cover ${soldOut ? 'grayscale' : ''}`} />}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {p.badge && !soldOut && <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass(p.badge)}`}>{p.badge}</span>}
          {soldOut ? (
            <span className="rounded-full bg-highlight px-2.5 py-1 text-xs font-bold text-white">Sold out today</span>
          ) : p.availability === 'preorder' ? (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-cocoa">
              Order {p.notice_days > 0 ? `${p.notice_days} day${p.notice_days > 1 ? 's' : ''} ahead` : 'ahead'}
            </span>
          ) : (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-cocoa">Available daily</span>
          )}
        </div>
        {!soldOut && (
          <button
            type="button"
            onClick={() => setQuick(true)}
            className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-bold text-cocoa shadow-md transition hover:bg-brand hover:text-white sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus:translate-y-0 sm:focus:opacity-100"
          >
            Quick view
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.category_name}</p>
        <h3 className="font-display text-xl leading-snug">
          <Link to="/menu/$slug" params={{ slug: p.slug }} className="hover:text-brand">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="font-semibold text-brand tabular">
            {p.options.length > 1 ? 'From ' : ''}
            {formatNaira(fromPrice(p.options))}
          </p>
          {!soldOut &&
            (p.customizable ? (
              <Link to="/menu/$slug" params={{ slug: p.slug }} hash="customise" className="btn btn-primary !px-4 !py-2 text-sm">
                Customise
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary !px-4 !py-2 text-sm"
                disabled={!!busy}
                onClick={() => (singleOption ? go('buy', p.options[0]?.label ?? '', 1) : setQuick(true))}
              >
                {busy === 'buy' ? 'One moment…' : 'Buy now'}
              </button>
            ))}
        </div>
        {error && <p role="alert" className="text-xs font-semibold text-highlight">{error}</p>}
      </div>
      {/* Rendered at page level so the card's hover movement can't trap it */}
      {quick && typeof document !== 'undefined' && createPortal(<QuickView p={p} onClose={() => setQuick(false)} />, document.body)}
    </article>
  )
}

/** Product in a pop-up: choose a size and quantity, then add to cart or buy now. */
function QuickView({ p, onClose }: { p: Product; onClose: () => void }) {
  const [optIndex, setOptIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const addBtn = useRef<HTMLButtonElement>(null)
  const { busy, error, added, go } = useBuy(p)
  const option = p.options[optIndex] ?? p.options[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-cocoa/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        className="chat-pop relative grid max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-cream sm:grid-cols-2 sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-2 shadow hover:text-highlight" aria-label="Close">
          <CloseIcon className="h-5 w-5" />
        </button>
        <div className="aspect-square bg-soft sm:aspect-auto">
          {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.category_name}</p>
          <h2 className="mt-1 font-display text-3xl leading-tight">{p.name}</h2>
          <p className="mt-2 text-2xl font-bold text-brand tabular">{formatNaira((option?.price ?? 0) * qty)}</p>
          {p.description && <p className="mt-3 line-clamp-4 text-cocoa/80">{p.description}</p>}
          {p.availability === 'preorder' && p.notice_days > 0 && (
            <p className="mt-3 text-sm font-semibold text-cocoa/70">Order {p.notice_days} day{p.notice_days === 1 ? '' : 's'} ahead</p>
          )}

          {p.options.length > 1 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold">Size</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.options.map((o, n) => (
                  <label key={o.label} className={`cursor-pointer rounded-2xl px-3.5 py-2 text-sm ring-1 transition ${n === optIndex ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`}>
                    <input type="radio" name={`qv-${p.id}`} className="sr-only" checked={n === optIndex} onChange={() => setOptIndex(n)} />
                    <span className="font-semibold">{o.label}</span> <span className="tabular opacity-75">{formatNaira(o.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center rounded-full bg-white ring-1 ring-line">
              <button type="button" className="flex h-10 w-10 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer"><MinusIcon /></button>
              <span className="w-8 text-center font-bold tabular" aria-live="polite">{qty}</span>
              <button type="button" className="flex h-10 w-10 items-center justify-center" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="More"><PlusIcon /></button>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:mt-auto sm:pt-6">
            {!!p.customizable && (
              <Link to="/menu/$slug" params={{ slug: p.slug }} hash="customise" className="btn btn-primary w-full">
                <CakeIcon /> Customise this cake
              </Link>
            )}
            <button type="button" className={`btn w-full ${p.customizable ? 'btn-ghost text-cocoa' : 'btn-primary'}`} disabled={!!busy} onClick={() => go('buy', option?.label ?? '', qty)}>
              {busy === 'buy' ? 'One moment…' : 'Buy now'}
            </button>
            <button ref={addBtn} type="button" className="btn btn-ghost w-full text-cocoa" disabled={!!busy} onClick={() => go('add', option?.label ?? '', qty, '', addBtn.current)}>
              {busy === 'add' ? 'Adding…' : added ? <><CheckIcon className="mr-1 inline h-4 w-4 align-[-3px]" />Added. Add another</> : 'Add to cart'}
            </button>
            {added && (
              <Link to="/cart" className="text-center text-sm font-semibold text-brand hover:underline">
                Go to cart <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
              </Link>
            )}
            <Link to="/menu/$slug" params={{ slug: p.slug }} className="text-center text-sm font-semibold text-muted hover:text-brand">
              Add a cake message or see full details
            </Link>
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-highlight">{error}</p>}
        </div>
      </div>
    </div>
  )
}
