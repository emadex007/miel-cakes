import { Link, getRouteApi, useRouter } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { addToCart, startGuest } from '~/fns/shop'
import { CHOICE_GROUPS, TEXT_FIELDS, parseChoices, type CakeCustom } from '~/lib/custom'
import { formatNaira } from '~/lib/format'
import type { Product } from '~/lib/types'
import { burstSprinkles } from './motion'
import { savePendingItem, useShop } from './Shop'
import { ArrowRightIcon, CartIcon, CheckIcon, ExternalIcon, GiftIcon, MinusIcon, PlusIcon } from './icons'

const root = getRouteApi('__root__')

const priceTag = (n: number) => (n > 0 ? ` (+${formatNaira(n)})` : '')

/** "Customise your cake": size, shape, flavour, layers, filling, icing, decoration, topper, notes and a picture. */
export function CakeCustomizer({ p }: { p: Product }) {
  const s = root.useLoaderData()
  const router = useRouter()
  const { me, setCartCount } = useShop()
  const groups = useMemo(
    () => CHOICE_GROUPS.map((g) => ({ ...g, choices: parseChoices(s[g.setting]) })).filter((g) => g.choices.length > 0),
    [s],
  )
  const [sizeIndex, setSizeIndex] = useState(0)
  const [picks, setPicks] = useState<CakeCustom>(() => Object.fromEntries(groups.map((g) => [g.key, g.choices[0].label])))
  const [texts, setTexts] = useState<CakeCustom>({})
  const [message, setMessage] = useState('')
  const [qty, setQty] = useState(1)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState<'' | 'add' | 'buy'>('')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const addBtn = useRef<HTMLButtonElement>(null)

  const size = p.options[sizeIndex] ?? p.options[0]
  const base = size?.price ?? 0
  const extras = groups.reduce((sum, g) => sum + (g.choices.find((c) => c.label === picks[g.key])?.price ?? 0), 0)
  const each = base + extras
  const total = each * qty

  async function go(kind: 'add' | 'buy') {
    if (!size) return
    setBusy(kind)
    setError('')
    const custom: CakeCustom = { ...picks, ...Object.fromEntries(Object.entries(texts).filter(([, v]) => v?.trim())) }
    const item = { product_id: p.id, option_label: size.label, qty, note: message.trim(), custom }
    try {
      let ref_key = ''
      if (photo) {
        if (!me) await startGuest() // no account needed: a guest cart holds the picture
        const body = new FormData()
        body.append('file', photo)
        const res = await fetch('/api/cart/reference', { method: 'POST', body })
        const d = (await res.json().catch(() => ({}))) as { key?: string; error?: string }
        if (!res.ok || !d.key) throw new Error(d.error || 'Your picture didn’t upload. Try again, or remove it.')
        ref_key = d.key
      }
      const r = await addToCart({ data: { ...item, ref_key } })
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
      setPhoto(null)
      if (addBtn.current) burstSprinkles(addBtn.current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to cart. Try again.')
    } finally {
      setBusy('')
    }
  }

  const label = 'mb-1.5 block font-semibold'
  const field = 'w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
  const section = 'font-display text-2xl text-brand'

  return (
    <div id="customise" className="mt-8 scroll-mt-28 rounded-[2rem] bg-soft p-5 sm:p-7">
      <h2 className="font-display text-3xl">{s.custom_title || 'Customise your cake'}</h2>
      {s.custom_intro && <p className="mt-1 text-cocoa/75">{s.custom_intro}</p>}

      <h3 className={`${section} mt-6 border-b border-line pb-2`}>Cake details</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="cz-size" className={label}>Cake size</label>
          <select id="cz-size" className={field} value={sizeIndex} onChange={(e) => setSizeIndex(Number(e.target.value))}>
            {p.options.map((o, n) => (
              <option key={o.label} value={n}>{o.label}: {formatNaira(o.price)}</option>
            ))}
          </select>
        </div>
        {groups.map((g) => (
          <div key={g.key}>
            <label htmlFor={`cz-${g.key}`} className={label}>{g.label}</label>
            <select id={`cz-${g.key}`} className={field} value={picks[g.key] ?? ''} onChange={(e) => setPicks({ ...picks, [g.key]: e.target.value })}>
              {g.choices.map((c) => (
                <option key={c.label} value={c.label}>{c.label}{priceTag(c.price)}</option>
              ))}
            </select>
          </div>
        ))}
        {TEXT_FIELDS.filter((f) => f.key !== 'instructions').map((f) => (
          <div key={f.key}>
            <label htmlFor={`cz-${f.key}`} className={label}>{f.label}</label>
            <input id={`cz-${f.key}`} className={field} maxLength={f.max} placeholder={f.placeholder} value={texts[f.key] ?? ''} onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label htmlFor="cz-message" className={label}>Cake message</label>
          <textarea id="cz-message" rows={2} maxLength={300} className={field} placeholder="What would you like written on the cake?" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="cz-instructions" className={label}>Special instructions</label>
          <textarea
            id="cz-instructions"
            rows={2}
            maxLength={600}
            className={field}
            placeholder="Anything else we should know? Please tell us about allergies."
            value={texts.instructions ?? ''}
            onChange={(e) => setTexts({ ...texts, instructions: e.target.value })}
          />
        </div>
      </div>

      <h3 className={`${section} mt-8 border-b border-line pb-2`}>Quantity & picture</h3>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="font-semibold">Quantity</span>
        <div className="flex items-center rounded-full bg-white ring-1 ring-line">
          <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer"><MinusIcon /></button>
          <span className="w-10 text-center font-bold tabular" aria-live="polite">{qty}</span>
          <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="More"><PlusIcon /></button>
        </div>
      </div>
      <div className="mt-5">
        <span className={label}>Picture of the cake you have in mind (optional)</span>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-ghost !py-2.5 text-sm text-cocoa" onClick={() => fileInput.current?.click()}>
            {photo ? 'Change picture' : 'Choose a picture'}
          </button>
          {photo && (
            <span className="text-sm">
              {photo.name}{' '}
              <button type="button" className="font-semibold text-muted hover:text-highlight" onClick={() => setPhoto(null)}>Remove</button>
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
        <h3 className="font-display text-2xl text-brand">Order summary</h3>
        <dl className="mt-4 space-y-2 tabular">
          <div className="flex justify-between gap-3"><dt className="text-muted">Base cake ({size?.label})</dt><dd>{formatNaira(base)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Customisations</dt><dd>{formatNaira(extras)}</dd></div>
          {qty > 1 && <div className="flex justify-between gap-3"><dt className="text-muted">Quantity</dt><dd>× {qty}</dd></div>}
          <div className="flex justify-between gap-3 border-t border-line pt-3 text-2xl font-bold text-brand"><dt>Total</dt><dd>{formatNaira(total)}</dd></div>
        </dl>
        {s.perk_text && <p className="mt-3 rounded-2xl bg-honey px-4 py-2 text-center text-sm font-semibold"><GiftIcon className="mr-1.5 inline h-4 w-4 align-[-3px]" />{s.perk_text}</p>}
        <div className="mt-5 grid gap-2">
          <button ref={addBtn} type="button" className="btn btn-primary sprinkle-host w-full !py-4 text-base" onClick={() => go('add')} disabled={!!busy}>
            {busy === 'add' ? 'Adding…' : added ? <><CheckIcon className="mr-1 inline h-4 w-4 align-[-3px]" />Added. Add another</> : <><CartIcon className="h-5 w-5" /> Add cake to cart</>}
          </button>
          <button type="button" className="btn btn-ghost w-full !py-4 text-base text-cocoa" onClick={() => go('buy')} disabled={!!busy}>
            {busy === 'buy' ? 'One moment…' : 'Buy now'}
          </button>
        </div>
        {added && (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold" role="status">
            Added to your cart. <Link to="/cart" className="text-brand hover:underline">View cart / checkout <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" /></Link>
          </p>
        )}
        {error && <p role="alert" className="mt-3 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
      </div>
    </div>
  )
}

/** The customer's choices for a customised cake, as a small list (cart, checkout, orders). */
export function CustomDetails({ rows, refUrl, dark = false }: { rows: [string, string][]; refUrl?: string; dark?: boolean }) {
  if (!rows.length && !refUrl) return null
  return (
    <div className={`mt-2 rounded-xl px-3 py-2 text-xs ${dark ? 'bg-[#f6f7fb]' : 'bg-soft'}`}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {refUrl && (
        <a href={refUrl} target="_blank" rel="noopener" className="mt-1.5 inline-block font-semibold text-brand hover:underline">
          View picture <ExternalIcon className="ml-0.5 inline h-3.5 w-3.5 align-[-2px]" />
        </a>
      )}
    </div>
  )
}
