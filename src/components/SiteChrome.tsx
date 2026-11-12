import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { lines, whatsappLink } from '~/lib/format'
import { parseOccasions, type SiteSettings } from '~/lib/site-fields'
import { ArrowRightIcon, CartIcon, ChevronDownIcon, CloseIcon, FacebookIcon, InstagramIcon, LinkedInIcon, MenuIcon, PhoneIcon, SearchIcon, TikTokIcon, UserIcon, WhatsAppIcon, XIcon } from './icons'
import { useShop } from './Shop'

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/careers', label: 'Careers' },
  { to: '/contact', label: 'Contact' },
] as const

function navCategories(s: SiteSettings): { name: string; slug: string }[] {
  try {
    const v = JSON.parse(s.nav_categories || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Search box: sends people to the menu with their words filled in. */
function SearchForm({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const term = q.trim()
        router.navigate({ to: '/menu', search: term ? { q: term } : {} })
        onDone?.()
      }}
      className="flex items-center gap-2 rounded-full bg-white px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand"
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
      <input
        type="search"
        aria-label="Search cakes and treats"
        placeholder="Search cakes, small chops, pastries…"
        className="min-w-0 flex-1 border-0 bg-transparent py-3 text-base outline-none focus:ring-0"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="text-sm font-bold text-brand">Search</button>
    </form>
  )
}

function socialsOf(s: SiteSettings) {
  return [
    { href: s.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: s.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: s.tiktok, label: 'TikTok', Icon: TikTokIcon },
    { href: s.twitter, label: 'X (Twitter)', Icon: XIcon },
    { href: s.linkedin, label: 'LinkedIn', Icon: LinkedInIcon },
  ].filter((x) => x.href)
}

export function Brand({ s, light = false, size = 'md' }: { s: SiteSettings; light?: boolean; size?: 'md' | 'lg' }) {
  return s.logo_url ? (
    <img src={s.logo_url} alt={s.business_name} className={`${size === 'lg' ? 'h-16' : 'h-14'} w-auto max-w-[200px] object-contain`} />
  ) : (
    <span className={`font-display leading-none ${size === 'lg' ? 'text-4xl' : 'text-[1.9rem]'} ${light ? 'text-white' : 'text-cocoa'}`}>
      {s.business_name}
      <span className="text-highlight">.</span>
    </span>
  )
}

export function SiteHeader({ s }: { s: SiteSettings }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I'd like to place an order.`)
  const socials = socialsOf(s)
  const cats = navCategories(s)
  const [searching, setSearching] = useState(false)
  const { me } = useShop()
  const cartCount = me?.cartCount ?? 0

  return (
    <>
      {/* ---------- Top bar ---------- */}
      <div className="bg-cocoa text-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 text-sm sm:px-6">
          <p className="hidden text-cream/85 md:block">{s.topbar_note}</p>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-x-5 gap-y-1 md:flex-none md:justify-end">
            {s.phone && (
              <span className="inline-flex items-center gap-1.5 tabular font-semibold">
                <PhoneIcon /> {s.phone}
              </span>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp us
              </a>
            )}
            <Link to="/track" className="font-semibold text-cream/90 hover:text-accent">
              Track order
            </Link>
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener" aria-label={label} className="hidden text-cream/80 hover:text-accent sm:inline-flex">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Main header ---------- */}
      <header
        className={`sticky top-0 z-40 border-b transition-[background-color,box-shadow] ${
          scrolled ? 'border-line bg-cream/95 shadow-[0_8px_30px_-20px_var(--c-dark)] backdrop-blur' : 'border-line bg-cream'
        }`}
      >
        <div className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-[padding] sm:px-6 ${scrolled ? 'py-3' : 'py-5'}`}>
          <Link to="/" className="shrink-0" aria-label={`${s.business_name} home`} onClick={() => setOpen(false)}>
            <Brand s={s} />
          </Link>
          <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label="Main">
            {NAV.map((n) =>
              n.to === '/menu' && cats.length > 0 ? (
                <div key={n.to} className="group/menu relative">
                  <Link
                    to="/menu"
                    className="relative flex items-center gap-1 py-2 text-base font-semibold text-cocoa/80 transition-colors hover:text-brand"
                    activeProps={{ className: '!text-brand' }}
                    aria-haspopup="true"
                  >
                    {n.label} <ChevronDownIcon className="h-4 w-4 transition group-hover/menu:rotate-180" />
                  </Link>
                  <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition group-focus-within/menu:visible group-focus-within/menu:opacity-100 group-hover/menu:visible group-hover/menu:opacity-100">
                    <ul className="rounded-2xl bg-white p-2 shadow-[0_18px_44px_-14px_rgba(0,0,0,.35)] ring-1 ring-line">
                      {cats.map((c) => (
                        <li key={c.slug}>
                          <Link to="/menu" search={{ c: c.slug }} className="block rounded-xl px-4 py-2.5 font-semibold text-cocoa/85 hover:bg-honey hover:text-brand">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                      <li className="mt-1 border-t border-line pt-1">
                        <Link to="/menu" className="block rounded-xl px-4 py-2.5 text-sm font-bold text-brand hover:bg-honey">
                          See the full menu <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  className="relative py-2 text-base font-semibold text-cocoa/80 transition-colors hover:text-brand"
                  activeProps={{ className: '!text-brand after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-accent' }}
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/contact" hash="quote" className="btn btn-ghost hidden text-cocoa xl:inline-flex">
              Get a quote
            </Link>
            <Link to="/menu" className="btn btn-primary hidden sm:inline-flex">
              Order now
            </Link>
            <button
              type="button"
              onClick={() => setSearching((v) => !v)}
              className="rounded-full p-2 text-cocoa transition hover:bg-honey"
              aria-label="Search"
              aria-expanded={searching}
            >
              <SearchIcon />
            </button>
            <Link
              to={me ? '/account' : '/login'}
              className="rounded-full p-2 text-cocoa transition hover:bg-honey"
              aria-label={me ? `Your account (${me.name})` : 'Sign in'}
              title={me ? me.name : 'Sign in'}
            >
              <UserIcon />
            </Link>
            <Link to="/cart" className="relative rounded-full p-2 text-cocoa transition hover:bg-honey" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-[11px] font-bold text-white tabular">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="rounded-full p-2 lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <CloseIcon className="h-7 w-7" /> : <MenuIcon className="h-7 w-7" />}
            </button>
          </div>
        </div>
        {searching && (
          <div className="border-t border-line bg-cream px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-2xl">
              <SearchForm autoFocus onDone={() => setSearching(false)} />
            </div>
          </div>
        )}
        {open && (
          <nav className="border-t border-line bg-cream px-4 pb-8 pt-4 lg:hidden" aria-label="Mobile">
            <SearchForm onDone={() => setOpen(false)} />
            {NAV.map((n) => (
              <div key={n.to} className="border-b border-line">
                <Link to={n.to} onClick={() => setOpen(false)} className="block py-4 font-display text-2xl">
                  {n.label}
                </Link>
                {n.to === '/menu' && cats.length > 0 && (
                  <div className="-mt-1 flex flex-wrap gap-2 pb-4">
                    {cats.map((c) => (
                      <Link key={c.slug} to="/menu" search={{ c: c.slug }} onClick={() => setOpen(false)} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold ring-1 ring-line">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/menu" onClick={() => setOpen(false)} className="btn btn-primary">
                Order now
              </Link>
              <Link to="/contact" hash="quote" onClick={() => setOpen(false)} className="btn btn-ghost text-cocoa">
                Get a quote
              </Link>
              <Link to="/track" onClick={() => setOpen(false)} className="btn btn-ghost text-cocoa">
                Track order
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  )
}

export function SiteFooter({ s }: { s: SiteSettings }) {
  const socials = socialsOf(s)
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}!`)
  const proofWa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, here is my proof of payment for my order.`)
  const occasions = parseOccasions(s.occasions)
  const hasBank = s.bank_account_number && s.bank_name

  return (
    <footer className="mt-28 bg-cocoa text-cream">
      {/* Payment strip */}
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="eyebrow text-accent">How to pay</p>
            <p className="mt-2 max-w-xl text-cream/85">{s.payment_note}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:justify-end">
            {hasBank && (
              <div className="rounded-2xl bg-white/10 px-5 py-3 text-sm">
                <p className="font-semibold">{s.bank_name}</p>
                <p className="font-display text-xl tabular text-accent select-all">{s.bank_account_number}</p>
                {s.bank_account_name && <p className="text-cream/75">{s.bank_account_name}</p>}
              </div>
            )}
            {proofWa && (
              <a href={proofWa} target="_blank" rel="noopener" className="btn btn-light">
                <WhatsAppIcon /> Send proof of payment
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1.2fr_1fr]">
        <div className="max-w-sm">
          <Brand s={s} light size="lg" />
          <p className="mt-5 leading-relaxed text-cream/75">{s.footer_note}</p>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener" aria-label={label} className="rounded-full bg-white/10 p-3 transition hover:bg-accent hover:text-cocoa">
                  <Icon />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow text-accent">Explore</p>
          <ul className="mt-5 space-y-3 text-cream/85">
            <li><Link to="/menu" className="hover:text-accent">Menu</Link></li>
            <li><Link to="/events" className="hover:text-accent">Event bookings</Link></li>
            <li><Link to="/gallery" className="hover:text-accent">Gallery</Link></li>
            <li><Link to="/about" className="hover:text-accent">About us</Link></li>
            <li><Link to="/careers" className="hover:text-accent">Careers</Link></li>
            <li><Link to="/contact" className="hover:text-accent">Contact & delivery</Link></li>
            <li><Link to="/track" className="hover:text-accent">Track your order</Link></li>
            <li><Link to="/faq" className="hover:text-accent">FAQs</Link></li>
            <li><Link to="/terms" className="hover:text-accent">Terms & refunds</Link></li>
            <li><Link to="/privacy" className="hover:text-accent">Privacy policy</Link></li>
            <li><Link to="/contact" hash="quote" className="font-semibold text-accent hover:underline">Get a quote <ArrowRightIcon className="ml-1 inline h-4 w-4 align-[-3px]" /></Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-accent">We bake for</p>
          <ul className="mt-5 space-y-3 text-cream/85">
            {occasions.map((o) => (
              <li key={o.group}>
                <span className="font-semibold text-cream">{o.group}</span>
                <span className="block text-sm text-cream/65">{o.items.slice(0, 3).join(' · ')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow text-accent">Visit or call</p>
          <ul className="mt-5 space-y-2 text-cream/85">
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
          <p className="eyebrow mt-8 text-accent">Opening hours</p>
          <ul className="mt-3 space-y-1.5 text-cream/85">
            {lines(s.opening_hours).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-4 py-6 text-sm text-cream/60 sm:px-6">
          <span>
            © {new Date().getFullYear()} {s.business_name}. All rights reserved.
          </span>
          {s.footer_credit && <span>{s.footer_credit}</span>}
        </div>
      </div>
    </footer>
  )
}
