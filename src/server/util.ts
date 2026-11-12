// Server-only helpers shared by server functions.
import { getRequest } from '@tanstack/react-start/server'
import { workerEnv } from './db'
import { loadSettings } from './settings'

export const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
export const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}
export const digits = (s: string) => (s || '').replace(/\D/g, '')
export const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Today's date in Abuja (UTC+1), as YYYY-MM-DD. */
export const lagosToday = () => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10)
export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Which payment methods are switched on. At least one is always available. */
export async function paymentOptions() {
  const s = await loadSettings()
  const paystack = s.paystack_enabled === '1' && !!workerEnv().PAYSTACK_SECRET_KEY
  const transfer = s.transfer_enabled === '1' || !paystack
  return { paystack, transfer }
}

export function siteOrigin() {
  try {
    return new URL(getRequest().url).origin
  } catch {
    return ''
  }
}
