import { Link, createFileRoute, getRouteApi } from '@tanstack/react-router'
import { FaqList, parseFaqs } from '~/components/Extras'
import { WhatsAppIcon } from '~/components/icons'
import { whatsappLink } from '~/lib/format'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/faq')({
  head: () => ({ meta: [{ title: 'FAQs · Miel Cakes' }] }),
  component: FaqPage,
})

function FaqPage() {
  const s = root.useLoaderData()
  const faqs = parseFaqs(s.faqs)
  const wa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, I have a question.`)
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">FAQs</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.faq_title}</h1>
      <div className="mt-10">
        {faqs.length ? <FaqList items={faqs} /> : <p className="text-muted">No questions yet.</p>}
      </div>
      <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-[2rem] bg-cocoa p-8 text-cream sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl">Still have a question?</h2>
          <p className="mt-1 text-cream/80">We usually reply within a few hours.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="btn btn-light">
              <WhatsAppIcon /> Ask on WhatsApp
            </a>
          )}
          <Link to="/terms" className="btn btn-ghost">Terms & refunds</Link>
        </div>
      </div>
    </div>
  )
}
