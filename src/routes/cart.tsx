import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useShop } from '~/components/Shop'
import { getCheckout, updateCartItem } from '~/fns/shop'
import { formatNaira } from '~/lib/format'

export const Route = createFileRoute('/cart')({
  loader: () => getCheckout(),
  head: () => ({ meta: [{ title: 'Your cart · Miel Cakes' }] }),
  component: CartPage,
})

function CartPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const { refresh } = useShop()
  const [busyId, setBusyId] = useState<number | null>(null)

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Your cart</h1>
        <p className="mt-3 text-muted">Sign in to see your cart and place an order.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" search={{ redirect: '/cart' }} className="btn btn-primary">Sign in</Link>
          <Link to="/signup" search={{ redirect: '/cart' }} className="btn btn-ghost text-cocoa">Create an account</Link>
        </div>
      </div>
    )
  }

  const { lines, maxNotice } = data
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
  const soldOut = lines.filter((l) => !l.is_available)

  async function setQty(id: number, qty: number) {
    setBusyId(id)
    try {
      await updateCartItem({ data: { id, qty } })
      await Promise.all([router.invalidate(), refresh()])
    } finally {
      setBusyId(null)
    }
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <p className="mt-3 text-muted">Cakes, small chops and pastries are waiting for you.</p>
        <Link to="/menu" className="btn btn-primary mt-8">See the menu</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <h1 className="font-display text-4xl sm:text-5xl">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.id} className={`flex gap-4 rounded-3xl bg-white p-4 ring-1 ring-line ${busyId === l.id ? 'opacity-60' : ''}`}>
              <Link to="/menu/$slug" params={{ slug: l.slug }} className="shrink-0">
                <img src={l.image_url || undefined} alt="" className="h-24 w-24 rounded-2xl bg-soft object-cover sm:h-28 sm:w-28" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to="/menu/$slug" params={{ slug: l.slug }} className="font-display text-xl hover:text-brand">{l.name}</Link>
                    <p className="text-sm text-muted">{l.option_label}</p>
                    {l.note && <p className="mt-1 text-sm italic text-cocoa/75">&ldquo;{l.note}&rdquo;</p>}
                    {!l.is_available && <p className="mt-1 text-sm font-semibold text-highlight">Sold out. Please remove.</p>}
                  </div>
                  <p className="shrink-0 font-semibold tabular">{formatNaira(l.unit_price * l.qty)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-full bg-cream ring-1 ring-line">
                    <button type="button" className="h-9 w-9 text-lg" onClick={() => setQty(l.id, l.qty - 1)} disabled={busyId === l.id} aria-label={`One less ${l.name}`}>−</button>
                    <span className="w-8 text-center font-bold tabular">{l.qty}</span>
                    <button type="button" className="h-9 w-9 text-lg" onClick={() => setQty(l.id, l.qty + 1)} disabled={busyId === l.id} aria-label={`One more ${l.name}`}>+</button>
                  </div>
                  <button type="button" className="text-sm text-muted hover:text-highlight" onClick={() => setQty(l.id, 0)} disabled={busyId === l.id}>
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line lg:sticky lg:top-28">
          <h2 className="font-display text-2xl">Summary</h2>
          <div className="flex justify-between tabular"><span className="text-muted">Items</span><span className="font-semibold">{formatNaira(subtotal)}</span></div>
          <p className="text-sm text-muted">Delivery (if you choose it) is added at checkout, based on your area.</p>
          {maxNotice > 0 && (
            <p className="rounded-2xl bg-honey px-4 py-3 text-sm">
              Some items need <strong>{maxNotice} day{maxNotice === 1 ? '' : 's'}</strong> of notice. You&rsquo;ll pick your date at checkout.
            </p>
          )}
          {soldOut.length > 0 ? (
            <p className="rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">Remove sold-out items to check out.</p>
          ) : (
            <Link to="/checkout" className="btn btn-primary w-full">Checkout</Link>
          )}
          <Link to="/menu" className="block text-center text-sm font-semibold text-muted hover:text-brand">Keep shopping</Link>
        </aside>
      </div>
    </div>
  )
}
