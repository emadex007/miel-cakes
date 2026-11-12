// Festive emails to the customer list, sent in daily batches so they stay
// inside Resend's free allowance (100 a day). A daily schedule (cron in
// wrangler.toml) sends the next batch each morning until everyone has it.
import { emailHtml, emailText, emailsSentToday, esc, isRealEmail, notifySettings, publicOrigin, sendEmails, type EmailContent } from './notify'

type Env = Cloudflare.Env
const RESERVE = 10 // always keep a few emails a day for order updates

export interface Campaign {
  id: number
  subject: string
  heading: string
  body: string
  image_url: string
  button_label: string
  button_url: string
  status: 'sending' | 'done' | 'stopped'
  total: number
  sent: number
  failed: number
  created_by: string
  created_at: string
}

export const firstName = (name: string) => (name || '').trim().split(/\s+/)[0] || 'there'
/** {name} in the subject or message becomes the customer's first name. */
export const personalise = (text: string, name: string) => text.replace(/\{name\}/gi, firstName(name))

export function campaignContent(c: Pick<Campaign, 'heading' | 'body' | 'image_url' | 'button_label' | 'button_url'>, name: string, unsubUrl: string): EmailContent {
  return {
    heading: personalise(c.heading, name),
    body: personalise(c.body, name),
    image: c.image_url || undefined,
    button: c.button_label && c.button_url ? { label: c.button_label, url: c.button_url } : undefined,
    footerHtml: unsubUrl ? `You get these emails because you’re one of our customers. <a href="${esc(unsubUrl)}" style="color:#8a776e">Unsubscribe</a>` : '',
  }
}

async function campaignSentToday(db: D1Database) {
  const now = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10)
  const since = new Date(new Date(`${now}T00:00:00Z`).getTime() - 3_600_000).toISOString().replace('T', ' ').slice(0, 19)
  const row = await db.prepare("SELECT COUNT(*) AS n FROM email_log WHERE kind = 'campaign' AND ok = 1 AND created_at >= ?").bind(since).first<{ n: number }>()
  return row?.n ?? 0
}

/** How many festive emails can still go out today. */
export async function campaignAllowance(env: Env) {
  const s = await notifySettings(env.DB)
  const [all, campaign] = await Promise.all([emailsSentToday(env.DB), campaignSentToday(env.DB)])
  return Math.max(0, Math.min(s.campaignPerDay - campaign, s.dailyLimit - RESERVE - all, 100))
}

/** Sends today's batch. Safe to run any number of times a day. */
export async function sendCampaignBatch(env: Env, origin: string): Promise<{ sent: number; error: string }> {
  if (!env.RESEND_API_KEY) return { sent: 0, error: 'Email is not set up yet.' }
  const allowance = await campaignAllowance(env)
  if (allowance <= 0) return { sent: 0, error: '' }
  const { results } = await env.DB
    .prepare(
      `SELECT r.id, r.campaign_id, r.name, r.email, COALESCE(cl.email_opt_out, 0) AS opt_out, COALESCE(cl.unsub_token, '') AS token
       FROM email_campaign_recipients r
       JOIN email_campaigns c ON c.id = r.campaign_id AND c.status = 'sending'
       LEFT JOIN clients cl ON cl.id = r.client_id
       WHERE r.status = 'queued' ORDER BY r.campaign_id, r.id LIMIT ?`,
    )
    .bind(allowance)
    .all<{ id: number; campaign_id: number; name: string; email: string; opt_out: number; token: string }>()
  if (!results.length) {
    await finishDone(env.DB)
    return { sent: 0, error: '' }
  }
  const skipped = results.filter((r) => r.opt_out || !isRealEmail(r.email))
  const toSend = results.filter((r) => !r.opt_out && isRealEmail(r.email))
  const campaigns = new Map<number, Campaign>()
  for (const id of new Set(toSend.map((r) => r.campaign_id))) {
    const c = await env.DB.prepare('SELECT * FROM email_campaigns WHERE id = ?').bind(id).first<Campaign>()
    if (c) campaigns.set(id, c)
  }
  const s = await notifySettings(env.DB)
  const site = publicOrigin(env, origin)
  const emails = toSend.map((r) => {
    const c = campaigns.get(r.campaign_id)!
    const unsub = r.token ? `${site}/api/unsubscribe?t=${r.token}` : ''
    const content = campaignContent(c, r.name, unsub)
    return {
      to: r.email,
      subject: personalise(c.subject, r.name),
      html: emailHtml(s, site, content),
      text: emailText(content, site) + (unsub ? `\n\nUnsubscribe: ${unsub}` : ''),
      headers: unsub ? { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined,
    }
  })
  const r = emails.length ? await sendEmails(env, s, 'campaign', emails) : { ok: true, error: '' }
  const statements: D1PreparedStatement[] = []
  if (skipped.length) {
    statements.push(
      env.DB.prepare(`UPDATE email_campaign_recipients SET status = 'skipped' WHERE id IN (${skipped.map(() => '?').join(',')})`).bind(...skipped.map((x) => x.id)),
    )
  }
  if (r.ok && toSend.length) {
    statements.push(
      env.DB.prepare(`UPDATE email_campaign_recipients SET status = 'sent', sent_at = datetime('now') WHERE id IN (${toSend.map(() => '?').join(',')})`).bind(
        ...toSend.map((x) => x.id),
      ),
    )
    for (const [id] of campaigns) {
      const n = toSend.filter((x) => x.campaign_id === id).length
      statements.push(env.DB.prepare('UPDATE email_campaigns SET sent = sent + ? WHERE id = ?').bind(n, id))
    }
  }
  if (statements.length) await env.DB.batch(statements)
  await finishDone(env.DB)
  // On failure the emails stay queued and are tried again on the next run
  return { sent: r.ok ? toSend.length : 0, error: r.ok ? '' : r.error }
}

async function finishDone(db: D1Database) {
  await db
    .prepare(
      `UPDATE email_campaigns SET status = 'done'
       WHERE status = 'sending' AND NOT EXISTS (SELECT 1 FROM email_campaign_recipients r WHERE r.campaign_id = email_campaigns.id AND r.status = 'queued')`,
    )
    .run()
}

/** One-click unsubscribe from the link in festive emails. */
export async function unsubscribeByToken(db: D1Database, token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return false
  // Every record with the same email address stops getting festive emails
  const r = await db
    .prepare(
      `UPDATE clients SET email_opt_out = 1, updated_at = datetime('now')
       WHERE email != '' AND lower(email) = (SELECT lower(email) FROM clients WHERE unsub_token = ?)`,
    )
    .bind(token)
    .run()
  return !!r.meta.changes
}
