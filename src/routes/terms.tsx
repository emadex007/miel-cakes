import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms & refunds · Miel Cakes' }] }),
  component: TermsPage,
})

/** Turns the owner's plain text into headings (## …), bullet lists (- …) and paragraphs. */
function renderTerms(text: string) {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/)
  const out: ReactNode[] = []
  blocks.forEach((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    const rest: string[] = []
    lines.forEach((l) => {
      if (l.startsWith('## ')) {
        if (rest.length) out.push(<p key={`p${i}-${out.length}`}>{rest.splice(0).join(' ')}</p>)
        out.push(
          <h2 key={`h${i}-${out.length}`} className="!mt-10 font-display text-2xl text-cocoa">
            {l.slice(3)}
          </h2>,
        )
      } else rest.push(l)
    })
    if (!rest.length) return
    if (rest.every((l) => l.startsWith('- '))) {
      out.push(
        <ul key={`u${i}`} className="list-disc space-y-1 pl-5">
          {rest.map((l) => (
            <li key={l}>{l.slice(2)}</li>
          ))}
        </ul>,
      )
    } else out.push(<p key={`p${i}`}>{rest.join(' ')}</p>)
  })
  return out
}

function TermsPage() {
  const s = root.useLoaderData()
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
      <p className="eyebrow text-brand">The small print</p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.terms_title}</h1>
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-cocoa/85">{renderTerms(s.terms_body)}</div>
      <p className="mt-12 rounded-2xl bg-honey p-5 text-cocoa/85">
        Questions about an order? Message us on WhatsApp{s.phone ? ` or call ${s.phone}` : ''}.
      </p>
    </div>
  )
}
