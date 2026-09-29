import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, MediaField, Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { deleteCategory, listCategories, saveCategory } from '~/fns/admin'
import type { Category } from '~/lib/types'

export const Route = createFileRoute('/admin/categories')({
  loader: () => listCategories(),
  component: CategoriesAdmin,
})

type Draft = { id?: number; name: string; description: string; image_url: string; sort: number; is_active: boolean }
const toDraft = (c?: Category): Draft =>
  c
    ? { id: c.id, name: c.name, description: c.description, image_url: c.image_url, sort: c.sort, is_active: !!c.is_active }
    : { name: '', description: '', image_url: '', sort: 99, is_active: true }

function CategoriesAdmin() {
  const categories = Route.useLoaderData()
  const router = useRouter()
  const [editing, setEditing] = useState<Draft | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const { busy, error, notice, run } = useAction()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveCategory({ data: editing }), 'Category saved.')
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }
  async function remove(id: number) {
    const ok = await run(() => deleteCategory({ data: id }), 'Category deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <PageTitle
        title="Categories"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(toDraft())}>
            + Add category
          </button>
        }
      >
        Groups on the menu, like Cakes or Small Chops. Hide a category to take all its items off the website.
      </PageTitle>
      <div className="mb-4">
        <Messages error={error} notice={notice} />
      </div>

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <h2 className="text-lg font-bold sm:col-span-2">{editing.id ? `Edit ${editing.name}` : 'New category'}</h2>
          <div className="space-y-5">
            <Field label="Name" htmlFor="c-name">
              <input id="c-name" required className="admin-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Short description" htmlFor="c-desc">
              <textarea id="c-desc" rows={3} className="admin-input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Position" help="Lower numbers show first." htmlFor="c-sort">
              <input id="c-sort" type="number" className="admin-input w-28" value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} />
            </Field>
            <Toggle id="c-active" checked={editing.is_active} onChange={(v) => setEditing({ ...editing, is_active: v })} label="Show on website" />
          </div>
          <Field label="Photo" htmlFor="c-image">
            <MediaField id="c-image" value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} />
          </Field>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save category'}
            </button>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.id} className="admin-card flex items-center gap-4 p-3 pr-5">
            <img src={c.image_url || undefined} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-[#f3ece9] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {c.name} {!c.is_active && <span className="ml-1 rounded bg-[#f3ece9] px-1.5 py-0.5 text-xs text-[#85726d]">Hidden</span>}
              </p>
              <p className="text-sm text-[#85726d]">
                {c.product_count ?? 0} item{c.product_count === 1 ? '' : 's'} · position {c.sort}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setEditing(toDraft(c))}>
                Edit
              </button>
              {confirmId === c.id ? (
                <span className="flex gap-2">
                  <button type="button" className="font-semibold text-red-700" onClick={() => remove(c.id)}>Delete</button>
                  <button type="button" className="text-[#85726d]" onClick={() => setConfirmId(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="text-[#85726d] hover:text-red-700" onClick={() => setConfirmId(c.id)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
