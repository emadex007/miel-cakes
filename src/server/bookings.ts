// Server-only booking helpers. They take the database as a parameter so the
// Worker entry (webhook, uploads) and server functions can both use them.
import type { Booking, BookingEvent, BookingPayment } from '~/lib/bookings'

export async function loadBooking(db: D1Database, where: string, bind: unknown[]) {
  const booking = await db
    .prepare(
      `SELECT b.*, z.name AS zone_name, COALESCE(NULLIF(b.contact_name, ''), c.name) AS customer_name, COALESCE(NULLIF(b.contact_email, ''), c.email) AS customer_email, c.phone AS customer_phone
       FROM bookings b LEFT JOIN delivery_zones z ON z.id = b.zone_id JOIN customers c ON c.id = b.customer_id ${where}`,
    )
    .bind(...bind)
    .first<Booking>()
  if (!booking) return null
  const [events, payments] = await Promise.all([
    db.prepare('SELECT * FROM booking_events WHERE booking_id = ? ORDER BY id').bind(booking.id).all<BookingEvent>().then((r) => r.results),
    db.prepare('SELECT * FROM booking_payments WHERE booking_id = ? ORDER BY id').bind(booking.id).all<BookingPayment>().then((r) => r.results),
  ])
  return { booking, events, payments }
}

/**
 * Re-adds up every payment for a booking, stores the total, and books the date
 * once the deposit is covered. Safe to call any number of times.
 */
export async function recountBookingPayments(db: D1Database, bookingId: number, opts: { proofChecked?: boolean } = {}) {
  const b = await db
    .prepare('SELECT id, status, deposit_amount, quote_amount, paid_amount FROM bookings WHERE id = ?')
    .bind(bookingId)
    .first<{ id: number; status: string; deposit_amount: number; quote_amount: number; paid_amount: number }>()
  if (!b) return
  const row = await db.prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM booking_payments WHERE booking_id = ?').bind(bookingId).first<{ paid: number }>()
  const paid = row?.paid ?? 0
  const nowBooked = (b.status === 'quoted' || b.status === 'checking') && paid > 0 && paid >= b.deposit_amount
  const checked = opts.proofChecked ? 1 : 0
  const statements = [
    db
      .prepare(
        `UPDATE bookings SET paid_amount = ?, updated_at = datetime('now'),
         proof_pending = CASE WHEN ? = 1 THEN 0 ELSE proof_pending END,
         status = CASE WHEN ? = 1 THEN 'booked' WHEN ? = 1 AND status = 'checking' THEN 'quoted' ELSE status END WHERE id = ?`,
      )
      .bind(paid, checked, nowBooked ? 1 : 0, checked, bookingId),
  ]
  if (nowBooked) {
    statements.push(db.prepare(`INSERT INTO booking_events (booking_id, status, note) VALUES (?, 'booked', 'Deposit received. Your date is booked.')`).bind(bookingId))
  } else if (b.status === 'booked' && b.quote_amount > 0 && paid >= b.quote_amount && b.paid_amount < b.quote_amount) {
    statements.push(db.prepare(`INSERT INTO booking_events (booking_id, status, note) VALUES (?, 'booked', 'Paid in full. Thank you!')`).bind(bookingId))
  }
  await db.batch(statements)
}

/** Records a verified Paystack payment for a booking. Each reference counts once. */
export async function markBookingPaidByReference(db: D1Database, reference: string, amountNaira: number) {
  // References look like MB-1004-a1b2c3d4
  const code = reference.split('-').slice(0, 2).join('-')
  const b = await db.prepare('SELECT id FROM bookings WHERE code = ?').bind(code).first<{ id: number }>()
  if (!b) return { ok: false, reason: 'not_found' as const }
  const existing = await db.prepare('SELECT id FROM booking_payments WHERE reference = ?').bind(reference).first()
  if (existing) return { ok: true, already: true }
  const ins = await db
    .prepare(`INSERT OR IGNORE INTO booking_payments (booking_id, amount, method, reference, note) VALUES (?, ?, 'paystack', ?, 'Paid by card (Paystack)')`)
    .bind(b.id, Math.round(amountNaira), reference)
    .run()
  if (!ins.meta.changes) return { ok: true, already: true } // the webhook and return page arrived together
  await recountBookingPayments(db, b.id, { proofChecked: true }) // adds "date booked" / "paid in full" to the history
  return { ok: true, already: false, bookingId: b.id, amount: Math.round(amountNaira) }
}
