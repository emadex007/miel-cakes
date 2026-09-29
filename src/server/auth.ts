// Password hashing (PBKDF2 via Web Crypto) and cookie sessions stored in D1.
import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import type { AdminUser } from '~/lib/types'
import { db } from './db'

export const ADMIN_COOKIE = 'mc_admin'
const SESSION_DAYS = 30
const ITERATIONS = 100_000 // Cloudflare Workers' PBKDF2 limit

const enc = new TextEncoder()
const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: BufferSource, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(password, salt, ITERATIONS)
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${toB64(bits)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iter || !saltB64 || !hashB64) return false
  const bits = new Uint8Array(await derive(password, fromB64(saltB64), Number(iter)))
  const expected = fromB64(hashB64)
  if (bits.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i]
  return diff === 0
}

function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(userType: 'admin' | 'customer', userId: number) {
  const id = newSessionId()
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await db()
    .prepare('INSERT INTO sessions (id, user_type, user_id, expires_at) VALUES (?, ?, ?, ?)')
    .bind(id, userType, userId, expires.toISOString())
    .run()
  return { id, expires }
}

export async function startAdminSession(adminId: number) {
  const { id } = await createSession('admin', adminId)
  setCookie(ADMIN_COOKIE, id, {
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  })
}

export async function endAdminSession() {
  const id = getCookie(ADMIN_COOKIE)
  if (id) await db().prepare('DELETE FROM sessions WHERE id = ?').bind(id).run()
  deleteCookie(ADMIN_COOKIE, { path: '/' })
}

export async function adminFromSessionId(sessionId: string | undefined | null): Promise<AdminUser | null> {
  if (!sessionId) return null
  const row = await db()
    .prepare(
      `SELECT a.id, a.name, a.email, a.role FROM sessions s
       JOIN admins a ON a.id = s.user_id
       WHERE s.id = ? AND s.user_type = 'admin' AND s.expires_at > ?`,
    )
    .bind(sessionId, new Date().toISOString())
    .first<AdminUser>()
  return row ?? null
}

/** Current admin from the request cookie, or null. */
export const currentAdmin = () => adminFromSessionId(getCookie(ADMIN_COOKIE))

/** Throws if nobody is signed in to the admin dashboard. */
export async function requireAdmin() {
  const admin = await currentAdmin()
  if (!admin) throw new Error('Please sign in to the admin dashboard again.')
  return admin
}

// ---------------------------------------------------------------------------
// Customer sessions (online shop)
// ---------------------------------------------------------------------------
export const CUSTOMER_COOKIE = 'mc_customer'

export interface CustomerUser {
  id: number
  name: string
  email: string
  phone: string
}

export async function startCustomerSession(customerId: number) {
  const { id } = await createSession('customer', customerId)
  setCookie(CUSTOMER_COOKIE, id, {
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  })
}

export async function endCustomerSession() {
  const id = getCookie(CUSTOMER_COOKIE)
  if (id) await db().prepare('DELETE FROM sessions WHERE id = ?').bind(id).run()
  deleteCookie(CUSTOMER_COOKIE, { path: '/' })
}

export async function customerFromSessionId(sessionId: string | undefined | null): Promise<CustomerUser | null> {
  if (!sessionId) return null
  const row = await db()
    .prepare(
      `SELECT c.id, c.name, c.email, c.phone FROM sessions s
       JOIN customers c ON c.id = s.user_id
       WHERE s.id = ? AND s.user_type = 'customer' AND s.expires_at > ?`,
    )
    .bind(sessionId, new Date().toISOString())
    .first<CustomerUser>()
  return row ?? null
}

export const currentCustomer = () => customerFromSessionId(getCookie(CUSTOMER_COOKIE))

export async function requireCustomer() {
  const c = await currentCustomer()
  if (!c) throw new Error('Please sign in to continue.')
  return c
}
