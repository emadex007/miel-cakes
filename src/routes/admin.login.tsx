import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, useAction } from '~/components/admin/ui'
import { adminLogin, hasAnyAdmin } from '~/fns/admin'
import { ArrowLeftIcon } from '~/components/icons'

export const Route = createFileRoute('/admin/login')({
  beforeLoad: ({ context }) => {
    if (context.admin) throw redirect({ to: '/admin' })
  },
  loader: () => hasAnyAdmin(),
  component: LoginPage,
})

function LoginPage() {
  const hasAdmin = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, run } = useAction()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(() => adminLogin({ data: { email, password } }))
    if (ok) {
      await router.invalidate()
      router.navigate({ to: '/admin' })
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="text-center font-display text-3xl text-cocoa">Miel Cakes</p>
      <form onSubmit={submit} className="admin-card mt-6 space-y-5 p-7">
        <h1 className="text-xl font-bold">Sign in to the dashboard</h1>
        {!hasAdmin && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No accounts yet. <Link to="/admin/setup" className="font-semibold underline">Create the owner account</Link> first.
          </p>
        )}
        <Messages error={error} />
        <Field label="Email" htmlFor="login-email">
          <input id="login-email" type="email" autoComplete="email" required className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <input id="login-password" type="password" autoComplete="current-password" required className="admin-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <a href="/" className="font-semibold text-[#667085] hover:text-cocoa"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />Back to website</a>
      </p>
    </div>
  )
}
