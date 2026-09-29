import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { lines, whatsappLink } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import { CloseIcon, FacebookIcon, InstagramIcon, MenuIcon, TikTokIcon, WhatsAppIcon } from './icons'

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact & delivery' },
] as const

export function Brand({ s, light = false }: { s: SiteSettings; light?: boolean }) {
  return s.logo_url ? (
    <img src={s.logo_url} alt={s.business_name} className="h-11 w-auto max-w-[160px] object-contain" />
  ) : (
    <span className={`font-display text-2xl leading-none ${light ? 'text-white' : 'text-cocoa'}`}>
      {s.business_name}
      <span className="text-accent">.</span>
    </span>
  )
}

export function SiteHeader({ s }: { s: SiteSettings }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to place an order.`)

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? 'border-line bg-cream/95 backdrop-blur' : 'border-transparent bg-cream'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0" aria-label={`${s.business_name} home`} onClick={() => setOpen(false)}>
          <Brand s={s} />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-[0.95rem] font-semibold text-cocoa/80 transition-colors hover:text-brand"
              activeProps={{ className: '!text-brand' }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/menu" className="btn btn-primary hidden sm:inline-flex">
            Order now
          </Link>
          <button
            type="button"
            className="rounded-full p-2 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-cream px-4 pb-6 pt-2 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 font-display text-2xl"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/menu" onClick={() => setOpen(false)} className="btn btn-primary">
              Order now
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="btn btn-ghost">
                <WhatsAppIcon /> WhatsApp us
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

export function SiteFooter({ s }: { s: SiteSettings }) {
  const socials = [
    { href: s.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: s.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: s.tiktok, label: 'TikTok', Icon: TikTokIcon },
  ].filter((x) => x.href)
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}!`)
  return (
    <footer className="mt-24 bg-cocoa text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Brand s={s} light />
          <p className="mt-4 text-cream/75">{s.footer_note}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener" aria-label={label} className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20">
                  <Icon />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow text-accent">Visit or call</p>
          <ul className="mt-4 space-y-2 text-cream/85">
            {s.address && <li className="whitespace-pre-line">{s.address}</li>}
            {s.phone && <li className="tabular">{s.phone}</li>}
            {s.email && <li className="break-all">{s.email}</li>}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-accent hover:underline">
                  <WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="eyebrow text-accent">Opening hours</p>
          <ul className="mt-4 space-y-2 text-cream/85">
            {lines(s.opening_hours).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-5 text-sm text-cream/60 sm:px-6">
          <span>
            © {new Date().getFullYear()} {s.business_name}
          </span>
          {s.footer_credit && <span>{s.footer_credit}</span>}
        </div>
      </div>
    </footer>
  )
}
