import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { deleteProduct, listProductsAdmin, toggleProductFlag } from '~/fns/admin'
import { formatNaira, fromPrice } from '~/lib/format'

export const Route = createFileRoute('/admin/menu/')({
  loader: () => listProductsAdmin(),
  component: MenuAdmin,
})

function MenuAdmin() {
  const { products, categories } = Route.useLoaderData()
  const router = useRouter()
  const { error, notice, run } = useAction()
  const [cat, setCat] = useState<number | 'all'>('all')
  const [q, setQ] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const shown = products.filter(
    (p) => (cat === 'all' || p.category_id === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()),
  )

  async function flag(id: number, field: 'is_available' | 'featured', value: boolean) {
    await run(() => toggleProductFlag({ data: { id, field, value } }))
    router.invalidate()
  }
  async function remove(id: number) {
    const ok = await run(() => deleteProduct({ data: id }), 'Item deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <PageTitle
        title="Menu items"
        actions={
          <Link to="/admin/menu/$id" params={{ id: 'new' }} className="btn btn-primary">
            + Add item
          </Link>
        }
      >
        Switch items off when they&rsquo;re sold out, and star the ones to show on the homepage.
      </PageTitle>

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          id="menu-search"
          type="search"
          placeholder="Search items"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="admin-input max-w-xs"
        />
        <select
          id="menu-category"
          aria-label="Filter by category"
          className="admin-input max-w-xs"
          value={cat}
          onChange={(e) => setCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <Messages error={error} notice={notice} />
      </div>

      <ul className="space-y-3">
        {shown.map((p) => (
          <li key={p.id} className="admin-card flex flex-wrap items-center gap-4 p-3 pr-5">
            <img src={p.image_url || undefined} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-[#eef1f7] object-cover" />
            <div className="min-w-0 flex-1">
              <Link to="/admin/menu/$id" params={{ id: String(p.id) }} className="font-semibold hover:text-brand">
                {p.name}
              </Link>
              <p className="text-sm text-[#667085]">
                {p.category_name} · {p.options.length > 1 ? 'from ' : ''}
                <span className="tabular">{formatNaira(fromPrice(p.options))}</span>
                {p.availability === 'preorder' ? ` · ${p.notice_days} day notice` : ' · daily'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Toggle id={`avail-${p.id}`} checked={!!p.is_available} onChange={(v) => flag(p.id, 'is_available', v)} label="Available" />
              <Toggle id={`feat-${p.id}`} checked={!!p.featured} onChange={(v) => flag(p.id, 'featured', v)} label="On homepage" />
              <Link to="/admin/menu/$id" params={{ id: String(p.id) }} className="text-sm font-semibold text-brand hover:underline">
                Edit
              </Link>
              {confirmId === p.id ? (
                <span className="flex items-center gap-2 text-sm">
                  <button type="button" onClick={() => remove(p.id)} className="font-semibold text-red-700 hover:underline">
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className="text-[#667085]">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmId(p.id)} className="text-sm font-semibold text-[#667085] hover:text-red-700">
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
        {!shown.length && <li className="admin-card p-8 text-center text-[#667085]">No items match. Try another search.</li>}
      </ul>
    </>
  )
}
