import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { deleteZone, listZonesAdmin, saveZone } from '~/fns/admin'
import type { DeliveryZone } from '~/lib/types'

export const Route = createFileRoute('/admin/delivery')({
  loader: () => listZonesAdmin(),
  component: DeliveryAdmin,
})

type Row = { id?: number; name: string; fee: number; is_active: boolean; sort: number; dirty?: boolean }
const toRow = (z: DeliveryZone): Row => ({ id: z.id, name: z.name, fee: z.fee, is_active: !!z.is_active, sort: z.sort })

function DeliveryAdmin() {
  const zones = Route.useLoaderData()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(() => zones.map(toRow))
  useEffect(() => setRows(zones.map(toRow)), [zones])
  const { busy, error, notice, run } = useAction()

  const update = (n: number, patch: Partial<Row>) => setRows((r) => r.map((row, i) => (i === n ? { ...row, ...patch, dirty: true } : row)))

  async function saveAll() {
    const changed = rows.filter((r) => r.dirty)
    const ok = await run(async () => {
      for (const r of changed) await saveZone({ data: r })
      return true
    }, `Saved ${changed.length} area${changed.length === 1 ? '' : 's'}.`)
    if (ok) router.invalidate()
  }
  async function remove(n: number) {
    const row = rows[n]
    if (!row.id) return setRows((r) => r.filter((_, i) => i !== n))
    const ok = await run(() => deleteZone({ data: row.id! }), `${row.name} removed.`)
    if (ok) router.invalidate()
  }
  const dirtyCount = rows.filter((r) => r.dirty).length

  return (
    <>
      <PageTitle
        title="Delivery areas"
        actions={
          <button
            type="button"
            className="btn btn-ghost text-cocoa"
            onClick={() => setRows((r) => [...r, { name: '', fee: 0, is_active: true, sort: r.length + 1, dirty: true }])}
          >
            + Add area
          </button>
        }
      >
        Areas in Abuja you deliver to, and the fee for each. Customers see these on the Contact page, and they&rsquo;ll pick one
        at checkout.
      </PageTitle>

      <div className="admin-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-b border-[#ece3df] text-sm text-[#85726d]">
            <tr>
              <th className="px-5 py-3 font-semibold">Area</th>
              <th className="px-5 py-3 font-semibold">Fee (₦)</th>
              <th className="px-5 py-3 font-semibold">Position</th>
              <th className="px-5 py-3 font-semibold">Active</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1e9e6]">
            {rows.map((r, n) => (
              <tr key={r.id ?? `new-${n}`} className={r.dirty ? 'bg-amber-50/60' : ''}>
                <td className="px-5 py-2">
                  <input id={`zone-name-${n}`} aria-label="Area name" className="admin-input" value={r.name} onChange={(e) => update(n, { name: e.target.value })} />
                </td>
                <td className="px-5 py-2">
                  <input
                    id={`zone-fee-${n}`}
                    aria-label="Delivery fee in naira"
                    inputMode="numeric"
                    className="admin-input w-32 tabular"
                    value={r.fee ? r.fee.toLocaleString('en-NG') : ''}
                    onChange={(e) => update(n, { fee: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
                  />
                </td>
                <td className="px-5 py-2">
                  <input id={`zone-sort-${n}`} aria-label="Position" type="number" className="admin-input w-20" value={r.sort} onChange={(e) => update(n, { sort: Number(e.target.value) })} />
                </td>
                <td className="px-5 py-2">
                  <Toggle id={`zone-active-${n}`} checked={r.is_active} onChange={(v) => update(n, { is_active: v })} label="" />
                </td>
                <td className="px-5 py-2 text-right">
                  <button type="button" className="text-sm text-[#85726d] hover:text-red-700" onClick={() => remove(n)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-4 border-t border-[#ece3df] bg-[#faf6f4]/95 py-4 backdrop-blur">
        <button type="button" className="btn btn-primary" onClick={saveAll} disabled={busy || !dirtyCount}>
          {busy ? 'Saving…' : dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}` : 'Saved'}
        </button>
        <div className="min-w-0 flex-1">
          <Messages error={error} notice={notice} />
        </div>
      </div>
    </>
  )
}
