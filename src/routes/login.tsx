import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { addPendingItem, useShop } from '~/components/Shop'
import { AuthShell, authInput } from '~/components/AuthShell'
import { signIn } from '~/fns/shop'
import { whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

const safeRedirect = (r: unknown) => (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '')

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(search.redirect)
    return r ? { redirect: r } : {}
  },
  head: () => ({ meta: [{ title: 'Sign in · Miel Cakes' }] }),
  component: LoginPage,
})


function LoginPage() {
  const s = root.useLoaderData()
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const { refresh } = useShop()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const forgot = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I forgot the password for my account. My email is: `)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn({ data: { email, password } })
      const added = await addPendingItem()
      await refresh()
      if (added && redirect !== '/checkout') router.navigate({ to: '/cart' }) // "Buy now" goes straight on to checkout
      else if (redirect) router.history.push(redirect)
      else router.navigate({ to: '/account' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Sign in" intro="Sign in to add treats to your cart, check out and track your orders.">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="li-email" className="mb-1.5 block text-sm font-semibold">Email</label>
          <input id="li-email" type="email" required autoComplete="email" className={authInput} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="li-pass" className="mb-1.5 block text-sm font-semibold">Password</label>
          <input id="li-pass" type="password" required autoComplete="current-password" className={authInput} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm">
        <p>
          New here?{' '}
          <Link to="/signup" search={redirect ? { redirect } : {}} className="font-semibold text-brand hover:underline">Create an account</Link>
        </p>
        {forgot && (
          <p>
            <a href={forgot} target="_blank" rel="noopener" className="text-muted hover:text-brand">Forgot your password? Message us on WhatsApp</a>
          </p>
        )}
      </div>
    </AuthShell>
  )
}
