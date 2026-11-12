import { Link, Outlet, createFileRoute, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { adminLogout, getAdminSession } from '~/fns/admin'
import { ding } from '~/components/admin/ding'
import type { AdminAlerts } from '~/server/admin-alerts'
import { CloseIcon, ExternalIcon, MenuIcon } from '~/components/icons'

const OPEN_PATHS = ['/admin/login', '/admin/setup']
/** Pages only the owner can open. Staff handle orders, bookings, chat, quotes and the menu. */
const OWNER_ONLY = ['/admin/receipts', '/admin/customers', '/admin/discounts', '/admin/careers', '/admin/content', '/admin/delivery', '/admin/settings']
const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const admin = await getAdminSession()
    const path = clean(location.pathname)
    if (!admin && !OPEN_PATHS.includes(path)) throw redirect({ to: '/admin/login' })
    // Staff can't open money, settings and HR pages (the server checks too)
    if (admin && admin.role !== 'owner' && OWNER_ONLY.some((p) => path === p || path.startsWith(`${p}/`))) {
      throw redirect({ to: '/admin' })
    }
    return { admin }
  },
  head: () => ({ meta: [{ title: 'Admin · Miel Cakes' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminLayout,
  errorComponent: AdminError,
})

/** Friendly box instead of a broken page if something fails to load. */
function AdminError({ error, reset }: { error: unknown; reset?: () => void }) {
  const router = useRouter()
  const message = error instanceof Error ? error.message : String(error)
  const details =
    error instanceof Error
      ? [error.name, error.stack || '(no stack: this error came back from the server)'].join('\n')
      : (() => {
          try {
            return JSON.stringify(error, null, 2)
          } catch {
            return String(error)
          }
        })()
  if (typeof window !== 'undefined') console.error('Admin page error:', error)
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-cocoa">This page didn&rsquo;t load</h1>
      <p className="mt-3 text-[#667085]">It&rsquo;s usually a short hiccup. Try again, and if it keeps happening, send this message to your web developer:</p>
      <p className="mt-4 rounded-xl bg-white p-4 font-mono text-sm text-red-800 ring-1 ring-[#e3e7f0]">{message}</p>
      <details className="mt-3 text-left text-xs">
        <summary className="cursor-pointer text-center font-semibold text-[#667085]">Technical details</summary>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-[#475467] ring-1 ring-[#e3e7f0]">
          {typeof window !== 'undefined' ? window.location.pathname : ''}
          {'\n'}
          {details.split('\n').slice(0, 10).join('\n')}
        </pre>
      </details>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            reset?.()
            await router.invalidate()
          }}
        >
          Try again
        </button>
        <a href="/admin" className="btn btn-ghost text-cocoa">Back to overview</a>
      </div>
    </div>
  )
}

const NAV: { to: string; label: string; exact?: boolean; badge?: keyof AdminAlerts }[] = [
  { to: '/admin', label: 'Overview', exact: true },
  { to: '/admin/chat', label: 'Live chat', badge: 'chat' },
  { to: '/admin/orders', label: 'Orders', badge: 'orders' },
  { to: '/admin/bookings', label: 'Event bookings', badge: 'bookings' },
  { to: '/admin/quotes', label: 'Quote requests', badge: 'quotes' },
  { to: '/admin/receipts', label: 'Receipts' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/notifications', label: 'Alerts & emails' },
  { to: '/admin/discounts', label: 'Discount codes' },
  { to: '/admin/careers', label: 'Careers', badge: 'applications' },
  { to: '/admin/menu', label: 'Menu items' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/gallery', label: 'Gallery' },
  { to: '/admin/reviews', label: 'Reviews', badge: 'reviews' },
  { to: '/admin/content', label: 'Website content & FAQs' },
  { to: '/admin/delivery', label: 'Delivery areas' },
  { to: '/admin/media', label: 'Photos & videos' },
  { to: '/admin/settings', label: 'Settings & colours' },
  { to: '/admin/staff', label: 'Staff & password' },
]

const NO_ALERTS: AdminAlerts = { chat: 0, orders: 0, bookings: 0, quotes: 0, applications: 0, reviews: 0 }

function AdminLayout() {
  const { admin } = Route.useRouteContext()
  const pathname = clean(useRouterState({ select: (s) => s.location.pathname }))
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<AdminAlerts>(NO_ALERTS)
  const isOwner = admin?.role === 'owner'

  // Menu badges: new orders, bookings, quotes, applications and chat messages.
  // Checked every 20 seconds; dings when something new arrives. Also keeps
  // "Online now" showing to chat visitors while the dashboard is open.
  // "Add to Home Screen" from the dashboard opens the dashboard, not the shop
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!link) return
    const before = link.href
    link.href = '/admin.webmanifest'
    return () => {
      link.href = before
    }
  }, [])

  useEffect(() => {
    if (!admin) return
    let stop = false
    let last: AdminAlerts | null = null
    const check = async () => {
      if (document.hidden && last) return
      try {
        const res = await fetch('/api/admin/alerts', { cache: 'no-store', credentials: 'same-origin' })
        if (!res.ok || stop) return
        const next = (await res.json()) as AdminAlerts
        if (last) {
          const work = (a: AdminAlerts) => a.orders + a.bookings + a.quotes + a.applications + a.reviews
          const onChat = window.location.pathname.startsWith('/admin/chat') // the chat page dings for chat itself
          if (work(next) > work(last) || (!onChat && next.chat > last.chat)) ding()
        }
        last = next
        setAlerts(next)
      } catch {
        /* try again next time */
      }
    }
    check()
    const id = setInterval(check, 20000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [!!admin])

  // Count in the browser tab, so she sees it from another tab too
  const totalAlerts = alerts.chat + alerts.orders + alerts.bookings + alerts.quotes + (isOwner ? alerts.applications : 0)
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = totalAlerts ? `(${totalAlerts}) ${base}` : base
  }, [totalAlerts, pathname])

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
      {NAV.filter((n) => isOwner || !OWNER_ONLY.includes(n.to)).map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: !!n.exact }}
          className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-[#475467] transition hover:bg-[#eef1f7]"
          activeProps={{ className: '!bg-brand !text-white' }}
        >
          {n.label}
          {n.badge && alerts[n.badge] > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-bold text-white">{alerts[n.badge]}</span>
          )}
        </Link>
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
            <a href="/" target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">View site <ExternalIcon className="ml-0.5 inline h-3.5 w-3.5 align-[-2px]" /></a>
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
            <a href="/" target="_blank" rel="noopener" className="font-semibold text-brand">View site <ExternalIcon className="ml-0.5 inline h-3.5 w-3.5 align-[-2px]" /></a>
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
