import { Link, createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Field, Messages, PageTitle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { WhatsAppIcon } from '~/components/icons'
import { deleteClient, listClients, saveClient, type ClientInput } from '~/fns/business'
import { clientsFromCsv, downloadFile, toCsv, today } from '~/lib/export'
import { importClients } from '~/fns/notify'
import { formatNaira, toIntlPhone, whatsappLink } from '~/lib/format'
import type { Client } from '~/lib/types'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/admin/customers')({
  loader: () => listClients(),
  component: CustomersAdmin,
})

const blank = (): ClientInput => ({ name: '', phone: '', email: '', address: '', area: '', birthday: '', notes: '' })
const toInput = (c: Client): ClientInput => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email,
  address: c.address,
  area: c.area,
  birthday: c.birthday,
  notes: c.notes,
})

function CustomersAdmin() {
  const clients = Route.useLoaderData()
  const s = root.useLoaderData()
  const router = useRouter()
  const { busy, error, notice, run, setNotice } = useAction()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<ClientInput | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const csvInput = useRef<HTMLInputElement>(null)

  async function uploadCsv(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    if (csvInput.current) csvInput.current.value = ''
    const { rows, missingHeader } = clientsFromCsv(text)
    await run(async () => {
      if (/\.xlsx?$/i.test(file.name)) throw new Error('Save the spreadsheet as CSV first (File → Save as / Download → CSV), then upload that file.')
      if (missingHeader) throw new Error('The first row must have column names, like Name, Phone, Email.')
      if (!rows.length) throw new Error('No customers found in that file.')
      let added = 0
      let updated = 0
      let skipped = 0
      for (let i = 0; i < rows.length; i += 500) {
        const r = await importClients({ data: { rows: rows.slice(i, i + 500) } })
        added += r.added
        updated += r.updated
        skipped += r.skipped
      }
      return { added, updated, skipped }
    }).then((r) => {
      if (!r) return
      setNotice(`${r.added} added${r.updated ? `, ${r.updated} got an email address` : ''}${r.skipped ? `, ${r.skipped} already on your list or empty` : ''}.`)
      router.invalidate()
    })
  }

  const term = q.trim().toLowerCase()
  const shown = term
    ? clients.filter((c) => [c.name, c.phone, c.email, c.area, c.address].some((v) => v.toLowerCase().includes(term)))
    : clients
  const totalSpent = clients.reduce((sum, c) => sum + (c.total_spent ?? 0), 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveClient({ data: editing }), editing.id ? 'Customer updated.' : `${editing.name} added.`)
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }
  async function remove(id: number) {
    const ok = await run(() => deleteClient({ data: id }), 'Customer deleted. Their receipts are kept.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }
  function exportCsv() {
    downloadFile(
      `miel-cakes-customers-${today()}.csv`,
      toCsv(clients, [
        { label: 'Name', value: (c) => c.name },
        { label: 'Phone', value: (c) => c.phone },
        { label: 'Email', value: (c) => c.email },
        { label: 'Area', value: (c) => c.area },
        { label: 'Address', value: (c) => c.address },
        { label: 'Birthday', value: (c) => c.birthday },
        { label: 'Receipts', value: (c) => c.receipt_count ?? 0 },
        { label: 'Total paid (NGN)', value: (c) => c.total_spent ?? 0 },
        { label: 'Notes', value: (c) => c.notes },
        { label: 'Added', value: (c) => c.created_at },
      ]),
    )
  }

  return (
    <>
      <div className="no-print">
        <PageTitle
          title="Customers"
          actions={
            <>
              <input ref={csvInput} type="file" accept=".csv,text/csv,.xlsx,.xls" className="hidden" onChange={(e) => uploadCsv(e.target.files?.[0])} />
              <button
                type="button"
                className="btn btn-ghost text-cocoa"
                disabled={busy}
                onClick={() => csvInput.current?.click()}
                title="A CSV file with columns like Name, Phone, Email, Address, Birthday"
              >
                {busy ? 'Uploading…' : 'Upload list (CSV)'}
              </button>
              <button type="button" className="btn btn-ghost text-cocoa" onClick={exportCsv} disabled={!clients.length}>
                Download (Excel)
              </button>
              <button type="button" className="btn btn-ghost text-cocoa" onClick={() => window.print()} disabled={!clients.length}>
                Print list
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setEditing(blank())}>
                + Add customer
              </button>
            </>
          }
        >
          Everyone you&rsquo;ve served. Customers are also added when they order on the website, or when you save someone from a quote request or a receipt. To
          add many at once, upload a CSV file (from Excel or Google Sheets) with columns like Name, Phone, Email, Address and Birthday. People already on the
          list are not added twice. Send them festive emails under <Link to="/admin/notifications" className="font-semibold text-brand underline">Alerts &amp; emails</Link>.
        </PageTitle>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="admin-card p-5">
            <p className="text-sm font-semibold text-[#667085]">Customers</p>
            <p className="mt-1 font-display text-4xl tabular text-cocoa">{clients.length}</p>
          </div>
          <div className="admin-card p-5">
            <p className="text-sm font-semibold text-[#667085]">Paid on receipts</p>
            <p className="mt-1 font-display text-3xl tabular text-cocoa">{formatNaira(totalSpent)}</p>
          </div>
          <div className="admin-card col-span-2 p-5 sm:col-span-1">
            <p className="text-sm font-semibold text-[#667085]">Repeat customers</p>
            <p className="mt-1 font-display text-4xl tabular text-cocoa">{clients.filter((c) => (c.receipt_count ?? 0) > 1).length}</p>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <input
            id="customer-search"
            type="search"
            className="admin-input max-w-sm"
            placeholder="Search by name, phone, email or area"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Messages error={error} notice={notice} />
        </div>

        {editing && (
          <form onSubmit={save} className="admin-card mb-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
            <h2 className="text-lg font-bold sm:col-span-2">{editing.id ? `Edit ${editing.name}` : 'New customer'}</h2>
            <Field label="Full name *" htmlFor="c-name">
              <input id="c-name" required className="admin-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="c-phone">
              <input id="c-phone" type="tel" className="admin-input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="c-email">
              <input id="c-email" type="email" className="admin-input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </Field>
            <Field label="Area" htmlFor="c-area">
              <input id="c-area" className="admin-input" value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} placeholder="e.g. Gwarinpa" />
            </Field>
            <Field label="Address" htmlFor="c-address">
              <textarea id="c-address" rows={2} className="admin-input" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
            </Field>
            <Field label="Birthday" help="Handy for birthday messages and offers." htmlFor="c-birthday">
              <input id="c-birthday" className="admin-input" value={editing.birthday} onChange={(e) => setEditing({ ...editing, birthday: e.target.value })} placeholder="e.g. 14 March" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes" help="Favourite flavours, allergies, past orders…" htmlFor="c-notes">
                <textarea id="c-notes" rows={3} className="admin-input" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>
              <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Print header (only shows on paper) */}
      <div className="hidden print:block">
        <h1 className="font-display text-2xl">{s.business_name}: customer list</h1>
        <p className="mb-4 text-sm">Printed {formatDate(today())} · {shown.length} customers</p>
      </div>

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          {clients.length ? 'No customers match your search.' : 'No customers yet. Add your first one, or save someone from a quote request.'}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto print:overflow-visible print:border-0">
          <table className="w-full min-w-[720px] text-left text-sm print:min-w-0">
            <thead className="border-b border-[#e3e7f0] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 text-right font-semibold">Receipts</th>
                <th className="px-4 py-3 text-right font-semibold">Total paid</th>
                <th className="no-print px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceff5]">
              {shown.map((c) => {
                const wa = c.phone ? whatsappLink(toIntlPhone(c.phone), `Hello ${c.name.split(' ')[0]}, `) : ''
                return (
                  <tr key={c.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.name}</p>
                      {c.birthday && <p className="text-xs text-[#667085]">Birthday: {c.birthday}</p>}
                      {c.notes && <p className="mt-0.5 line-clamp-2 max-w-xs text-xs text-[#667085] print:line-clamp-none">{c.notes}</p>}
                    </td>
                    <td className="px-4 py-3 tabular">{c.phone}</td>
                    <td className="break-all px-4 py-3">{c.email}</td>
                    <td className="px-4 py-3">{c.area}</td>
                    <td className="px-4 py-3 text-right tabular">{c.receipt_count ?? 0}</td>
                    <td className="px-4 py-3 text-right tabular">{formatNaira(c.total_spent ?? 0)}</td>
                    <td className="no-print px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 whitespace-nowrap">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">
                            <WhatsAppIcon className="h-4 w-4" /> Chat
                          </a>
                        )}
                        <Link to="/admin/receipts/$id" params={{ id: 'new' }} search={{ client: c.id }} className="font-semibold text-brand hover:underline">
                          Receipt
                        </Link>
                        <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setEditing(toInput(c))}>
                          Edit
                        </button>
                        {confirmId === c.id ? (
                          <>
                            <button type="button" className="font-semibold text-red-700" onClick={() => remove(c.id)}>Delete</button>
                            <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmId(c.id)}>Delete</button>
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
