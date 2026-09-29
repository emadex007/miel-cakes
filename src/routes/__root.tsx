/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { getSiteSettings } from '~/fns/public'
import { SiteFooter, SiteHeader } from '~/components/SiteChrome'
import { NotFound } from '~/components/NotFound'
import appCss from '~/styles.css?url'

export const Route = createRootRoute({
  loader: () => getSiteSettings(),
  head: ({ loaderData }) => {
    const name = loaderData?.business_name ?? 'Miel Cakes'
    const tagline = loaderData?.tagline ?? ''
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { title: tagline ? `${name} · ${tagline}` : name },
        { name: 'description', content: loaderData?.hero_subtitle ?? '' },
        { name: 'theme-color', content: loaderData?.color_primary ?? '#B8325A' },
        { property: 'og:title', content: name },
        { property: 'og:description', content: tagline },
        { property: 'og:image', content: loaderData?.hero_image_url ?? '' },
      ],
      links: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Young+Serif&display=swap',
        },
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
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
  const isAdmin = pathname.startsWith('/admin')
  // Colours are validated as #RRGGBB on the server before they get here.
  const brandCss = `:root{--c-primary:${s.color_primary};--c-accent:${s.color_accent};--c-dark:${s.color_dark};--c-cream:${s.color_cream};}`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandCss }} />
      {isAdmin ? (
        <Outlet />
      ) : (
        <div className="flex min-h-screen flex-col">
          <SiteHeader s={s} />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter s={s} />
        </div>
      )}
    </>
  )
}
