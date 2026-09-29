import { Link, Outlet, createFileRoute, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { adminLogout, getAdminSession } from '~/fns/admin'
import { CloseIcon, MenuIcon } from '~/components/icons'

const OPEN_PATHS = ['/admin/login', '/admin/setup']
const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const admin = await getAdminSession()
    const path = clean(location.pathname)
    if (!admin && !OPEN_PATHS.includes(path)) throw redirect({ to: '/admin/login' })
    return { admin }
  },
  head: () => ({ meta: [{ title: 'Admin · Miel Cakes' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
})

const NAV = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/quotes', label: 'Quote requests' },
  { to: '/admin/receipts', label: 'Receipts' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/careers', label: 'Careers' },
  { to: '/admin/menu', label: 'Menu items' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/gallery', label: 'Gallery' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/content', label: 'Website content & FAQs' },
  { to: '/admin/delivery', label: 'Delivery areas' },
  { to: '/admin/media', label: 'Photos & videos' },
  { to: '/admin/settings', label: 'Settings & colours' },
  { to: '/admin/staff', label: 'Staff & password' },
] as const

const LATER = ['Event bookings with deposits']

function AdminLayout() {
  const { admin } = Route.useRouteContext()
  const pathname = clean(useRouterState({ select: (s) => s.location.pathname }))
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (!admin || OPEN_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] px-4 py-16">
        <Outlet />
      </div>
    )
  }

  async function logout() {
    await adminLogout()
    await router.invalidate()
    router.navigate({ to: '/admin/login' })
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: 'exact' in n }}
          className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-[#475467] transition hover:bg-[#eef1f7]"
          activeProps={{ className: '!bg-brand !text-white' }}
        >
          {n.label}
        </Link>
      ))}
      <p className="mt-6 px-3 text-xs font-bold uppercase tracking-wider text-[#98a2b3]">Coming next</p>
      {LATER.map((l) => (
        <span key={l} className="px-3 py-2 text-[0.95rem] text-[#b0b8c8]">
          {l}
        </span>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#1b2437] lg:grid lg:grid-cols-[250px_1fr] print:block print:bg-white">
      <aside className="no-print hidden border-r border-[#e3e7f0] bg-white p-5 lg:flex lg:flex-col">
        <Link to="/admin" className="mb-8 block font-display text-2xl text-cocoa">
          Miel Cakes <span className="text-sm font-sans font-semibold text-[#667085]">admin</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-[#e3e7f0] pt-4 text-sm">
          <p className="font-semibold">{admin.name}</p>
          <p className="truncate text-[#667085]">{admin.email}</p>
          <div className="mt-3 flex gap-3">
            <a href="/" target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">View site ↗</a>
            <button type="button" onClick={logout} className="font-semibold text-[#667085] hover:text-cocoa">Sign out</button>
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-[#e3e7f0] bg-white px-4 py-3 lg:hidden">
        <Link to="/admin" className="font-display text-xl text-cocoa">Miel Cakes admin</Link>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} className="p-2">
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>
      {open && (
        <div className="no-print border-b border-[#e3e7f0] bg-white p-4 lg:hidden">
          {nav}
          <div className="mt-4 flex gap-4 border-t border-[#e3e7f0] pt-4 text-sm">
            <a href="/" target="_blank" rel="noopener" className="font-semibold text-brand">View site ↗</a>
            <button type="button" onClick={logout} className="font-semibold text-[#667085]">Sign out</button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:py-12">
        <Outlet />
      </main>
    </div>
  )
}
