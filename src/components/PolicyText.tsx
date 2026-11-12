import type { ReactNode } from 'react'

/** Turns the owner's plain text into headings (## …), bullet lists (- …) and paragraphs. */
function renderPolicy(text: string) {
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


/** Policy text the owner writes in the dashboard (## headings, - bullet lists, paragraphs). */
export function PolicyText({ text }: { text: string }) {
  return <div className="mt-8 space-y-4 text-lg leading-relaxed text-cocoa/85">{renderPolicy(text)}</div>
}
