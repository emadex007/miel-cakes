// Paystack helpers. The secret key lives in the PAYSTACK_SECRET_KEY Cloudflare secret, never in the database.

const API = 'https://api.paystack.co'

export async function paystackInitialize(secret: string, body: { email: string; amountNaira: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: body.email,
      amount: Math.round(body.amountNaira * 100), // kobo
      currency: 'NGN',
      reference: body.reference,
      callback_url: body.callbackUrl,
      metadata: body.metadata ?? {},
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: { authorization_url: string } }
  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message ? `Paystack: ${data.message}` : 'Could not start the card payment. Please try again or pay by transfer.')
  }
  return data.data.authorization_url
}

export async function paystackVerify(secret: string, reference: string) {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { authorization: `Bearer ${secret}` },
  })
  const data = (await res.json().catch(() => ({}))) as {
    status?: boolean
    data?: { status: string; amount: number; currency: string; reference: string }
  }
  if (!res.ok || !data.status || !data.data) return null
  return { paid: data.data.status === 'success', amountNaira: data.data.amount / 100, currency: data.data.currency, reference: data.data.reference }
}

/** Checks a webhook's x-paystack-signature header (HMAC-SHA512 of the raw body with the secret key). */
export async function paystackSignatureValid(secret: string, rawBody: string, signature: string | null) {
  if (!signature) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)))
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')
  if (hex.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

/**
 * Marks an order paid if the amount matches. Safe to call more than once
 * (from the return page and from the webhook).
 */
export async function markOrderPaidByReference(db: D1Database, reference: string, amountNaira: number) {
  const order = await db
    .prepare('SELECT id, total, payment_status FROM orders WHERE paystack_ref = ?')
    .bind(reference)
    .first<{ id: number; total: number; payment_status: string }>()
  if (!order) return { ok: false, reason: 'not_found' as const }
  if (order.payment_status === 'paid') return { ok: true, already: true }
  if (Math.round(amountNaira) < order.total) return { ok: false, reason: 'amount_mismatch' as const }
  await db.batch([
    db
      .prepare(
        `UPDATE orders SET payment_status = 'paid', status = 'received', paid_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ? AND payment_status != 'paid'`,
      )
      .bind(order.id),
    db.prepare(`INSERT INTO order_events (order_id, status, note) VALUES (?, 'received', 'Paid by card (Paystack)')`).bind(order.id),
  ])
  return { ok: true, already: false }
}
