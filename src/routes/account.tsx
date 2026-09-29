import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useShop } from '~/components/Shop'
import { myOrders, signOut, updateMyDetails } from '~/fns/shop'
import { formatNaira } from '~/lib/format'
import { ORDER_STATUS } from '~/lib/orders'

export const Route = createFileRoute('/account')({
  loader: () => myOrders(),
  head: () => ({ meta: [{ title: 'Your account · Miel Cakes' }, { name: 'robots', content: 'noindex' }] }),
  component: AccountPage,
})

function AccountPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const { refresh } = useShop()

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-4xl">Your account</h1>
        <p className="mt-3 text-muted">Sign in to see your orders.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login" search={{ redirect: '/account' }} className="btn btn-primary">Sign in</Link>
          <Link to="/signup" className="btn btn-ghost text-cocoa">Create an account</Link>
        </div>
      </div>
    )
  }

  const { me, orders } = data
  async function logout() {
    await signOut()
    await refresh()
    router.navigate({ to: '/' })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-brand">Your account</p>
          <h1 className="font-display text-4xl sm:text-5xl">Hello, {me.name.split(' ')[0]}</h1>
        </div>
        <button type="button" onClick={logout} className="btn btn-ghost text-cocoa">Sign out</button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="font-display text-2xl">Your orders</h2>
          {orders.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center ring-1 ring-line">
              <p className="text-muted">No orders yet.</p>
              <Link to="/menu" className="btn btn-primary mt-5">See the menu</Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link to="/orders/$code" params={{ code: o.code }} className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-5 ring-1 ring-line transition hover:ring-brand">
                    <span className="font-display text-xl">{o.code}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ORDER_STATUS[o.status].className}`}>{ORDER_STATUS[o.status].label}</span>
                    <span className="text-sm text-muted">
                      {o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} ·{' '}
                      {new Date(`${o.needed_date}T12:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="ml-auto font-semibold tabular">{formatNaira(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <DetailsForm me={me} onSaved={refresh} />
      </div>
    </div>
  )
}

function DetailsForm({ me, onSaved }: { me: { name: string; email: string; phone: string }; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: me.name, phone: me.phone, current: '', next: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const input = 'w-full rounded-2xl border-0 bg-cream px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await updateMyDetails({ data: form })
      setForm((f) => ({ ...f, current: '', next: '' }))
      setMsg({ ok: true, text: 'Saved.' })
      await onSaved()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="h-fit space-y-4 rounded-3xl bg-white p-6 ring-1 ring-line">
      <h2 className="font-display text-2xl">Your details</h2>
      <p className="text-sm text-muted">{me.email}</p>
      <div>
        <label htmlFor="ac-name" className="mb-1.5 block text-sm font-semibold">Name</label>
        <input id="ac-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label htmlFor="ac-phone" className="mb-1.5 block text-sm font-semibold">Phone</label>
        <input id="ac-phone" type="tel" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-muted">Change password</summary>
        <div className="mt-3 space-y-3">
          <input id="ac-current" type="password" autoComplete="current-password" placeholder="Current password" className={input} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
          <input id="ac-next" type="password" autoComplete="new-password" placeholder="New password (8+ characters)" className={input} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </div>
      </details>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-highlight'}`}>{msg.text}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  )
}
