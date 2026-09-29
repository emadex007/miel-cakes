import { Link, createFileRoute } from '@tanstack/react-router'
import { PageTitle } from '~/components/admin/ui'
import { getDashboard } from '~/fns/admin'

export const Route = createFileRoute('/admin/')({
  loader: () => getDashboard(),
  component: Overview,
})

function Overview() {
  const d = Route.useLoaderData()
  const { admin } = Route.useRouteContext()
  const tiles = [
    { label: 'Menu items', value: d.products, to: '/admin/menu' as const, note: d.soldOut ? `${d.soldOut} sold out` : 'All available' },
    { label: 'Categories', value: d.categories, to: '/admin/categories' as const, note: 'Cakes, small chops…' },
    { label: 'Delivery areas', value: d.zones, to: '/admin/delivery' as const, note: 'Active in Abuja' },
    { label: 'Uploaded files', value: d.mediaCount, to: '/admin/media' as const, note: 'Photos & videos' },
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="admin-card p-5 transition hover:border-brand">
            <p className="text-sm font-semibold text-[#85726d]">{t.label}</p>
            <p className="mt-2 font-display text-4xl tabular text-cocoa">{t.value}</p>
            <p className="mt-1 text-sm text-[#85726d]">{t.note}</p>
          </Link>
        ))}
      </div>

      <section className="admin-card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Get the website ready</h2>
          <span className="text-sm font-semibold text-[#85726d]">{remaining === 0 ? 'All done' : `${remaining} left`}</span>
        </div>
        <ul className="mt-4 divide-y divide-[#f1e9e6]">
          {checklist.map((c) => (
            <li key={c.text} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.done ? 'bg-emerald-600 text-white' : 'border-2 border-[#ddd3cf]'
                }`}
                aria-label={c.done ? 'Done' : 'To do'}
              >
                {c.done ? '✓' : ''}
              </span>
              <span className={`flex-1 ${c.done ? 'text-[#a8958f] line-through' : ''}`}>{c.text}</span>
              {!c.done && (
                <Link to={c.to} className="text-sm font-semibold text-brand hover:underline">
                  Fix
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl bg-[#f3ece9] p-6 text-sm leading-relaxed text-[#5b4944]">
        <p className="font-bold text-cocoa">What&rsquo;s coming in the next updates</p>
        <p className="mt-2">
          Customer accounts and cart, Paystack checkout with pickup or delivery, event bookings with deposits, and live order
          tracking. Until then, the “Order on WhatsApp” buttons send orders straight to your WhatsApp with the item, size and
          price filled in.
        </p>
      </section>
    </>
  )
}
