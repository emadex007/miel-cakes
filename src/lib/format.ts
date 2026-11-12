import type { ProductOption } from './types'

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

export const formatNaira = (amount: number) => naira.format(amount || 0)

export const fromPrice = (options: ProductOption[]) =>
  options.length ? Math.min(...options.map((o) => o.price)) : 0

export const lines = (value: string | undefined) =>
  (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export const paragraphs = (value: string | undefined) =>
  (value ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'item'

export function whatsappLink(number: string, message: string) {
  const digits = (number || '').replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes('videos.pexels.com')

/** Turns a Nigerian local number (0801…) into international format (234801…) for WhatsApp links. */
export function toIntlPhone(phone: string) {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) return `234${d.slice(1)}`
  return d
}

/** 2026-12-24 → 24/12/2026 (day/month/year, as used in Nigeria). */
export function formatDMY(iso: string | undefined | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** How the customer gets their order, in words. */
export function fulfilmentLabel(fulfilment: string, ownRider?: number | boolean | null) {
  if (fulfilment === 'delivery') return 'Delivery'
  return ownRider ? 'Own rider (collects from us)' : 'Pickup'
}
