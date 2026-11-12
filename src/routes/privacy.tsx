import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { PolicyText } from '~/components/PolicyText'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy policy · Miel Cakes' }] }),
  component: PrivacyPage,
})

function PrivacyPage() {
  const s = root.useLoaderData()
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">Your details are safe with us</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.privacy_title}</h1>
      <PolicyText text={s.privacy_body} />
      <p className="mt-12 rounded-2xl bg-honey p-5 text-cocoa/85">
        See also our <Link to="/terms" className="font-semibold underline">terms & refunds</Link>.
      </p>
    </div>
  )
}
