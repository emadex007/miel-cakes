import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, PageTitle, useAction } from '~/components/admin/ui'
import { addAdmin, changeMyPassword, listAdmins, removeAdmin } from '~/fns/admin'

export const Route = createFileRoute('/admin/staff')({
  loader: () => listAdmins(),
  component: StaffAdmin,
})

function StaffAdmin() {
  const { me, admins } = Route.useLoaderData()
  const router = useRouter()
  const staff = useAction()
  const pw = useAction()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [pass, setPass] = useState({ current: '', next: '' })
  const [confirmId, setConfirmId] = useState<number | null>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await staff.run(() => addAdmin({ data: form }), `${form.name} can now sign in.`)
    if (ok) {
      setForm({ name: '', email: '', password: '' })
      router.invalidate()
    }
  }
  async function remove(id: number) {
    const ok = await staff.run(() => removeAdmin({ data: id }), 'Account removed.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }
  async function change(e: React.FormEvent) {
    e.preventDefault()
    const ok = await pw.run(() => changeMyPassword({ data: pass }), 'Password changed.')
    if (ok) setPass({ current: '', next: '' })
  }

  return (
    <>
      <PageTitle title="Staff & password">People who can sign in to this dashboard.</PageTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <div className="admin-card divide-y divide-[#eceff5]">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {a.name} {a.id === me.id && <span className="text-sm font-normal text-[#667085]">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-[#667085]">
                    {a.email} · {a.role === 'owner' ? 'Owner' : 'Staff'}
                  </p>
                </div>
                {me.role === 'owner' && a.role !== 'owner' && (
                  confirmId === a.id ? (
                    <span className="flex gap-2 text-sm">
                      <button type="button" className="font-semibold text-red-700" onClick={() => remove(a.id)}>Remove</button>
                      <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => setConfirmId(a.id)}>
                      Remove
                    </button>
                  )
                )}
              </div>
            ))}
          </div>

          {me.role === 'owner' && (
            <form onSubmit={add} className="admin-card space-y-4 p-6">
              <h2 className="text-lg font-bold">Add a staff member</h2>
              <Messages error={staff.error} notice={staff.notice} />
              <Field label="Name" htmlFor="s-name">
                <input id="s-name" required className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Email" htmlFor="s-email">
                <input id="s-email" type="email" required className="admin-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="Temporary password" help="At least 8 characters. Share it with them privately; they can change it here." htmlFor="s-pass">
                <input id="s-pass" type="text" required minLength={8} className="admin-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <button type="submit" className="btn btn-primary" disabled={staff.busy}>
                {staff.busy ? 'Adding…' : 'Add staff member'}
              </button>
            </form>
          )}
        </section>

        <form onSubmit={change} className="admin-card h-fit space-y-4 p-6">
          <h2 className="text-lg font-bold">Change your password</h2>
          <Messages error={pw.error} notice={pw.notice} />
          <Field label="Current password" htmlFor="pw-current">
            <input id="pw-current" type="password" required autoComplete="current-password" className="admin-input" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} />
          </Field>
          <Field label="New password" help="At least 8 characters." htmlFor="pw-next">
            <input id="pw-next" type="password" required minLength={8} autoComplete="new-password" className="admin-input" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={pw.busy}>
            {pw.busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </>
  )
}
