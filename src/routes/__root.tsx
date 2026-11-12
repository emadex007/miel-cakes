/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { getSiteSettings } from '~/fns/public'
import { LiveChat } from '~/components/Chat'
import { FloatingWhatsApp, PromoBanner } from '~/components/Extras'
import { ShopProvider } from '~/components/Shop'
import { SiteFooter, SiteHeader } from '~/components/SiteChrome'
import { NotFound } from '~/components/NotFound'
import { bakeryJsonLd, jsonLd } from '~/lib/seo'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  loader: () => getSiteSettings(),
  head: ({ loaderData }) => {
    const name = loaderData?.business_name ?? 'Miel Cakes'
    const tagline = loaderData?.tagline ?? ''
    const title = tagline ? `${name} · ${tagline}` : name
    const description = loaderData?.meta_description || loaderData?.hero_subtitle || ''
    const siteUrl = (loaderData?.site_url ?? '').replace(/\/+$/, '')
    const rawImage = loaderData?.share_image_url || loaderData?.hero_image_url || ''
    // Link previews need a full address for images stored on this site (/media/...)
    const image = rawImage.startsWith('/') && siteUrl ? `${siteUrl}${rawImage}` : rawImage
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { title },
        { name: 'description', content: description },
        { name: 'theme-color', content: loaderData?.color_primary ?? '#1D4ED8' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: name },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(image ? [{ property: 'og:image', content: image }, { name: 'twitter:image', content: image }] : []),
        ...(siteUrl ? [{ property: 'og:url', content: siteUrl }] : []),
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Young+Serif&display=swap',
        },
        { rel: 'stylesheet', href: appCss },
        ...(loaderData?.site_icon_url
          ? [
              { rel: 'icon', href: loaderData.site_icon_url },
              { rel: 'apple-touch-icon', href: loaderData.site_icon_url },
            ]
          : [
              { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
              { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
              { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
            ]),
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      scripts: [
        // Bakery details for Google (name, address, phone, socials)
        ...(loaderData ? [{ type: 'application/ld+json', children: jsonLd(bakeryJsonLd(loaderData)) }] : []),
        // Cloudflare Web Analytics (free visitor statistics), when a token is set
        ...(loaderData?.cf_analytics_token
          ? [{ src: 'https://static.cloudflareinsights.com/beacon.min.js', defer: true, 'data-cf-beacon': JSON.stringify({ token: loaderData.cf_analytics_token }) }]
          : []),
      ],
    }
  },
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Marks that JS is running so scroll-reveal can hide content until it animates in */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const s = Route.useLoaderData()
  const pathname = useRouterState({ select: (st) => st.location.pathname })
  // Admin pages and printable receipts have their own layout, without the site header and footer.
  const isBare = pathname.startsWith('/admin') || pathname.startsWith('/receipt/')
  // Colours are validated as #RRGGBB on the server before they get here.
  const brandCss = `:root{--c-primary:${s.color_primary};--c-hover:${s.color_hover};--c-hover-text:${s.color_hover_text};--c-accent:${s.color_accent};--c-highlight:${s.color_highlight};--c-dark:${s.color_dark};--c-cream:${s.color_cream};}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandCss }} />
      {isBare ? (
        <Outlet />
      ) : (
        <ShopProvider>
        <div className="flex min-h-screen flex-col">
          <PromoBanner s={s} />
          <SiteHeader s={s} />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter s={s} />
          {s.chat_enabled === '1' ? <LiveChat s={s} /> : <FloatingWhatsApp s={s} />}
        </div>
        </ShopProvider>
      )}
    </>
  )
}
