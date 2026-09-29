import type { ReactNode } from 'react'

export function AuthShell({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-12 sm:pt-16">
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-2 text-muted">{intro}</p>
      <div className="mt-8 rounded-[2rem] bg-white p-6 ring-1 ring-line sm:p-8">{children}</div>
    </div>
  )
}

export const authInput = 'w-full rounded-2xl border-0 bg-cream px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
