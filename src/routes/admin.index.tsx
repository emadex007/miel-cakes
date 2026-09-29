import { Link, createFileRoute } from '@tanstack/react-router'
import { PageTitle } from '~/components/admin/ui'
import { getDashboard } from '~/fns/admin'
import { formatNaira } from '~/lib/format'

export const Route = createFileRoute('/admin/')({
  loader: () => getDashboard(),
  component: Overview,
})

function Overview() {
  const d = Route.useLoaderData()
  const { admin } = Route.useRouteContext()
  const tiles = [
    { label: 'Orders to handle', value: String(d.ordersToAct), to: '/admin/orders' as const, note: d.ordersToAct ? 'Confirm, bake, deliver' : 'All done' },
    { label: 'New quote requests', value: String(d.newQuotes), to: '/admin/quotes' as const, note: d.newQuotes ? 'Waiting for your reply' : 'All answered' },
    { label: 'Received this month', value: formatNaira(d.monthPaid), to: '/admin/receipts' as const, note: `${d.monthReceipts} receipt${d.monthReceipts === 1 ? '' : 's'}` },
    { label: 'Customers', value: String(d.clients), to: '/admin/customers' as const, note: 'In your records' },
    { label: 'New job applications', value: String(d.newApplications), to: '/admin/careers' as const, note: d.newApplications ? 'Waiting for review' : 'All reviewed' },
  ]
  const checklist = [
    { done: d.checklist.whatsapp, text: 'Add your WhatsApp number so customers can order', to: '/admin/settings' as const },
    { done: d.checklist.phone, text: 'Add your phone number', to: '/admin/settings' as const },
    { done: d.checklist.logo, text: 'Upload your logo', to: '/admin/settings' as const },
    { done: d.checklist.bank, text: 'Add bank details for transfer payments', to: '/admin/settings' as const },
    {
      done: d.checklist.ownPhotos,
      text: d.sampleImages ? `Replace sample photos with your own (${d.sampleImages} items still use sample photos)` : 'Use your own product photos',
      to: '/admin/menu' as const,
    },
  ]
  const remaining = checklist.filter((c) => !c.done).length

  return (
    <>
      <PageTitle title={`Welcome, ${admin?.name.split(' ')[0] ?? ''}`}>
        Everything customers see on the website is edited from here.
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <Link key={t.label} to={t.to} className={`admin-card p-5 transition hover:border-brand ${i === tiles.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <p className="text-sm font-semibold text-[#667085]">{t.label}</p>
            <p className="mt-2 font-display text-3xl tabular text-cocoa sm:text-4xl">{t.value}</p>
            <p className="mt-1 text-sm text-[#667085]">{t.note}</p>
          </Link>
        ))}
      </div>

      <section className="admin-card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Get the website ready</h2>
          <span className="text-sm font-semibold text-[#667085]">{remaining === 0 ? 'All done' : `${remaining} left`}</span>
        </div>
        <ul className="mt-4 divide-y divide-[#eceff5]">
          {checklist.map((c) => (
            <li key={c.text} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.done ? 'bg-emerald-600 text-white' : 'border-2 border-[#d0d5e2]'
                }`}
                aria-label={c.done ? 'Done' : 'To do'}
              >
                {c.done ? '✓' : ''}
              </span>
              <span className={`flex-1 ${c.done ? 'text-[#98a2b3] line-through' : ''}`}>{c.text}</span>
              {!c.done && (
                <Link to={c.to} className="text-sm font-semibold text-brand hover:underline">
                  Fix
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl bg-[#eef1f7] p-6 text-sm leading-relaxed text-[#475467]">
        <p className="font-bold text-cocoa">What&rsquo;s coming in the next updates</p>
        <p className="mt-2">
          Event bookings with deposits. Customers can already order online (bank transfer with proof upload, or Paystack once
          switched on), track their orders, and ask for quotes. Big event orders go through quote requests for now.
        </p>
      </section>
    </>
  )
}
