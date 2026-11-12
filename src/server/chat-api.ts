// Live chat endpoints on the Worker: /api/chat/...
// Plain fetch endpoints (like uploads), so they don't depend on the framework's
// server-function registry. Visitors are identified by a secret token kept in
// their browser; the dashboard uses the admin session cookie.
import type { ChatConversation, ChatMessage } from '~/lib/chat-types'

type Env = Cloudflare.Env
type Admin = { id: number; name: string; role: string }
interface Auth {
  admin: () => Promise<Admin | null>
  customerId: () => Promise<number | null>
}

const ONLINE_SECONDS = 120
const MAX_LEN = 1000

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
const fail = (error: string, status = 400) => json({ error }, status)
const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : 0
}
const digits = (s: string) => (s || '').replace(/\D/g, '')
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

export async function handleChatApi(request: Request, env: Env, url: URL, auth: Auth): Promise<Response> {
  const path = url.pathname.slice('/api/chat/'.length)
  const db = env.DB

  // Writes must be same-site JSON (blocks forms posted from other websites)
  let body: Record<string, unknown> = {}
  if (request.method === 'POST') {
    if (!(request.headers.get('content-type') ?? '').includes('application/json')) return fail('Bad request.')
    body = ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {}
  } else if (request.method !== 'GET') {
    return fail('Method not allowed.', 405)
  }

  const isOnline = async () => {
    const row = await db
      .prepare(`SELECT (seen_at != '' AND seen_at > datetime('now', ?)) AS online FROM chat_presence WHERE id = 1`)
      .bind(`-${ONLINE_SECONDS} seconds`)
      .first<{ online: number }>()
    return !!row?.online
  }
  const markAdminSeen = () => db.prepare(`UPDATE chat_presence SET seen_at = datetime('now') WHERE id = 1`).run()
  const byToken = (token: unknown) => {
    const t = str(token, 80)
    if (t.length < 20) return Promise.resolve(null)
    return db.prepare('SELECT * FROM chat_conversations WHERE token = ?').bind(t).first<ChatConversation & { token: string }>()
  }
  const addMessage = async (conversationId: number, sender: 'visitor' | 'admin', text: string, adminName = '') => {
    await db.batch([
      db.prepare('INSERT INTO chat_messages (conversation_id, sender, admin_name, body) VALUES (?, ?, ?, ?)').bind(conversationId, sender, adminName, text),
      db
        .prepare(
          `UPDATE chat_conversations SET last_message = ?, last_from = ?, last_message_at = datetime('now'), status = 'open',
           unread_admin = unread_admin + ?, unread_visitor = unread_visitor + ? WHERE id = ?`,
        )
        .bind(text.slice(0, 140), sender, sender === 'visitor' ? 1 : 0, sender === 'admin' ? 1 : 0, conversationId),
    ])
  }
  const customer = async () => {
    const id = await auth.customerId()
    if (!id) return null
    return db.prepare('SELECT id, name, phone, email FROM customers WHERE id = ?').bind(id).first<{ id: number; name: string; phone: string; email: string }>()
  }

  // =================== visitors ===================
  if (path === 'hello') {
    const me = await customer()
    return json({ online: await isOnline(), me: me ? { name: me.name, phone: me.phone, email: me.email } : null })
  }

  if (path === 'start' && request.method === 'POST') {
    if (body.website) return json({ token: '', hasContact: false }) // honeypot: bots fill every box
    const me = await customer()
    const name = str(body.name, 80) || me?.name || ''
    const phone = str(body.phone, 40) || me?.phone || ''
    const email = str(body.email, 150).toLowerCase() || me?.email || ''
    const message = str(body.message, MAX_LEN)
    if (!message) return fail('Type your message.')
    if (phone && digits(phone).length < 7) return fail('That phone number looks too short.')
    if (email && !isEmail(email)) return fail('That email address doesn’t look right.')
    const token = randomHex(24)
    const r = await db
      .prepare('INSERT INTO chat_conversations (token, customer_id, name, phone, email, page) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(token, me?.id ?? null, name, phone, email, str(body.page, 200))
      .run()
    await addMessage(Number(r.meta.last_row_id), 'visitor', message)
    return json({ token, hasContact: !!(phone || email) })
  }

  if (path === 'contact' && request.method === 'POST') {
    const conv = await byToken(body.token)
    if (!conv) return fail('This chat has ended. Please start a new one.', 404)
    const name = str(body.name, 80)
    const phone = str(body.phone, 40)
    const email = str(body.email, 150).toLowerCase()
    if (!phone && !email) return fail('Please add a phone number or email.')
    if (phone && digits(phone).length < 7) return fail('That phone number looks too short.')
    if (email && !isEmail(email)) return fail('That email address doesn’t look right.')
    await db
      .prepare("UPDATE chat_conversations SET name = CASE WHEN ? != '' THEN ? ELSE name END, phone = ?, email = ? WHERE id = ?")
      .bind(name, name, phone, email, conv.id)
      .run()
    return json({ ok: true })
  }

  if (path === 'poll' && request.method === 'POST') {
    const conv = await byToken(body.token)
    if (!conv) return json({ gone: true })
    const open = !!body.open
    const { results } = await db
      .prepare('SELECT id, sender, admin_name, body, created_at FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id LIMIT 200')
      .bind(conv.id, int(body.after))
      .all<ChatMessage>()
    if (open && conv.unread_visitor) await db.prepare('UPDATE chat_conversations SET unread_visitor = 0 WHERE id = ?').bind(conv.id).run()
    return json({
      gone: false,
      messages: results,
      unread: open ? 0 : conv.unread_visitor,
      online: await isOnline(),
      name: conv.name,
      hasContact: !!(conv.phone || conv.email),
    })
  }

  if (path === 'send' && request.method === 'POST') {
    const conv = await byToken(body.token)
    if (!conv) return fail('This chat has ended. Please start a new one.', 404)
    const text = str(body.body, MAX_LEN)
    if (!text) return fail('Type your message.')
    const recent = await db
      .prepare(`SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ? AND sender = 'visitor' AND created_at > datetime('now', '-10 minutes')`)
      .bind(conv.id)
      .first<{ n: number }>()
    if ((recent?.n ?? 0) >= 30) return fail('You’re sending messages very quickly. Please wait a moment.', 429)
    await addMessage(conv.id, 'visitor', text)
    return json({ ok: true })
  }

  // =================== dashboard ===================
  if (path.startsWith('admin/')) {
    const admin = await auth.admin()
    if (!admin) return fail('Please sign in to the admin dashboard again.', 401)
    const id = int(body.id)

    if (path === 'admin/unread') {
      await markAdminSeen()
      const row = await db.prepare("SELECT COALESCE(SUM(unread_admin), 0) AS n FROM chat_conversations WHERE status = 'open'").first<{ n: number }>()
      return json({ unread: row?.n ?? 0 })
    }

    if (path === 'admin/list') {
      await markAdminSeen()
      const { results } = await db
        .prepare(
          `SELECT id, customer_id, name, phone, email, page, status, unread_admin, unread_visitor, last_message, last_from, last_message_at, created_at
           FROM chat_conversations ORDER BY last_message_at DESC LIMIT 300`,
        )
        .all<ChatConversation>()
      const biz = await db.prepare("SELECT value FROM settings WHERE key = 'business_name'").first<{ value: string }>()
      return json({ conversations: results, business: biz?.value || 'Miel Cakes' })
    }

    if (request.method !== 'POST') return fail('Not found.', 404)

    if (path === 'admin/thread') {
      const { results } = await db
        .prepare('SELECT id, sender, admin_name, body, created_at FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id LIMIT 500')
        .bind(id, int(body.after))
        .all<ChatMessage>()
      await db.prepare('UPDATE chat_conversations SET unread_admin = 0 WHERE id = ? AND unread_admin > 0').bind(id).run()
      return json(results)
    }

    if (path === 'admin/reply') {
      const text = str(body.body, 2000)
      if (!text) return fail('Type your reply.')
      const conv = await db.prepare('SELECT id FROM chat_conversations WHERE id = ?').bind(id).first()
      if (!conv) return fail('This conversation no longer exists.', 404)
      await addMessage(id, 'admin', text, admin.name.split(' ')[0])
      await markAdminSeen()
      return json({ ok: true })
    }

    if (path === 'admin/status') {
      const status = body.status === 'closed' ? 'closed' : 'open'
      await db
        .prepare("UPDATE chat_conversations SET status = ?, unread_admin = CASE WHEN ? = 'closed' THEN 0 ELSE unread_admin END WHERE id = ?")
        .bind(status, status, id)
        .run()
      return json({ ok: true })
    }

    if (path === 'admin/delete') {
      await db.batch([
        db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').bind(id),
        db.prepare('DELETE FROM chat_conversations WHERE id = ?').bind(id),
      ])
      return json({ ok: true })
    }

    if (path === 'admin/save-contact') {
      const c = await db.prepare('SELECT name, phone, email FROM chat_conversations WHERE id = ?').bind(id).first<{ name: string; phone: string; email: string }>()
      if (!c) return fail('This conversation no longer exists.', 404)
      if (!c.phone && !c.email) return fail('They didn’t leave a phone number or email to save.')
      const known = await db
        .prepare("SELECT id FROM clients WHERE (phone != '' AND phone = ?) OR (email != '' AND email = ?)")
        .bind(c.phone, c.email)
        .first()
      if (known) return json({ already: true })
      await db
        .prepare("INSERT INTO clients (name, phone, email, source, notes) VALUES (?, ?, ?, 'chat', 'From website live chat')")
        .bind(c.name || 'Chat visitor', c.phone, c.email)
        .run()
      return json({ already: false })
    }
  }

  return fail('Not found.', 404)
}
