import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { PolicyText } from '~/components/PolicyText'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms & refunds · Miel Cakes' }] }),
  component: TermsPage,
})

function TermsPage() {
  const s = root.useLoaderData()
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">The small print</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.terms_title}</h1>
      <PolicyText text={s.terms_body} />
      <p className="mt-12 rounded-2xl bg-honey p-5 text-cocoa/85">
        Questions about an order? Message us on WhatsApp{s.phone ? ` or call ${s.phone}` : ''}. See also our{' '}
        <Link to="/privacy" className="font-semibold underline">privacy policy</Link>.
      </p>
    </div>
  )
}
