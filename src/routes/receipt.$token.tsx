import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ReceiptSheet } from '~/components/ReceiptSheet'
import { getReceiptByToken } from '~/fns/business'
import { ArrowLeftIcon } from '~/components/icons'

const root = getRouteApi('__root__')

// The link customers receive. Only someone with the secret token in the link can open it.
export const Route = createFileRoute('/receipt/$token')({
  loader: ({ params }) => getReceiptByToken({ data: params.token }),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Receipt ${loaderData.code} · Miel Cakes` : 'Receipt · Miel Cakes' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ReceiptPage,
})

function ReceiptPage() {
  const s = root.useLoaderData()
  const r = Route.useLoaderData()
  return (
    <div className="min-h-screen bg-soft px-4 py-10 sm:py-16">
      <div className="no-print mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <Link to="/" className="font-semibold text-cocoa hover:text-brand"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />{s.business_name}</Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary">
          Print or save as PDF
        </button>
      </div>
      <ReceiptSheet r={r} s={s} />
    </div>
  )
}
