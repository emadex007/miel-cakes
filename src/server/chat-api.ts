// Live chat endpoints on the Worker: /api/chat/...
// Plain fetch endpoints (like uploads), so they don't depend on the framework's
// server-function registry. Visitors are identified by a secret token kept in
// their browser; the dashboard uses the admin session cookie.
import type { ChatConversation, ChatMessage } from '~/lib/chat-types'
import { chatMessageWhileAway, chatStarted } from './happenings'

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
const CHAT_IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_CHAT_IMAGE = 10 * 1024 * 1024
const MSG_COLS = 'id, sender, admin_name, body, image_key, created_at'
const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

export async function handleChatApi(request: Request, env: Env, url: URL, auth: Auth): Promise<Response> {
  const path = url.pathname.slice('/api/chat/'.length)
  const db = env.DB

  // Pictures: uploads are multipart forms, and images are fetched by <img> tags
  if (path === 'upload' || path === 'admin/upload' || path === 'image' || path === 'admin/image') {
    return handleChatImages(request, env, url, path, auth)
  }

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
  const addMessage = (conversationId: number, sender: 'visitor' | 'admin', text: string, adminName = '') =>
    addChatMessage(db, conversationId, sender, text, adminName)
  const customer = () => chatCustomer(db, auth)

  // =================== visitors ===================
  if (path === 'bot') return json(await botAnswers(db))

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
    const convId = Number(r.meta.last_row_id)
    await addMessage(convId, 'visitor', message)
    await chatStarted(env, url.origin, convId, name, message, await isOnline())
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
      .prepare(`SELECT ${MSG_COLS} FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id LIMIT 200`)
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
    if (!(await isOnline())) await chatMessageWhileAway(env, url.origin, conv.id, conv.name, text)
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
        .prepare(`SELECT ${MSG_COLS} FROM chat_messages WHERE conversation_id = ? AND id > ? ORDER BY id LIMIT 500`)
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
      const pics = await db.prepare("SELECT image_key FROM chat_messages WHERE conversation_id = ? AND image_key != ''").bind(id).all<{ image_key: string }>()
      for (const p of pics.results) await env.MEDIA.delete(p.image_key).catch(() => null)
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


// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
async function addChatMessage(db: D1Database, conversationId: number, sender: 'visitor' | 'admin', text: string, adminName = '', imageKey = '') {
  const preview = text || (imageKey ? 'Sent a picture' : '')
  await db.batch([
    db
      .prepare('INSERT INTO chat_messages (conversation_id, sender, admin_name, body, image_key) VALUES (?, ?, ?, ?, ?)')
      .bind(conversationId, sender, adminName, text, imageKey),
    db
      .prepare(
        `UPDATE chat_conversations SET last_message = ?, last_from = ?, last_message_at = datetime('now'), status = 'open',
         unread_admin = unread_admin + ?, unread_visitor = unread_visitor + ? WHERE id = ?`,
      )
      .bind(preview.slice(0, 140), sender, sender === 'visitor' ? 1 : 0, sender === 'admin' ? 1 : 0, conversationId),
  ])
}

async function chatCustomer(db: D1Database, auth: Auth) {
  const id = await auth.customerId()
  if (!id) return null
  const c = await db
    .prepare('SELECT id, name, phone, email, is_guest FROM customers WHERE id = ?')
    .bind(id)
    .first<{ id: number; name: string; phone: string; email: string; is_guest: number }>()
  if (!c || (c.is_guest && !c.name)) return null // a guest who hasn't ordered yet: ask for their details as usual
  return { ...c, email: c.is_guest ? '' : c.email }
}

/**
 * Pictures in the chat. They are stored privately (not under /media) and only
 * shown to the visitor who is in that chat, or to the dashboard.
 */
async function handleChatImages(request: Request, env: Env, url: URL, path: string, auth: Auth): Promise<Response> {
  const db = env.DB

  if (request.method === 'GET') {
    const key = str(url.searchParams.get('k'), 120)
    if (!/^chat\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return fail('Not found.', 404)
    const row = await db
      .prepare('SELECT c.token FROM chat_messages m JOIN chat_conversations c ON c.id = m.conversation_id WHERE m.image_key = ?')
      .bind(key)
      .first<{ token: string }>()
    if (!row) return fail('Not found.', 404)
    if (path === 'admin/image') {
      if (!(await auth.admin())) return fail('Please sign in again.', 401)
    } else if (str(url.searchParams.get('t'), 80) !== row.token) {
      return fail('Not found.', 404)
    }
    const obj = await env.MEDIA.get(key)
    if (!obj) return fail('Not found.', 404)
    return new Response(obj.body, {
      headers: { 'content-type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'cache-control': 'private, max-age=86400' },
    })
  }

  if (request.method !== 'POST') return fail('Method not allowed.', 405)
  // Only from our own pages
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return fail('Bad request.')
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!form || !file || typeof file === 'string') return fail('Choose a picture to send.')
  const ext = CHAT_IMAGE_TYPES[file.type]
  if (!ext) return fail('Send a photo (JPG, PNG or WebP).')
  if (file.size > MAX_CHAT_IMAGE) return fail('That picture is too big. Please send one under 10 MB.')
  const caption = str(form.get('caption'), MAX_LEN)

  let conversationId = 0
  let adminName = ''
  let sender: 'visitor' | 'admin' = 'visitor'
  let newToken = ''
  if (path === 'admin/upload') {
    const admin = await auth.admin()
    if (!admin) return fail('Please sign in to the admin dashboard again.', 401)
    const conv = await db.prepare('SELECT id FROM chat_conversations WHERE id = ?').bind(int(form.get('id'))).first<{ id: number }>()
    if (!conv) return fail('This conversation no longer exists.', 404)
    conversationId = conv.id
    sender = 'admin'
    adminName = admin.name.split(' ')[0]
    await db.prepare(`UPDATE chat_presence SET seen_at = datetime('now') WHERE id = 1`).run()
  } else {
    if (form.get('website')) return json({ ok: true, token: '' }) // honeypot
    const t = str(form.get('token'), 80)
    const conv = t.length >= 20 ? await db.prepare('SELECT id FROM chat_conversations WHERE token = ?').bind(t).first<{ id: number }>() : null
    if (conv) {
      const recent = await db
        .prepare(`SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ? AND sender = 'visitor' AND image_key != '' AND created_at > datetime('now', '-10 minutes')`)
        .bind(conv.id)
        .first<{ n: number }>()
      if ((recent?.n ?? 0) >= 10) return fail('You’ve sent a lot of pictures. Please wait a few minutes.', 429)
      conversationId = conv.id
    } else {
      // First thing they send is a picture: start the chat
      const me = await chatCustomer(db, auth)
      newToken = randomHex(24)
      const r = await db
        .prepare('INSERT INTO chat_conversations (token, customer_id, name, phone, email, page) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newToken, me?.id ?? null, me?.name ?? '', me?.phone ?? '', me?.email ?? '', str(form.get('page'), 200))
        .run()
      conversationId = Number(r.meta.last_row_id)
    }
  }

  const key = `chat/${crypto.randomUUID()}.${ext}`
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  await addChatMessage(db, conversationId, sender, caption, adminName, key)
  if (newToken) await chatStarted(env, url.origin, conversationId, '', caption || 'Sent a picture', false)
  return json({ ok: true, token: newToken })
}

/** Quick answers for the chat helper: built from the menu, delivery areas and settings. */
async function botAnswers(db: D1Database) {
  const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
  const [settingsRows, cats, zones] = await Promise.all([
    db
      .prepare("SELECT key, value FROM settings WHERE key IN ('opening_hours','address','business_name','booking_min_days','chat_bot_enabled','chat_bot_intro')")
      .all<{ key: string; value: string }>(),
    db
      .prepare(
        `SELECT c.name, p.options_json FROM products p JOIN categories c ON c.id = p.category_id
         WHERE c.is_active = 1 AND p.is_available = 1 ORDER BY c.sort, c.name`,
      )
      .all<{ name: string; options_json: string }>(),
    db.prepare('SELECT name, fee FROM delivery_zones WHERE is_active = 1 ORDER BY sort, name').all<{ name: string; fee: number }>(),
  ])
  const s = Object.fromEntries(settingsRows.results.map((r) => [r.key, r.value]))
  if (s.chat_bot_enabled === '') return { enabled: false, intro: '', topics: [] }

  const from = new Map<string, number>()
  for (const row of cats.results) {
    let prices: number[] = []
    try {
      prices = (JSON.parse(row.options_json || '[]') as { price: number }[]).map((o) => Number(o.price)).filter((n) => n > 0)
    } catch {
      prices = []
    }
    if (!prices.length) continue
    const min = Math.min(...prices)
    from.set(row.name, Math.min(min, from.get(row.name) ?? Infinity))
  }
  const hours = (s.opening_hours ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  const address = (s.address ?? '').trim()

  const topics = [
    {
      id: 'prices',
      label: 'Prices',
      answer: from.size
        ? `Here are our starting prices:\n${[...from].map(([n, p]) => `${n}: from ${naira(p)}`).join('\n')}\n\nThe menu has every size and price.`
        : 'You can see every item and price on our menu.',
      link: { href: '/menu', label: 'See the menu' },
    },
    {
      id: 'delivery',
      label: 'Delivery fees',
      answer: `${zones.results.length ? `We deliver across Abuja:\n${zones.results.map((z) => `${z.name}: ${naira(z.fee)}`).join('\n')}` : 'We deliver across Abuja. The fee depends on your area.'}\n\nYou can also send your own rider, or pick up for free${address ? ` from ${address.replace(/\n/g, ', ')}` : ''}.`,
    },
    {
      id: 'order',
      label: 'How to order',
      answer:
        'Choose what you like on the menu, add it to your cart and check out. No account needed. Pick your date and how you want to get it, then pay by card or bank transfer.\n\nWant a custom design? Send us a picture here and tell us the size and date.',
      link: { href: '/menu', label: 'Start an order' },
    },
    {
      id: 'events',
      label: 'Events and big orders',
      answer: `For weddings, birthdays, office and church events, send us your event details and we reply with a quote and the price.${s.booking_min_days ? ` Please book at least ${s.booking_min_days} days ahead.` : ''}`,
      link: { href: '/events#book', label: 'Book an event' },
    },
    {
      id: 'track',
      label: 'Track my order',
      answer: 'Enter your order number (like MC-1023) and your phone number to see where your order is.',
      link: { href: '/track', label: 'Track an order' },
    },
    {
      id: 'hours',
      label: 'Opening hours',
      answer: `${hours.length ? hours.join('\n') : 'Message us and we’ll tell you when we’re open.'}${address ? `\n\nWe’re at ${address.replace(/\n/g, ', ')}.` : ''}`,
    },
  ]
  return { enabled: true, intro: s.chat_bot_intro || 'Tap a question for a quick answer, or type your message to talk to us.', topics }
}
