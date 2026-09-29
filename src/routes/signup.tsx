import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { addPendingItem, useShop } from '~/components/Shop'
import { signUp } from '~/fns/shop'
import { AuthShell, authInput } from '~/components/AuthShell'

const safeRedirect = (r: unknown) => (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '')

export const Route = createFileRoute('/signup')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirect(search.redirect)
    return r ? { redirect: r } : {}
  },
  head: () => ({ meta: [{ title: 'Create an account · Miel Cakes' }] }),
  component: SignupPage,
})

function SignupPage() {
  const { redirect } = Route.useSearch()
  const router = useRouter()
  const { refresh } = useShop()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signUp({ data: form })
      const added = await addPendingItem()
      await refresh()
      if (added) router.navigate({ to: '/cart' })
      else if (redirect) router.history.push(redirect)
      else router.navigate({ to: '/menu' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create an account" intro="It takes a minute. You'll be able to order, pay and track your orders.">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="su-name" className="mb-1.5 block text-sm font-semibold">Full name</label>
          <input id="su-name" required autoComplete="name" className={authInput} value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label htmlFor="su-phone" className="mb-1.5 block text-sm font-semibold">Phone / WhatsApp</label>
          <input id="su-phone" type="tel" required autoComplete="tel" className={authInput} value={form.phone} onChange={set('phone')} placeholder="0801 234 5678" />
        </div>
        <div>
          <label htmlFor="su-email" className="mb-1.5 block text-sm font-semibold">Email</label>
          <input id="su-email" type="email" required autoComplete="email" className={authInput} value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label htmlFor="su-pass" className="mb-1.5 block text-sm font-semibold">Password</label>
          <input id="su-pass" type="password" required minLength={8} autoComplete="new-password" className={authInput} value={form.password} onChange={set('password')} />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        {error && <p role="alert" className="rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" search={redirect ? { redirect } : {}} className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  )
}
