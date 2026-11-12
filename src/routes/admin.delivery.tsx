import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { deleteZone, listZonesAdmin, saveZone } from '~/fns/admin'
import { addBlockedDate, listBlockedDates, removeBlockedDate } from '~/fns/orders-admin'
import { formatDate } from '~/components/ReceiptSheet'
import type { DeliveryZone } from '~/lib/types'
import { CloseIcon } from '~/components/icons'

export const Route = createFileRoute('/admin/delivery')({
  loader: async () => {
    const [zones, blocked] = await Promise.all([listZonesAdmin(), listBlockedDates()])
    return { zones, blocked }
  },
  component: DeliveryAdmin,
})

type Row = { id?: number; name: string; fee: number; is_active: boolean; sort: number; dirty?: boolean }
const toRow = (z: DeliveryZone): Row => ({ id: z.id, name: z.name, fee: z.fee, is_active: !!z.is_active, sort: z.sort })

function DeliveryAdmin() {
  const { zones, blocked } = Route.useLoaderData()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(() => zones.map(toRow))
  useEffect(() => {
    setRows(zones.map(toRow))
  }, [zones])
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
          <thead className="border-b border-[#e3e7f0] text-sm text-[#667085]">
            <tr>
              <th className="px-5 py-3 font-semibold">Area</th>
              <th className="px-5 py-3 font-semibold">Fee (₦)</th>
              <th className="px-5 py-3 font-semibold">Position</th>
              <th className="px-5 py-3 font-semibold">Active</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eceff5]">
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
                  <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => remove(n)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-4 border-t border-[#e3e7f0] bg-[#f6f7fb]/95 py-4 backdrop-blur">
        <button type="button" className="btn btn-primary" onClick={saveAll} disabled={busy || !dirtyCount}>
          {busy ? 'Saving…' : dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}` : 'Saved'}
        </button>
        <div className="min-w-0 flex-1">
          <Messages error={error} notice={notice} />
        </div>
      </div>
      <BlockedDates blocked={blocked} />
    </>
  )
}

function BlockedDates({ blocked }: { blocked: { date: string; reason: string }[] }) {
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(() => addBlockedDate({ data: { date, reason } }), 'Date blocked. Customers can\u2019t choose it at checkout.')
    if (ok) {
      setDate('')
      setReason('')
      router.invalidate()
    }
  }
  async function remove(d: string) {
    const ok = await run(() => removeBlockedDate({ data: d }), 'Date opened again.')
    if (ok) router.invalidate()
  }

  return (
    <section className="admin-card mt-10 space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">Fully booked dates</h2>
        <p className="mt-1 text-sm text-[#667085]">Days you can&rsquo;t take more orders, for example when you&rsquo;re doing a big wedding or travelling. Customers can&rsquo;t pick these at checkout.</p>
      </div>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="bd-date" className="admin-label">Date</label>
          <input id="bd-date" type="date" required className="admin-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="bd-reason" className="admin-label">Reason (customers see this)</label>
          <input id="bd-reason" className="admin-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fully booked" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>Block date</button>
      </form>
      <Messages error={error} notice={notice} />
      {blocked.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {blocked.map((b) => (
            <li key={b.date} className="flex items-center gap-2 rounded-full bg-[#eef1f7] py-1.5 pl-4 pr-2 text-sm">
              <span className="font-semibold">{formatDate(b.date)}</span>
              {b.reason && <span className="text-[#667085]">· {b.reason}</span>}
              <button type="button" onClick={() => remove(b.date)} className="rounded-full px-2 text-[#667085] hover:bg-white hover:text-red-700" aria-label={`Unblock ${b.date}`}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#667085]">No blocked dates.</p>
      )}
    </section>
  )
}
