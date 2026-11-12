// Alerts and emails.
// - Phone alerts (Web Push) to every phone/computer the team switched on.
// - Emails through Resend (resend.com): alerts to the owner's inbox, updates to
//   customers, and festive emails to the customer list.
// Everything here is best-effort: a failed alert never stops an order going through.
import { generateVapidKeys, sendPush, type VapidKeys } from './webpush'

type Env = Cloudflare.Env

// ---------------------------------------------------------------------------
// Settings (read straight from the table so this works in any context)
// ---------------------------------------------------------------------------
const NOTIFY_KEYS = [
  'business_name',
  'email',
  'alert_email',
  'email_from',
  'email_alerts_enabled',
  'customer_emails_enabled',
  'email_daily_limit',
  'campaign_daily_count',
  'push_enabled',
  'color_primary',
  'logo_url',
  'whatsapp',
  'phone',
  'address',
]
export async function notifySettings(db: D1Database) {
  const { results } = await db
    .prepare(`SELECT key, value FROM settings WHERE key IN (${NOTIFY_KEYS.map(() => '?').join(',')})`)
    .bind(...NOTIFY_KEYS)
    .all<{ key: string; value: string }>()
  const s = Object.fromEntries(results.map((r) => [r.key, r.value])) as Record<string, string | undefined>
  const on = (k: string) => s[k] !== '' // toggles: missing = on (default), '' = switched off
  return {
    business: s.business_name || 'Miel Cakes',
    alertEmail: (s.alert_email || s.email || '').trim(),
    from: (s.email_from || 'orders@mielcakes.com').trim(),
    replyTo: (s.email || '').trim(),
    alertsOn: on('email_alerts_enabled'),
    customerOn: on('customer_emails_enabled'),
    pushOn: on('push_enabled'),
    dailyLimit: Math.max(1, Number(s.email_daily_limit) || 100),
    campaignPerDay: Math.max(0, Number(s.campaign_daily_count) || 80),
    color: /^#[0-9a-f]{6}$/i.test(s.color_primary ?? '') ? s.color_primary! : '#1D4ED8',
    logo: s.logo_url || '',
    whatsapp: s.whatsapp || '',
    phone: s.phone || '',
    address: s.address || '',
  }
}
export type NotifySettings = Awaited<ReturnType<typeof notifySettings>>

/** Links in emails always use the real web address (mielcakes.com), not workers.dev. */
export const publicOrigin = (env: Env, fallback: string) => (env.CANONICAL_HOST ? `https://${env.CANONICAL_HOST}` : fallback || 'https://mielcakes.com')

export const isRealEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !/@guest\.local$/i.test(e)

// ---------------------------------------------------------------------------
// Email layout
// ---------------------------------------------------------------------------
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export interface EmailContent {
  heading: string
  /** Paragraphs. Blank lines split paragraphs; single line breaks are kept. */
  body: string
  /** Label/value rows, e.g. order details */
  rows?: [string, string][]
  button?: { label: string; url: string }
  image?: string
  /** Shown small at the bottom (e.g. unsubscribe link) */
  footerHtml?: string
}

export function emailHtml(s: NotifySettings, origin: string, c: EmailContent) {
  const abs = (u: string) => (u.startsWith('/') ? `${origin}${u}` : u)
  const paras = c.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3b2a24">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const rows = c.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border-collapse:collapse">${c.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:7px 0;border-bottom:1px solid #f0e6df;font-size:13px;color:#8a776e;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #f0e6df;font-size:14px;color:#3b2a24;font-weight:600">${esc(v).replace(/\n/g, '<br>')}</td></tr>`,
        )
        .join('')}</table>`
    : ''
  const button = c.button
    ? `<p style="margin:8px 0 6px"><a href="${esc(abs(c.button.url))}" style="display:inline-block;background:${s.color};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px">${esc(c.button.label)}</a></p>`
    : ''
  const image = c.image ? `<img src="${esc(abs(c.image))}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:14px;margin:0 0 18px">` : ''
  const brand = s.logo
    ? `<img src="${esc(abs(s.logo))}" alt="${esc(s.business)}" height="44" style="height:44px;width:auto">`
    : `<span style="font-family:Georgia,serif;font-size:24px;color:${s.color}">${esc(s.business)}</span>`
  const contact = [s.phone, s.address.replace(/\n/g, ', ')].filter(Boolean).map(esc).join(' · ')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#faf5f1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5f1;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;padding:28px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<tr><td style="padding-bottom:18px"><a href="${esc(origin)}" style="text-decoration:none">${brand}</a></td></tr>
<tr><td>
${image}
<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#2a1a14;font-weight:normal">${esc(c.heading)}</h1>
${paras}${rows}${button}
</td></tr>
<tr><td style="padding-top:22px;border-top:1px solid #f0e6df;margin-top:18px;font-size:12px;line-height:1.6;color:#8a776e">
${esc(s.business)}${contact ? ` · ${contact}` : ''}<br><a href="${esc(origin)}" style="color:#8a776e">${esc(origin.replace(/^https?:\/\//, ''))}</a>${c.footerHtml ? `<br>${c.footerHtml}` : ''}
</td></tr></table></td></tr></table></body></html>`
}

export function emailText(c: EmailContent, origin: string) {
  const abs = (u: string) => (u.startsWith('/') ? `${origin}${u}` : u)
  return [c.heading, '', c.body, ...(c.rows ?? []).map(([k, v]) => `${k}: ${v}`), c.button ? `\n${c.button.label}: ${abs(c.button.url)}` : '']
    .join('\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Sending email (Resend)
// ---------------------------------------------------------------------------
const dayStart = () => {
  // Midnight in Abuja (UTC+1), as SQLite UTC text
  const now = new Date(Date.now() + 3_600_000)
  const d = now.toISOString().slice(0, 10)
  return new Date(`${d}T00:00:00Z`).getTime() - 3_600_000
}
export async function emailsSentToday(db: D1Database) {
  const since = new Date(dayStart()).toISOString().replace('T', ' ').slice(0, 19)
  const row = await db.prepare('SELECT COUNT(*) AS n FROM email_log WHERE ok = 1 AND created_at >= ?').bind(since).first<{ n: number }>()
  return row?.n ?? 0
}

interface OutEmail {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

async function resend(env: Env, path: string, payload: unknown) {
  const key = env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'Email is not set up yet (RESEND_API_KEY is missing).' }
  try {
    const res = await fetch(`https://api.resend.com${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) return { ok: true, error: '' }
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    return { ok: false, error: (data.message || `Resend error ${res.status}`).slice(0, 300) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Resend.' }
  }
}

export async function sendEmails(env: Env, s: NotifySettings, kind: 'alert' | 'customer' | 'campaign', emails: OutEmail[]) {
  if (!emails.length) return { ok: true, error: '' }
  const from = `${s.business} <${s.from}>`
  const base = (e: OutEmail) => ({
    from,
    to: [e.to],
    subject: e.subject,
    html: e.html,
    text: e.text,
    ...(s.replyTo && isRealEmail(s.replyTo) ? { reply_to: s.replyTo } : {}),
    ...(e.headers ? { headers: e.headers } : {}),
  })
  // One email: normal send. Several: Resend's batch (up to 100 in one call).
  const r = emails.length === 1 ? await resend(env, '/emails', base(emails[0])) : await resend(env, '/emails/batch', emails.map(base))
  await env.DB.batch(
    emails.map((e) =>
      env.DB.prepare('INSERT INTO email_log (kind, to_email, subject, ok, error) VALUES (?, ?, ?, ?, ?)').bind(kind, e.to, e.subject.slice(0, 200), r.ok ? 1 : 0, r.error),
    ),
  )
  return r
}

/** One email, built from the shared layout. Checks the daily allowance first. */
export async function sendTemplatedEmail(env: Env, kind: 'alert' | 'customer', to: string, subject: string, content: EmailContent, origin: string) {
  const s = await notifySettings(env.DB)
  if (!isRealEmail(to) || !env.RESEND_API_KEY) return { ok: false, error: 'skipped' }
  if (kind === 'alert' && !s.alertsOn) return { ok: false, error: 'off' }
  if (kind === 'customer' && !s.customerOn) return { ok: false, error: 'off' }
  if ((await emailsSentToday(env.DB)) >= s.dailyLimit) return { ok: false, error: 'Daily email allowance used up.' }
  const site = publicOrigin(env, origin)
  return sendEmails(env, s, kind, [{ to, subject, html: emailHtml(s, site, content), text: emailText(content, site) }])
}

// ---------------------------------------------------------------------------
// Phone alerts (Web Push)
// ---------------------------------------------------------------------------
/** The site's own notification keys, made the first time they're needed. */
export async function vapidKeys(db: D1Database): Promise<VapidKeys> {
  const row = await db.prepare("SELECT value FROM app_secrets WHERE key = 'vapid'").first<{ value: string }>()
  if (row) return JSON.parse(row.value) as VapidKeys
  const keys = await generateVapidKeys()
  await db.prepare("INSERT OR IGNORE INTO app_secrets (key, value) VALUES ('vapid', ?)").bind(JSON.stringify(keys)).run()
  // If two requests raced, use whichever was saved first
  const saved = await db.prepare("SELECT value FROM app_secrets WHERE key = 'vapid'").first<{ value: string }>()
  return JSON.parse(saved!.value) as VapidKeys
}

export interface Alert {
  title: string
  body: string
  /** Page to open when the alert is tapped, e.g. /admin/orders/12 */
  url: string
  /** Same tag replaces an older alert instead of stacking (e.g. one per chat) */
  tag?: string
}

export async function pushToTeam(env: Env, alert: Alert, onlyIds?: number[]) {
  const { results } = await env.DB.prepare('SELECT id, endpoint, p256dh, auth FROM push_subscriptions').all<{ id: number; endpoint: string; p256dh: string; auth: string }>()
  const subs = onlyIds ? results.filter((r) => onlyIds.includes(r.id)) : results
  if (!subs.length) return { sent: 0, failed: 0 }
  const keys = await vapidKeys(env.DB)
  const s = await notifySettings(env.DB)
  const subject = `mailto:${isRealEmail(s.alertEmail) ? s.alertEmail : 'hello@mielcakes.com'}`
  const outcomes = await Promise.all(subs.map((sub) => sendPush(sub, alert, keys, subject).then((r) => ({ id: sub.id, r }))))
  const gone = outcomes.filter((o) => o.r === 'gone').map((o) => o.id)
  if (gone.length) await env.DB.prepare(`DELETE FROM push_subscriptions WHERE id IN (${gone.map(() => '?').join(',')})`).bind(...gone).run()
  return { sent: outcomes.filter((o) => o.r === 'ok').length, failed: outcomes.filter((o) => o.r === 'error').length }
}

// ---------------------------------------------------------------------------
// One call for "something happened": phone alert + email to the owner
// ---------------------------------------------------------------------------
export async function alertOwner(
  env: Env,
  origin: string,
  alert: Alert & { email?: { subject: string; content: EmailContent } | false },
) {
  const jobs: Promise<unknown>[] = []
  const s = await notifySettings(env.DB)
  if (s.pushOn) jobs.push(pushToTeam(env, alert).catch(() => null))
  if (alert.email !== false && s.alertsOn && isRealEmail(s.alertEmail)) {
    const content: EmailContent = alert.email?.content ?? { heading: alert.title, body: alert.body, button: { label: 'Open the dashboard', url: alert.url } }
    jobs.push(sendTemplatedEmail(env, 'alert', s.alertEmail, alert.email?.subject ?? alert.title, content, origin).catch(() => null))
  }
  await Promise.all(jobs)
}

/** Email to a customer (skips guests' placeholder addresses and switched-off emails). */
export async function emailCustomer(env: Env, origin: string, to: string | undefined | null, subject: string, content: EmailContent) {
  if (!to || !isRealEmail(to)) return
  await sendTemplatedEmail(env, 'customer', to, subject, content, origin).catch(() => null)
}
