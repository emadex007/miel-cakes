import { useEffect, useState } from 'react'
import { BOOKING_STATUS, BOOKING_STEPS, bookingStepIndex, type BookingStatus } from '~/lib/bookings'

const when = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'))
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
}

/** Progress bar + history for an event booking. */
export function BookingTracker({
  booking,
  events,
  admin = false,
}: {
  booking: { status: BookingStatus; quote_amount: number; paid_amount: number }
  events: { status: string; note: string; created_at: string }[]
  admin?: boolean
}) {
  const current = bookingStepIndex(booking)
  const closed = booking.status === 'cancelled' || booking.status === 'declined'
  const pct = (current / (BOOKING_STEPS.length - 1)) * 100
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setFill(pct), 80)
    return () => clearTimeout(t)
  }, [pct])
  const info = BOOKING_STATUS[booking.status]

  return (
    <div className={admin ? 'admin-card p-5' : 'rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8'}>
      <p className="flex items-center gap-2 text-lg font-semibold">
        {!closed && booking.status !== 'completed' && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" aria-hidden="true" />}
        {admin ? info.admin : info.label}
      </p>

      {closed ? (
        <p className="mt-4 rounded-2xl bg-highlight/10 px-4 py-3 font-semibold text-highlight">
          {booking.status === 'declined' ? 'We’re sorry, we can’t take this booking.' : 'This booking was cancelled.'}
        </p>
      ) : (
        <div className="mt-6">
          <div className="relative h-2 rounded-full bg-line">
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-[1400ms] ease-out motion-reduce:transition-none" style={{ width: `${fill}%` }} />
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-2 text-xs sm:text-sm">
            {BOOKING_STEPS.map((st, i) => (
              <li key={st.key} className={`${i <= current ? 'font-semibold text-cocoa' : 'text-muted'} ${i === BOOKING_STEPS.length - 1 ? 'text-right' : i > 0 ? 'text-center' : ''}`}>
                {st.label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {events.length > 0 && (
        <details className="mt-6 text-sm" open={admin}>
          <summary className="cursor-pointer font-semibold text-muted">Booking history</summary>
          <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">
            {[...events].reverse().map((e, i) => (
              <li key={i}>
                <span className="font-semibold">{e.note || BOOKING_STATUS[e.status as BookingStatus]?.label || e.status}</span>
                <span className="block text-xs text-muted">{when(e.created_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
