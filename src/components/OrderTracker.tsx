import { useEffect, useState } from 'react'
import { ORDER_STATUS, currentStepIndex, trackingSteps, type OrderStatus } from '~/lib/orders'

const when = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'))
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
}

/** Animated progress bar + history, the "where is my cake" view. */
export function OrderTracker({
  status,
  fulfilment,
  events,
}: {
  status: OrderStatus
  fulfilment: string
  events: { status: string; note: string; created_at: string }[]
}) {
  const steps = trackingSteps(fulfilment)
  const current = currentStepIndex(status, fulfilment)
  const cancelled = status === 'cancelled'
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setFill(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-lg font-semibold">
          {!cancelled && status !== 'completed' && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" aria-hidden="true" />}
          {ORDER_STATUS[status]?.label ?? status}
        </p>
      </div>

      {cancelled ? (
        <p className="mt-4 rounded-2xl bg-highlight/10 px-4 py-3 font-semibold text-highlight">This order was cancelled.</p>
      ) : (
        <div className="mt-6">
          <div className="relative h-2 rounded-full bg-line">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none"
              style={{ width: `${fill}%` }}
            />
          </div>
          <ol className="mt-3 grid gap-2 text-xs sm:text-sm" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((st, i) => (
              <li key={st.key} className={`${i <= current ? 'font-semibold text-cocoa' : 'text-muted'} ${i === steps.length - 1 ? 'text-right' : i > 0 ? 'text-center' : ''}`}>
                {st.label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {events.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer font-semibold text-muted">Order history</summary>
          <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">
            {[...events].reverse().map((e, i) => (
              <li key={i}>
                <span className="font-semibold">{ORDER_STATUS[e.status as OrderStatus]?.label ?? e.status}</span>
                {e.note && <span className="text-cocoa/75"> · {e.note}</span>}
                <span className="block text-xs text-muted">{when(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
