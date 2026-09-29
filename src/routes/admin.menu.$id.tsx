import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, MediaField, Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { getProductAdmin, saveProduct, type ProductInput } from '~/fns/admin'

export const Route = createFileRoute('/admin/menu/$id')({
  loader: ({ params }) => getProductAdmin({ data: params.id }),
  component: ProductEditor,
})

function ProductEditor() {
  const { product, categories } = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, run } = useAction()
  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          id: product.id,
          category_id: product.category_id,
          name: product.name,
          description: product.description,
          image_url: product.image_url,
          options: product.options.length ? product.options : [{ label: 'Regular', price: 0 }],
          availability: product.availability,
          notice_days: product.notice_days,
          is_available: !!product.is_available,
          featured: !!product.featured,
          sort: product.sort,
        }
      : {
          category_id: categories[0]?.id ?? 0,
          name: '',
          description: '',
          image_url: '',
          options: [{ label: 'Regular', price: 0 }],
          availability: 'daily',
          notice_days: 0,
          is_available: true,
          featured: false,
          sort: 0,
        },
  )
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setOption = (n: number, key: 'label' | 'price', v: string) =>
    set(
      'options',
      form.options.map((o, i) => (i === n ? { ...o, [key]: key === 'price' ? Number(v.replace(/[^\d]/g, '')) || 0 : v } : o)),
    )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(() => saveProduct({ data: form }))
    if (ok) {
      await router.invalidate()
      router.navigate({ to: '/admin/menu' })
    }
  }

  return (
    <>
      <Link to="/admin/menu" className="text-sm font-semibold text-[#667085] hover:text-cocoa">
        ← All menu items
      </Link>
      <div className="mt-3">
        <PageTitle title={product ? `Edit ${product.name}` : 'Add a menu item'} />
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="admin-card space-y-6 p-6 sm:p-8">
          <Field label="Name" htmlFor="p-name">
            <input id="p-name" required className="admin-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Red Velvet Cake" />
          </Field>
          <Field label="Category" htmlFor="p-cat">
            <select id="p-cat" className="admin-input" value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" help="What's in it, flavours, what it's good for." htmlFor="p-desc">
            <textarea id="p-desc" rows={4} className="admin-input" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <fieldset>
            <legend className="admin-label">Sizes and prices (₦)</legend>
            <p className="admin-help !mt-0 mb-3">Add one row per size or pack, e.g. 6 inch, 8 inch, or 20 pieces, 50 pieces.</p>
            <div className="space-y-2">
              {form.options.map((o, n) => (
                <div key={n} className="flex items-center gap-2">
                  <input
                    id={`opt-label-${n}`}
                    aria-label={`Size ${n + 1} name`}
                    className="admin-input flex-1"
                    value={o.label}
                    placeholder="e.g. 8 inch"
                    onChange={(e) => setOption(n, 'label', e.target.value)}
                  />
                  <input
                    id={`opt-price-${n}`}
                    aria-label={`Size ${n + 1} price in naira`}
                    inputMode="numeric"
                    className="admin-input w-36 tabular"
                    value={o.price ? o.price.toLocaleString('en-NG') : ''}
                    placeholder="Price"
                    onChange={(e) => setOption(n, 'price', e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-2 text-xl text-[#98a2b3] hover:text-red-700 disabled:opacity-30"
                    onClick={() => set('options', form.options.filter((_, i) => i !== n))}
                    disabled={form.options.length === 1}
                    aria-label={`Remove size ${n + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-brand hover:underline"
              onClick={() => set('options', [...form.options, { label: '', price: 0 }])}
            >
              + Add another size
            </button>
          </fieldset>
        </div>

        <div className="space-y-6">
          <div className="admin-card p-6">
            <Field label="Photo" htmlFor="p-image">
              <MediaField id="p-image" value={form.image_url} onChange={(v) => set('image_url', v)} />
            </Field>
          </div>
          <div className="admin-card space-y-5 p-6">
            <Field label="When can customers get it?" htmlFor="p-avail">
              <select
                id="p-avail"
                className="admin-input"
                value={form.availability}
                onChange={(e) => set('availability', e.target.value as ProductInput['availability'])}
              >
                <option value="daily">Available daily (same day)</option>
                <option value="preorder">Order ahead only</option>
              </select>
            </Field>
            {form.availability === 'preorder' && (
              <Field label="Days of notice needed" htmlFor="p-notice">
                <input
                  id="p-notice"
                  type="number"
                  min={0}
                  max={60}
                  className="admin-input w-28"
                  value={form.notice_days}
                  onChange={(e) => set('notice_days', Number(e.target.value))}
                />
              </Field>
            )}
            <Toggle id="p-available" checked={!!form.is_available} onChange={(v) => set('is_available', v)} label="Available (switch off when sold out)" />
            <Toggle id="p-featured" checked={!!form.featured} onChange={(v) => set('featured', v)} label="Show on homepage" />
            <Field label="Position" help="Lower numbers show first in the category." htmlFor="p-sort">
              <input id="p-sort" type="number" className="admin-input w-28" value={form.sort} onChange={(e) => set('sort', Number(e.target.value))} />
            </Field>
          </div>
          <div className="space-y-3">
            <Messages error={error} />
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Saving…' : product ? 'Save changes' : 'Add to menu'}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
