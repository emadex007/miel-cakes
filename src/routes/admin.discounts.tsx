import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { deleteDiscount, listDiscounts, saveDiscount, setDiscountActive, type DiscountInput } from '~/fns/discounts'
import { formatNaira } from '~/lib/format'
import { DatePicker } from '~/components/DatePicker'

export const Route = createFileRoute('/admin/discounts')({
  loader: () => listDiscounts(),
  component: DiscountsAdmin,
})

type Row = Awaited<ReturnType<typeof listDiscounts>>[number]

const blank = (): DiscountInput => ({ code: '', kind: 'percent', value: 10, min_order: 0, max_uses: 0, starts_on: '', ends_on: '', is_active: true, note: '' })
const toInput = (d: Row): DiscountInput => ({
  id: d.id,
  code: d.code,
  kind: d.kind,
  value: d.value,
  min_order: d.min_order,
  max_uses: d.max_uses,
  starts_on: d.starts_on,
  ends_on: d.ends_on,
  is_active: !!d.is_active,
  note: d.note,
})
const today = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10)

function status(d: Row) {
  if (!d.is_active) return { label: 'Switched off', className: 'bg-slate-100 text-slate-600' }
  if (d.ends_on && today() > d.ends_on) return { label: 'Expired', className: 'bg-slate-100 text-slate-600' }
  if (d.max_uses > 0 && d.used_count >= d.max_uses) return { label: 'Used up', className: 'bg-slate-100 text-slate-600' }
  if (d.starts_on && today() < d.starts_on) return { label: `Starts ${formatDate(d.starts_on)}`, className: 'bg-amber-100 text-amber-900' }
  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' }
}

function DiscountsAdmin() {
  const codes = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [editing, setEditing] = useState<DiscountInput | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const set = <K extends keyof DiscountInput>(k: K, v: DiscountInput[K]) => setEditing((e) => (e ? { ...e, [k]: v } : e))
  const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveDiscount({ data: editing }), 'Code saved. Customers can use it at checkout.')
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }

  return (
    <>
      <PageTitle
        title="Discount codes"
        actions={
          !editing && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing(blank())}>
              New code
            </button>
          )
        }
      >
        Codes customers type at checkout, like XMAS10. The discount comes off the items, not the delivery fee.
      </PageTitle>

      {editing && (
        <form onSubmit={save} className="admin-card mb-8 space-y-5 p-6">
          <h2 className="text-lg font-bold">{editing.id ? `Edit ${editing.code}` : 'New discount code'}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Code" htmlFor="d-code" help="Letters and numbers only. Customers type it at checkout.">
              <input id="d-code" required className="admin-input uppercase" value={editing.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="XMAS10" />
            </Field>
            <Field label="Discount" htmlFor="d-value">
              <div className="flex gap-2">
                <select aria-label="Type of discount" className="admin-input w-40" value={editing.kind} onChange={(e) => set('kind', e.target.value as DiscountInput['kind'])}>
                  <option value="percent">% off</option>
                  <option value="amount">₦ off</option>
                </select>
                <input id="d-value" inputMode="numeric" className="admin-input tabular" value={editing.value || ''} onChange={(e) => set('value', num(e.target.value))} placeholder={editing.kind === 'percent' ? '10' : '5000'} />
              </div>
            </Field>
            <Field label="Smallest order it works on (₦)" htmlFor="d-min" help="0 = any order.">
              <input id="d-min" inputMode="numeric" className="admin-input tabular" value={editing.min_order || ''} onChange={(e) => set('min_order', num(e.target.value))} placeholder="0" />
            </Field>
            <Field label="How many times it can be used" htmlFor="d-max" help="In total, by everyone. 0 = no limit.">
              <input id="d-max" inputMode="numeric" className="admin-input tabular" value={editing.max_uses || ''} onChange={(e) => set('max_uses', num(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Starts on (optional)" htmlFor="d-start">
              <DatePicker id="d-start" variant="admin" className="admin-input" value={editing.starts_on} onChange={(v) => set('starts_on', v)} />
            </Field>
            <Field label="Ends on (optional)" htmlFor="d-end" help="It stops working after this day.">
              <DatePicker id="d-end" variant="admin" className="admin-input" value={editing.ends_on} onChange={(v) => set('ends_on', v)} />
            </Field>
            <Field label="Note for yourself (optional)" htmlFor="d-note">
              <input id="d-note" className="admin-input" value={editing.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Instagram Christmas promo" />
            </Field>
            <div className="flex items-end pb-2">
              <Toggle id="d-active" checked={!!editing.is_active} onChange={(v) => set('is_active', v)} label="Code is switched on" />
            </div>
          </div>
          <Messages error={error} />
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save code'}</button>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!editing && <Messages error={error} notice={notice} />}

      {codes.length === 0 ? (
        !editing && <div className="admin-card mt-4 p-10 text-center text-[#667085]">No codes yet. Create one for a promo, a loyal customer or a holiday season.</div>
      ) : (
        <div className="admin-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#e3e7f0] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Rules</th>
                <th className="px-4 py-3 font-semibold">Used</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {codes.map((d) => {
                const st = status(d)
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold">{d.code}</span>
                      {d.note && <span className="block text-xs text-[#667085]">{d.note}</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{d.kind === 'percent' ? `${d.value}% off` : `${formatNaira(d.value)} off`}</td>
                    <td className="px-4 py-3 text-xs text-[#475467]">
                      {d.min_order > 0 && <span className="block">Orders from {formatNaira(d.min_order)}</span>}
                      {(d.starts_on || d.ends_on) && (
                        <span className="block">
                          {d.starts_on ? formatDate(d.starts_on) : 'Now'} – {d.ends_on ? formatDate(d.ends_on) : 'no end'}
                        </span>
                      )}
                      {!d.min_order && !d.starts_on && !d.ends_on && 'Any order'}
                    </td>
                    <td className="px-4 py-3 tabular">
                      {d.used_count}
                      {d.max_uses > 0 ? ` of ${d.max_uses}` : ''}
                      {d.total_off > 0 && <span className="block text-xs text-[#667085]">{formatNaira(d.total_off)} given</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.className}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Toggle
                          id={`d-on-${d.id}`}
                          checked={!!d.is_active}
                          onChange={async (v) => {
                            if (await run(() => setDiscountActive({ data: { id: d.id, active: v } }))) router.invalidate()
                          }}
                          label=""
                        />
                        <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setEditing(toInput(d))}>Edit</button>
                        {confirmId === d.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              className="font-semibold text-red-700"
                              onClick={async () => {
                                const ok = await run(() => deleteDiscount({ data: d.id }), 'Code deleted.')
                                setConfirmId(null)
                                if (ok) router.invalidate()
                              }}
                            >
                              Delete
                            </button>
                            <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Keep</button>
                          </span>
                        ) : (
                          <button type="button" className="text-[#98a2b3] hover:text-red-700" onClick={() => setConfirmId(d.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
