import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Reveal } from '~/components/motion'
import { ProductCard } from '~/components/ProductCard'
import { getMenu } from '~/fns/public'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/menu/')({
  validateSearch: (search: Record<string, unknown>): { c?: string } =>
    typeof search.c === 'string' && search.c ? { c: search.c } : {},
  loader: () => getMenu(),
  head: () => ({ meta: [{ title: 'Menu · Miel Cakes' }] }),
  component: MenuPage,
})

function MenuPage() {
  const s = root.useLoaderData()
  const { categories, products } = Route.useLoaderData()
  const { c } = Route.useSearch()
  const active = categories.find((cat) => cat.slug === c)
  const visibleCats = active ? [active] : categories.filter((cat) => products.some((p) => p.category_id === cat.id))

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Our menu</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Everything we bake</h1>
      {s.order_note && <p className="mt-4 max-w-2xl text-muted">{s.order_note}</p>}

      <nav className="sticky top-[68px] z-30 -mx-4 mt-8 overflow-x-auto border-b border-line bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" aria-label="Menu categories">
        <div className="flex w-max gap-2">
          <Link
            to="/menu"
            search={{}}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${!active ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/menu"
              search={{ c: cat.slug }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${active?.id === cat.id ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>

      {visibleCats.map((cat) => {
        const items = products.filter((p) => p.category_id === cat.id)
        return (
          <section key={cat.id} className="pt-12" id={cat.slug}>
            <Reveal>
              <h2 className="font-display text-3xl">{cat.name}</h2>
              {cat.description && <p className="mt-1 text-muted">{cat.description}</p>}
            </Reveal>
            {items.length ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p, n) => (
                  <Reveal key={p.id} delay={(n % 4) * 0.07}>
                    <ProductCard p={p} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-white p-6 text-muted ring-1 ring-line">Nothing in this category yet. Check back soon.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
