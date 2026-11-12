import handler from '@tanstack/react-start/server-entry'
import { markBookingPaidByReference } from '~/server/bookings'
import { adminAlerts } from '~/server/admin-alerts'
import { handleChatApi } from '~/server/chat-api'
import { markOrderPaidByReference, paystackSignatureValid, paystackVerify } from '~/server/paystack'

// Worker entry (see `main` in wrangler.toml). Handles media and uploads directly,
// then hands every other request to TanStack Start.

type AppEnv = Cloudflare.Env

const ADMIN_COOKIE = 'mc_admin'
const CUSTOMER_COOKIE = 'mc_customer'
const MAX_IMAGE = 15 * 1024 * 1024 // 15 MB
const MAX_VIDEO = 90 * 1024 * 1024 // 90 MB (Workers free plan accepts up to 100 MB per request)
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}
const CV_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const MAX_CV = 5 * 1024 * 1024 // 5 MB
const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export default {
  async fetch(request: Request, env: AppEnv) {
    const url = new URL(request.url)

    // One address for everyone: www.mielcakes.com and the old workers.dev link
    // both send visitors to the main domain (set CANONICAL_HOST in wrangler.toml).
    const canonical = (env as { CANONICAL_HOST?: string }).CANONICAL_HOST
    if (canonical && url.hostname !== canonical && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      if (url.hostname === `www.${canonical}` || url.hostname.endsWith('.workers.dev')) {
        url.hostname = canonical
        url.protocol = 'https:'
        url.port = ''
        // 301 for page visits; 308 keeps POST requests (forms, webhooks) intact
        return Response.redirect(url.toString(), request.method === 'GET' || request.method === 'HEAD' ? 301 : 308)
      }
    }

    // Public media from R2:  /media/<key>  (supports Range requests so videos play and seek on iPhones)
    if (url.pathname.startsWith('/media/') && (request.method === 'GET' || request.method === 'HEAD')) {
      const key = decodeURIComponent(url.pathname.slice('/media/'.length))
      if (!key.startsWith('uploads/')) return new Response('Not found', { status: 404 })
      const rangeHeader = request.headers.get('range')
      const m = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/)
      let range: R2Range | undefined
      if (m && (m[1] || m[2])) {
        range = m[1]
          ? { offset: Number(m[1]), ...(m[2] ? { length: Number(m[2]) - Number(m[1]) + 1 } : {}) }
          : { suffix: Number(m[2]) }
      }
      const obj = await env.MEDIA.get(key, range ? { range } : undefined)
      if (!obj) return new Response('Not found', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('etag', obj.httpEtag)
      headers.set('accept-ranges', 'bytes')
      headers.set('cache-control', 'public, max-age=31536000, immutable')
      headers.set('x-content-type-options', 'nosniff')
      if (range && 'body' in obj) {
        const r = obj.range as { offset?: number; length?: number; suffix?: number } | undefined
        const start = r?.suffix !== undefined ? obj.size - r.suffix : (r?.offset ?? 0)
        const len = r?.suffix !== undefined ? r.suffix : (r?.length ?? obj.size - start)
        headers.set('content-range', `bytes ${start}-${start + len - 1}/${obj.size}`)
        headers.set('content-length', String(len))
        return new Response(obj.body, { status: 206, headers })
      }
      headers.set('content-length', String(obj.size))
      return new Response('body' in obj ? obj.body : null, { headers })
    }

    // Admin upload:  POST /api/upload  (multipart field "file")
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return json({ error: 'Please sign in to the admin dashboard again.' }, 401)
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'Choose a file to upload.' }, 400)
      const isVideo = !!VIDEO_TYPES[file.type]
      const ext = IMAGE_TYPES[file.type] ?? VIDEO_TYPES[file.type]
      if (!ext) return json({ error: 'Upload a photo (JPG, PNG, WebP) or a video (MP4, WebM, MOV).' }, 400)
      if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
        return json({ error: isVideo ? 'Videos must be 90 MB or smaller.' : 'Photos must be 15 MB or smaller.' }, 400)
      }
      const key = `uploads/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.prepare('INSERT INTO media (key, filename, content_type, size) VALUES (?, ?, ?, ?)')
        .bind(key, file.name.slice(0, 200), file.type, file.size)
        .run()
      return json({ key, url: `/media/${key}` })
    }

    // Search engines
    if (url.pathname === '/robots.txt') {
      return new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /receipt/\nSitemap: ${url.origin}/sitemap.xml\n`, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      })
    }
    if (url.pathname === '/sitemap.xml') return sitemap(url.origin, env)

    // Paystack webhook: confirms card payments even if the customer closes the page
    if (url.pathname === '/api/webhooks/paystack' && request.method === 'POST') {
      return paystackWebhook(request, env)
    }

    // Proof of payment (bank transfer):  POST /api/orders/proof?code=MC-1042  (multipart "file"). Order owner only.
    if (url.pathname === '/api/orders/proof' && request.method === 'POST') {
      const customerId = await customerIdFromCookie(request, env)
      if (!customerId) return json({ error: 'Please sign in again.' }, 401)
      const code = (url.searchParams.get('code') ?? '').slice(0, 20)
      const order = await env.DB.prepare('SELECT id, status, payment_status, proof_key FROM orders WHERE code = ? AND customer_id = ?')
        .bind(code, customerId)
        .first<{ id: number; status: string; payment_status: string; proof_key: string }>()
      if (!order) return json({ error: 'Order not found.' }, 404)
      if (order.payment_status === 'paid') return json({ error: 'This order is already paid.' }, 400)
      const form = await request.formData()
      const file = form.get('file')
      if (!(file instanceof File)) return json({ error: 'Choose your payment screenshot or receipt.' }, 400)
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } as Record<string, string>)[file.type]
      if (!ext) return json({ error: 'Upload a photo/screenshot (JPG, PNG) or a PDF.' }, 400)
      if (file.size > 5 * 1024 * 1024) return json({ error: 'The file must be 5 MB or smaller.' }, 400)
      const key = `proofs/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE orders SET proof_key = ?, proof_uploaded_at = datetime('now'), payment_method = 'transfer',
           status = CASE WHEN status = 'pending_payment' THEN 'awaiting_confirmation' ELSE status END, updated_at = datetime('now') WHERE id = ?`,
        ).bind(key, order.id),
        env.DB.prepare(`INSERT INTO order_events (order_id, status, note) VALUES (?, 'awaiting_confirmation', 'Proof of payment uploaded')`).bind(order.id),
      ])
      if (order.proof_key) await env.MEDIA.delete(order.proof_key)
      return json({ ok: true })
    }

    // Proof of payment for admins:  GET /api/admin/proof/<orderId>
    const proofMatch = url.pathname.match(/^\/api\/admin\/proof\/(\d+)$/)
    if (proofMatch && request.method === 'GET') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return new Response('Please sign in to the admin dashboard.', { status: 401 })
      const row = await env.DB.prepare('SELECT proof_key FROM orders WHERE id = ?').bind(Number(proofMatch[1])).first<{ proof_key: string }>()
      if (!row?.proof_key) return new Response('No proof of payment was uploaded for this order.', { status: 404 })
      const obj = await env.MEDIA.get(row.proof_key)
      if (!obj) return new Response('File not found.', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('cache-control', 'private, no-store')
      headers.set('x-content-type-options', 'nosniff')
      return new Response(obj.body, { headers })
    }

    // Dashboard menu badges:  GET /api/admin/alerts
    if (url.pathname === '/api/admin/alerts' && request.method === 'GET') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return json({ error: 'Please sign in again.' }, 401)
      return new Response(JSON.stringify(await adminAlerts(env.DB)), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      })
    }

    // Live chat:  /api/chat/...  (visitors by chat token, dashboard by admin cookie)
    if (url.pathname.startsWith('/api/chat/')) {
      return handleChatApi(request, env, url, {
        admin: () => adminFromCookie(request, env),
        customerId: () => customerIdFromCookie(request, env),
      })
    }

    // Cake customiser picture:  POST /api/cart/reference  (multipart "file"). Signed-in customers only.
    if (url.pathname === '/api/cart/reference' && request.method === 'POST') {
      const customerId = await customerIdFromCookie(request, env)
      if (!customerId) return json({ error: 'Please sign in to add a picture.' }, 401)
      const form = await request.formData().catch(() => null)
      const file = form?.get('file')
      if (!(file instanceof File)) return json({ error: 'Choose a picture.' }, 400)
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type]
      if (!ext) return json({ error: 'Upload a photo (JPG, PNG or WebP).' }, 400)
      if (file.size > 8 * 1024 * 1024) return json({ error: 'The picture must be 8 MB or smaller.' }, 400)
      const key = `refs/${crypto.randomUUID()}.${ext}`
      await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
      return json({ key })
    }

    // Customer's own cake picture (cart, order page):  GET /api/my/ref/<cartItemId|o-orderItemId>
    const myRef = url.pathname.match(/^\/api\/my\/ref\/(o-)?(\d+)$/)
    if (myRef && request.method === 'GET') {
      const customerId = await customerIdFromCookie(request, env)
      if (!customerId) return new Response('Please sign in.', { status: 401 })
      const row = myRef[1]
        ? await env.DB.prepare('SELECT i.ref_key FROM order_items i JOIN orders o ON o.id = i.order_id WHERE i.id = ? AND o.customer_id = ?')
            .bind(Number(myRef[2]), customerId)
            .first<{ ref_key: string }>()
        : await env.DB.prepare('SELECT ref_key FROM cart_items WHERE id = ? AND customer_id = ?').bind(Number(myRef[2]), customerId).first<{ ref_key: string }>()
      return privateFile(env, row?.ref_key)
    }

    // Cake picture for admins:  GET /api/admin/order-item-ref/<orderItemId>
    const itemRef = url.pathname.match(/^\/api\/admin\/order-item-ref\/(\d+)$/)
    if (itemRef && request.method === 'GET') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return new Response('Please sign in to the admin dashboard.', { status: 401 })
      const row = await env.DB.prepare('SELECT ref_key FROM order_items WHERE id = ?').bind(Number(itemRef[1])).first<{ ref_key: string }>()
      return privateFile(env, row?.ref_key)
    }

    // Event bookings: proof of payment and reference photo (booking owner only)
    if ((url.pathname === '/api/bookings/proof' || url.pathname === '/api/bookings/reference') && request.method === 'POST') {
      return bookingUpload(request, env, url)
    }

    // Booking files for admins:  GET /api/admin/booking-file/<bookingId>/proof|reference
    const bookingFile = url.pathname.match(/^\/api\/admin\/booking-file\/(\d+)\/(proof|reference)$/)
    if (bookingFile && request.method === 'GET') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return new Response('Please sign in to the admin dashboard.', { status: 401 })
      const row = await env.DB.prepare('SELECT proof_key, reference_image FROM bookings WHERE id = ?')
        .bind(Number(bookingFile[1]))
        .first<{ proof_key: string; reference_image: string }>()
      const key = bookingFile[2] === 'proof' ? row?.proof_key : row?.reference_image
      if (!key) return new Response('No file was uploaded for this booking.', { status: 404 })
      const obj = await env.MEDIA.get(key)
      if (!obj) return new Response('File not found.', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('cache-control', 'private, no-store')
      headers.set('x-content-type-options', 'nosniff')
      return new Response(obj.body, { headers })
    }

    // Job application:  POST /api/careers/apply  (multipart form, optional "cv" file). Public.
    if (url.pathname === '/api/careers/apply' && request.method === 'POST') {
      return applyForJob(request, env)
    }

    // CV download for admins:  GET /api/admin/cv/<applicationId>
    const cvMatch = url.pathname.match(/^\/api\/admin\/cv\/(\d+)$/)
    if (cvMatch && request.method === 'GET') {
      const admin = await adminFromCookie(request, env)
      if (!admin) return new Response('Please sign in to the admin dashboard.', { status: 401 })
      if (admin.role !== 'owner') return new Response('Only the owner can open CVs.', { status: 403 })
      const row = await env.DB.prepare('SELECT cv_key, cv_name FROM job_applications WHERE id = ?')
        .bind(Number(cvMatch[1]))
        .first<{ cv_key: string; cv_name: string }>()
      if (!row?.cv_key) return new Response('No CV was attached to this application.', { status: 404 })
      const obj = await env.MEDIA.get(row.cv_key)
      if (!obj) return new Response('CV file not found.', { status: 404 })
      const headers = new Headers()
      obj.writeHttpMetadata(headers)
      headers.set('content-disposition', `attachment; filename="${(row.cv_name || 'cv').replace(/[^\w.\- ]+/g, '_')}"`)
      headers.set('cache-control', 'private, no-store')
      headers.set('x-content-type-options', 'nosniff')
      return new Response(obj.body, { headers })
    }

    return handler.fetch(request)
  },
}

async function bookingUpload(request: Request, env: AppEnv, url: URL) {
  const customerId = await customerIdFromCookie(request, env)
  if (!customerId) return json({ error: 'Please sign in again.' }, 401)
  const isProof = url.pathname.endsWith('/proof')
  const code = (url.searchParams.get('code') ?? '').slice(0, 20)
  const b = await env.DB.prepare(
    'SELECT id, status, quote_amount, paid_amount, proof_key, reference_image FROM bookings WHERE code = ? AND customer_id = ?',
  )
    .bind(code, customerId)
    .first<{ id: number; status: string; quote_amount: number; paid_amount: number; proof_key: string; reference_image: string }>()
  if (!b) return json({ error: 'Booking not found.' }, 404)
  if (isProof) {
    if (!['quoted', 'checking', 'booked'].includes(b.status)) return json({ error: 'This booking isn’t waiting for a payment.' }, 400)
    if (b.quote_amount > 0 && b.paid_amount >= b.quote_amount) return json({ error: 'This booking is already paid in full.' }, 400)
  } else if (!['requested', 'quoted', 'checking', 'booked'].includes(b.status)) {
    return json({ error: 'This booking is closed.' }, 400)
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return json({ error: isProof ? 'Choose your payment screenshot or receipt.' : 'Choose a picture.' }, 400)
  const types: Record<string, string> = isProof
    ? { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }
    : { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const ext = types[file.type]
  if (!ext) return json({ error: isProof ? 'Upload a photo/screenshot (JPG, PNG) or a PDF.' : 'Upload a photo (JPG, PNG or WebP).' }, 400)
  if (file.size > 8 * 1024 * 1024) return json({ error: 'The file must be 8 MB or smaller.' }, 400)

  // Stored privately: not under uploads/, so /media never serves these
  const key = `${isProof ? 'proofs' : 'refs'}/${crypto.randomUUID()}.${ext}`
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
  if (isProof) {
    const next = b.status === 'quoted' ? 'checking' : b.status
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE bookings SET proof_key = ?, proof_uploaded_at = datetime('now'), proof_pending = 1, status = ?, updated_at = datetime('now') WHERE id = ?`,
      ).bind(key, next, b.id),
      env.DB.prepare(`INSERT INTO booking_events (booking_id, status, note) VALUES (?, ?, 'Proof of payment uploaded')`).bind(b.id, next),
    ])
    if (b.proof_key) await env.MEDIA.delete(b.proof_key)
  } else {
    await env.DB.prepare(`UPDATE bookings SET reference_image = ?, updated_at = datetime('now') WHERE id = ?`).bind(key, b.id).run()
    if (b.reference_image) await env.MEDIA.delete(b.reference_image)
  }
  return json({ ok: true })
}

async function applyForJob(request: Request, env: AppEnv) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Something went wrong sending your application. Please try again.' }, 400)
  }
  const field = (name: string, max = 500) => String(form.get(name) ?? '').trim().slice(0, max)
  if (field('website')) return json({ code: 'A-0' }) // honeypot: quietly ignore bots

  const name = field('name', 100)
  const phone = field('phone', 40)
  if (!name) return json({ error: 'Please enter your name.' }, 400)
  if (phone.replace(/\D/g, '').length < 7) return json({ error: 'Please enter a phone number we can reach you on.' }, 400)

  // Job: must be open, or it's a general application
  let jobId: number | null = null
  let jobTitle = 'General application'
  const rawJob = Number(field('job_id', 12))
  if (rawJob > 0) {
    const job = await env.DB.prepare('SELECT id, title FROM jobs WHERE id = ? AND is_open = 1').bind(rawJob).first<{ id: number; title: string }>()
    if (!job) return json({ error: 'That job is no longer open. You can still send a general application.' }, 400)
    jobId = job.id
    jobTitle = job.title
  }

  // Optional CV, stored privately (not under uploads/, so /media never serves it)
  let cvKey = ''
  let cvName = ''
  const cv = form.get('cv')
  if (cv instanceof File && cv.size > 0) {
    const ext = CV_TYPES[cv.type]
    if (!ext) return json({ error: 'Your CV must be a PDF, Word document, or a photo (JPG or PNG).' }, 400)
    if (cv.size > MAX_CV) return json({ error: 'Your CV must be 5 MB or smaller.' }, 400)
    cvKey = `cvs/${crypto.randomUUID()}.${ext}`
    cvName = cv.name.slice(0, 120)
    await env.MEDIA.put(cvKey, cv.stream(), { httpMetadata: { contentType: cv.type } })
  }

  const r = await env.DB.prepare(
    `INSERT INTO job_applications (code, job_id, job_title, name, phone, email, area, experience, availability, about, cv_key, cv_name)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      `pending-${crypto.randomUUID()}`,
      jobId,
      jobTitle,
      name,
      phone,
      field('email', 150),
      field('area', 80),
      field('experience', 1500),
      field('availability', 200),
      field('about', 2000),
      cvKey,
      cvName,
    )
    .run()
  const id = Number(r.meta.last_row_id)
  const code = `A-${1000 + id}`
  await env.DB.prepare('UPDATE job_applications SET code = ? WHERE id = ?').bind(code, id).run()
  return json({ code, jobTitle })
}

async function privateFile(env: AppEnv, key: string | undefined | null) {
  if (!key) return new Response('No picture was added.', { status: 404 })
  const obj = await env.MEDIA.get(key)
  if (!obj) return new Response('File not found.', { status: 404 })
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('cache-control', 'private, max-age=3600')
  headers.set('x-content-type-options', 'nosniff')
  return new Response(obj.body, { headers })
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

async function adminFromCookie(request: Request, env: AppEnv) {
  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(ADMIN_COOKIE + '='))
    ?.slice(ADMIN_COOKIE.length + 1)
  if (!token) return null
  return env.DB.prepare(
    `SELECT a.id, a.name, a.role FROM sessions s JOIN admins a ON a.id = s.user_id
     WHERE s.id = ? AND s.user_type = 'admin' AND s.expires_at > ?`,
  )
    .bind(decodeURIComponent(token), new Date().toISOString())
    .first<{ id: number; name: string; role: string }>()
}

async function sitemap(origin: string, env: AppEnv) {
  const pages = ['/', '/menu', '/events', '/gallery', '/about', '/careers', '/contact', '/faq', '/terms', '/privacy']
  const { results } = await env.DB.prepare(
    `SELECT p.slug, p.updated_at FROM products p JOIN categories c ON c.id = p.category_id WHERE c.is_active = 1`,
  ).all<{ slug: string; updated_at: string }>()
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const urls = [
    ...pages.map((p) => `<url><loc>${esc(origin + p)}</loc></url>`),
    ...results.map((r) => `<url><loc>${esc(`${origin}/menu/${r.slug}`)}</loc><lastmod>${r.updated_at.slice(0, 10)}</lastmod></url>`),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}

async function paystackWebhook(request: Request, env: AppEnv) {
  const secret = env.PAYSTACK_SECRET_KEY
  if (!secret) return new Response('Not configured', { status: 503 })
  const raw = await request.text()
  if (!(await paystackSignatureValid(secret, raw, request.headers.get('x-paystack-signature')))) {
    return new Response('Invalid signature', { status: 401 })
  }
  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Bad request', { status: 400 })
  }
  if (event.event === 'charge.success' && event.data?.reference) {
    // Never trust the webhook body alone: confirm with Paystack's API
    const v = await paystackVerify(secret, event.data.reference)
    if (v?.paid && v.currency === 'NGN') {
      if (v.reference.startsWith('MB-')) await markBookingPaidByReference(env.DB, v.reference, v.amountNaira)
      else await markOrderPaidByReference(env.DB, v.reference, v.amountNaira)
    }
  }
  return new Response('ok')
}

async function customerIdFromCookie(request: Request, env: AppEnv) {
  const cookie = request.headers.get('cookie') ?? ''
  const token = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(CUSTOMER_COOKIE + '='))
    ?.slice(CUSTOMER_COOKIE.length + 1)
  if (!token) return null
  const row = await env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ? AND user_type = 'customer' AND expires_at > ?`)
    .bind(decodeURIComponent(token), new Date().toISOString())
    .first<{ user_id: number }>()
  return row?.user_id ?? null
}
