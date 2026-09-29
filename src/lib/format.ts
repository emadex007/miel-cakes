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
