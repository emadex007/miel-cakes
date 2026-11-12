// Discount codes: checking a code against an order and working out the amount off.
/** Today's date in Abuja (UTC+1), as YYYY-MM-DD. */
const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10)

export interface DiscountCode {
  id: number
  code: string
  kind: 'percent' | 'amount'
  value: number
  min_order: number
  max_uses: number
  used_count: number
  starts_on: string
  ends_on: string
  is_active: number
  note: string
  created_at: string
}

export const normaliseCode = (code: unknown) =>
  String(code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 30)

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`

/** Amount off `subtotal` (items only, not delivery), or a friendly reason it can't be used. */
export function discountFor(d: DiscountCode | null, subtotal: number, today = lagosToday()): { ok: true; amount: number; label: string } | { ok: false; reason: string } {
  if (!d || !d.is_active) return { ok: false, reason: 'That code isn’t valid.' }
  if (d.starts_on && today < d.starts_on) return { ok: false, reason: `That code starts on ${d.starts_on}.` }
  if (d.ends_on && today > d.ends_on) return { ok: false, reason: 'That code has expired.' }
  if (d.max_uses > 0 && d.used_count >= d.max_uses) return { ok: false, reason: 'That code has been used up.' }
  if (d.min_order > 0 && subtotal < d.min_order) return { ok: false, reason: `That code needs an order of at least ${naira(d.min_order)}.` }
  const raw = d.kind === 'percent' ? Math.round((subtotal * Math.min(100, Math.max(0, d.value))) / 100) : Math.max(0, d.value)
  const amount = Math.min(subtotal, raw)
  if (amount <= 0) return { ok: false, reason: 'That code doesn’t take anything off this order.' }
  return { ok: true, amount, label: d.kind === 'percent' ? `${d.value}% off` : `${naira(d.value)} off` }
}

export async function findDiscount(db: D1Database, code: unknown) {
  const c = normaliseCode(code)
  if (!c) return null
  return db.prepare('SELECT * FROM discount_codes WHERE code = ?').bind(c).first<DiscountCode>()
}
