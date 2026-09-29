import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, useAction } from '~/components/admin/ui'
import { hasAnyAdmin, setupOwner } from '~/fns/admin'

export const Route = createFileRoute('/admin/setup')({
  beforeLoad: async () => {
    if (await hasAnyAdmin()) throw redirect({ to: '/admin/login' })
  },
  component: SetupPage,
})

function SetupPage() {
  const router = useRouter()
  const { busy, error, run, setError } = useAction()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('The two passwords don’t match.')
    const ok = await run(() => setupOwner({ data: { name: form.name, email: form.email, password: form.password } }))
    if (ok) {
      await router.invalidate()
      router.navigate({ to: '/admin' })
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="text-center font-display text-3xl text-cocoa">Miel Cakes</p>
      <form onSubmit={submit} className="admin-card mt-6 space-y-5 p-7">
        <div>
          <h1 className="text-xl font-bold">Create the owner account</h1>
          <p className="mt-1 text-sm text-[#667085]">This page only works once. After this, add staff from the dashboard.</p>
        </div>
        <Messages error={error} />
        <Field label="Your name" htmlFor="setup-name">
          <input id="setup-name" required className="admin-input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" htmlFor="setup-email">
          <input id="setup-email" type="email" required autoComplete="email" className="admin-input" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" help="At least 8 characters." htmlFor="setup-password">
          <input id="setup-password" type="password" required minLength={8} autoComplete="new-password" className="admin-input" value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="setup-confirm">
          <input id="setup-confirm" type="password" required autoComplete="new-password" className="admin-input" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
