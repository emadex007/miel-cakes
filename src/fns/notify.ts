import { createServerFn } from '@tanstack/react-start'
import type { ImportedClient } from '~/lib/export'
import { requireAdmin, requireOwner } from '~/server/auth'
import { campaignAllowance, campaignContent, personalise, sendCampaignBatch, type Campaign } from '~/server/campaigns'
import { db, workerEnv } from '~/server/db'
import { emailHtml, emailsSentToday, emailText, isRealEmail, notifySettings, publicOrigin, pushToTeam, sendEmails, vapidKeys } from '~/server/notify'
import { siteOrigin } from '~/server/util'

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : 0
}
const digits = (s: string) => (s || '').replace(/\D/g, '')
const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

// =====================================================================
// Overview for the Alerts & emails page
// =====================================================================
export const getNotifyOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireAdmin()
  const env = workerEnv()
  const [keys, devices, s, sentToday] = await Promise.all([
    vapidKeys(db()),
    db()
      .prepare('SELECT id, admin_id, label, created_at FROM push_subscriptions ORDER BY id DESC')
      .all<{ id: number; admin_id: number; label: string; created_at: string }>()
      .then((r) => r.results),
    notifySettings(db()),
    emailsSentToday(db()),
  ])
  const owner = admin.role === 'owner'
  const [campaigns, audience, allowance] = owner
    ? await Promise.all([
        db().prepare('SELECT * FROM email_campaigns ORDER BY id DESC LIMIT 50').all<Campaign>().then((r) => r.results),
        audienceCount(),
        campaignAllowance(env),
      ])
    : [[] as Campaign[], 0, 0]
  return {
    owner,
    me: admin.id,
    publicKey: keys.publicKey,
    devices,
    email: {
      connected: !!env.RESEND_API_KEY,
      sentToday,
      dailyLimit: s.dailyLimit,
      alertEmail: s.alertEmail,
      from: s.from,
      alertsOn: s.alertsOn,
      customerOn: s.customerOn,
      pushOn: s.pushOn,
      campaignPerDay: s.campaignPerDay,
      allowanceToday: allowance,
    },
    campaigns,
    audience,
  }
})

// =====================================================================
// Phone alerts
// =====================================================================
export const savePushDevice = createServerFn({ method: 'POST' })
  .validator((d: { endpoint: string; p256dh: string; auth: string; label: string }) => d)
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const endpoint = str(data.endpoint, 1000)
    if (!/^https:\/\//.test(endpoint)) throw new Error('This browser didn’t give a valid notification address.')
    const p256dh = str(data.p256dh, 200)
    const auth = str(data.auth, 100)
    if (!p256dh || !auth) throw new Error('This browser didn’t give its notification keys.')
    await db()
      .prepare(
        `INSERT INTO push_subscriptions (admin_id, endpoint, p256dh, auth, label) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET admin_id = excluded.admin_id, p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label`,
      )
      .bind(admin.id, endpoint, p256dh, auth, `${admin.name.split(' ')[0]} · ${str(data.label, 60) || 'Phone'}`)
      .run()
    const row = await db().prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).first<{ id: number }>()
    // Say hello so they know it works
    if (row) await pushToTeam(workerEnv(), { title: 'Alerts are on', body: 'You’ll get a notification like this for new orders, bookings and chats.', url: '/admin' }, [row.id])
    return { ok: true }
  })

export const removePushDevice = createServerFn({ method: 'POST' })
  .validator((d: { id?: number; endpoint?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin()
    if (data.endpoint) await db().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(str(data.endpoint, 1000)).run()
    else await db().prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(int(data.id)).run()
    return { ok: true }
  })

export const testPush = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
  const r = await pushToTeam(workerEnv(), { title: 'Test alert', body: 'If you can read this, phone alerts are working.', url: '/admin/notifications' })
  if (!r.sent && !r.failed) throw new Error('No phones are switched on yet.')
  return r
})

// =====================================================================
// Email
// =====================================================================
export const sendTestEmail = createServerFn({ method: 'POST' }).handler(async () => {
  await requireAdmin()
  const env = workerEnv()
  if (!env.RESEND_API_KEY) throw new Error('Email isn’t connected yet. Follow the setup steps on this page first.')
  const s = await notifySettings(db())
  if (!isRealEmail(s.alertEmail)) throw new Error('Add the email for alerts under Settings → Alerts & emails first.')
  const site = publicOrigin(env, siteOrigin())
  const content = { heading: 'Email is working', body: `This is a test from your website. Order alerts will arrive at ${s.alertEmail}, and customers will get emails from ${s.from}.` }
  const r = await sendEmails(env, s, 'alert', [{ to: s.alertEmail, subject: `Test email from ${s.business}`, html: emailHtml(s, site, content), text: emailText(content, site) }])
  if (!r.ok) throw new Error(`Resend said: ${r.error}`)
  return { to: s.alertEmail }
})

// =====================================================================
// Festive emails (owner only)
// =====================================================================
/** Customers with a usable email who haven't unsubscribed, one per address. */
async function audienceCount() {
  const row = await db()
    .prepare(
      `SELECT COUNT(DISTINCT lower(email)) AS n FROM clients
       WHERE email LIKE '%_@_%._%' AND email NOT LIKE '%@guest.local' AND email_opt_out = 0
       AND lower(email) NOT IN (SELECT lower(email) FROM clients WHERE email_opt_out = 1 AND email != '')`,
    )
    .first<{ n: number }>()
  return row?.n ?? 0
}

export interface CampaignInput {
  subject: string
  heading: string
  body: string
  image_url: string
  button_label: string
  button_url: string
}

function cleanCampaign(d: CampaignInput) {
  const c = {
    subject: str(d.subject, 150),
    heading: str(d.heading, 150),
    body: str(d.body, 5000),
    image_url: str(d.image_url, 1000),
    button_label: str(d.button_label, 40),
    button_url: str(d.button_url, 500),
  }
  if (!c.subject) throw new Error('Add a subject line.')
  if (!c.body) throw new Error('Write your message.')
  if (!c.heading) c.heading = c.subject
  if (c.button_url && !/^(https?:\/\/|\/)/.test(c.button_url)) throw new Error('The button link should start with https:// or / (e.g. /menu).')
  if (c.button_label && !c.button_url) throw new Error('Add the page the button opens, e.g. /menu.')
  return c
}

export const previewCampaign = createServerFn({ method: 'POST' })
  .validator((d: CampaignInput) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const c = cleanCampaign(data)
    const s = await notifySettings(db())
    const site = publicOrigin(workerEnv(), siteOrigin())
    return { html: emailHtml(s, site, campaignContent(c, 'Ada', `${site}/api/unsubscribe?t=preview`)), subject: personalise(c.subject, 'Ada') }
  })

export const sendCampaignTest = createServerFn({ method: 'POST' })
  .validator((d: CampaignInput) => d)
  .handler(async ({ data }) => {
    const admin = await requireOwner()
    const env = workerEnv()
    if (!env.RESEND_API_KEY) throw new Error('Email isn’t connected yet. Follow the setup steps on this page first.')
    const c = cleanCampaign(data)
    const s = await notifySettings(db())
    const to = isRealEmail(s.alertEmail) ? s.alertEmail : admin.email
    const site = publicOrigin(env, siteOrigin())
    const content = campaignContent(c, admin.name, '')
    const r = await sendEmails(env, s, 'alert', [{ to, subject: `[Test] ${personalise(c.subject, admin.name)}`, html: emailHtml(s, site, content), text: emailText(content, site) }])
    if (!r.ok) throw new Error(`Resend said: ${r.error}`)
    return { to }
  })

export const startCampaign = createServerFn({ method: 'POST' })
  .validator((d: CampaignInput) => d)
  .handler(async ({ data }) => {
    const admin = await requireOwner()
    const env = workerEnv()
    if (!env.RESEND_API_KEY) throw new Error('Email isn’t connected yet. Follow the setup steps on this page first.')
    const c = cleanCampaign(data)
    // Give everyone an unsubscribe token
    await db().prepare(`UPDATE clients SET unsub_token = lower(hex(randomblob(16))) WHERE unsub_token = ''`).run()
    const r = await db()
      .prepare('INSERT INTO email_campaigns (subject, heading, body, image_url, button_label, button_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(c.subject, c.heading, c.body, c.image_url, c.button_label, c.button_url, admin.name)
      .run()
    const id = Number(r.meta.last_row_id)
    // One email per address, using the earliest record for that address
    await db()
      .prepare(
        `INSERT INTO email_campaign_recipients (campaign_id, client_id, name, email)
         SELECT ?, MIN(id), name, lower(email) FROM clients
         WHERE email LIKE '%_@_%._%' AND email NOT LIKE '%@guest.local' AND email_opt_out = 0
         AND lower(email) NOT IN (SELECT lower(email) FROM clients WHERE email_opt_out = 1 AND email != '')
         GROUP BY lower(email)`,
      )
      .bind(id)
      .run()
    const count = await db().prepare('SELECT COUNT(*) AS n FROM email_campaign_recipients WHERE campaign_id = ?').bind(id).first<{ n: number }>()
    const total = count?.n ?? 0
    if (!total) {
      await db().prepare('DELETE FROM email_campaigns WHERE id = ?').bind(id).run()
      throw new Error('None of your customers has an email address yet. Add emails on the Customers page or upload a list.')
    }
    await db().prepare('UPDATE email_campaigns SET total = ? WHERE id = ?').bind(total, id).run()
    // Today's batch goes out now; the rest each morning
    const first = await sendCampaignBatch(env, siteOrigin())
    return { total, sentNow: first.sent, error: first.error }
  })

export const stopCampaign = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    await db().prepare("UPDATE email_campaigns SET status = 'stopped' WHERE id = ? AND status = 'sending'").bind(id).run()
    return { ok: true }
  })

export const resumeCampaign = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    await db().prepare("UPDATE email_campaigns SET status = 'sending' WHERE id = ? AND status = 'stopped'").bind(id).run()
    const r = await sendCampaignBatch(workerEnv(), siteOrigin())
    return r
  })

// =====================================================================
// Customer list upload (CSV)
// =====================================================================
export const importClients = createServerFn({ method: 'POST' })
  .validator((d: { rows: ImportedClient[] }) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const rows = (Array.isArray(data.rows) ? data.rows : []).slice(0, 500)
    const { results: existing } = await db().prepare('SELECT id, phone, email FROM clients').all<{ id: number; phone: string; email: string }>()
    const byPhone = new Map(existing.filter((c) => digits(c.phone).length >= 7).map((c) => [digits(c.phone).slice(-10), c]))
    const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]))
    let added = 0
    let updated = 0
    let skipped = 0
    const statements: D1PreparedStatement[] = []
    for (const raw of rows) {
      const name = str(raw.name, 100)
      const phone = str(raw.phone, 40)
      const email = str(raw.email, 150).toLowerCase()
      const goodEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
      if (!name && !digits(phone) && !goodEmail) {
        skipped++
        continue
      }
      const match = (digits(phone).length >= 7 && byPhone.get(digits(phone).slice(-10))) || (goodEmail && byEmail.get(goodEmail))
      if (match && match.id < 0) {
        skipped++ // a repeat of a row earlier in this same file
        continue
      }
      if (match) {
        // Already a customer: only fill in an email they didn't have
        if (goodEmail && !match.email) {
          statements.push(db().prepare("UPDATE clients SET email = ?, updated_at = datetime('now') WHERE id = ?").bind(goodEmail, match.id))
          match.email = goodEmail
          byEmail.set(goodEmail, match)
          updated++
        } else skipped++
        continue
      }
      statements.push(
        db()
          .prepare("INSERT INTO clients (name, phone, email, address, area, birthday, notes, source, unsub_token) VALUES (?, ?, ?, ?, ?, ?, ?, 'import', ?)")
          .bind(name || goodEmail || phone, phone, goodEmail, str(raw.address, 300), str(raw.area, 80), str(raw.birthday, 40), str(raw.notes, 2000), randomHex(16)),
      )
      const placeholder = { id: -1, phone, email: goodEmail }
      if (digits(phone).length >= 7) byPhone.set(digits(phone).slice(-10), placeholder)
      if (goodEmail) byEmail.set(goodEmail, placeholder)
      added++
    }
    for (let i = 0; i < statements.length; i += 50) await db().batch(statements.slice(i, i + 50))
    return { added, updated, skipped }
  })
