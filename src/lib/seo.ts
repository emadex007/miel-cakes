// Structured data (schema.org JSON-LD) so Google can show the bakery's details
// and product prices in search results.
import type { Product } from './types'

type Settings = Record<string, string>

const abs = (url: string, site: string) => (url && url.startsWith('/') && site ? `${site}${url}` : url)

/** Safe to put inside a <script> tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

export function bakeryJsonLd(s: Settings) {
  const site = (s.site_url ?? '').replace(/\/+$/, '')
  const image = abs(s.share_image_url || s.hero_image_url || s.logo_url || '', site)
  const sameAs = [s.instagram, s.facebook, s.tiktok, s.twitter, s.linkedin].filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: s.business_name,
    description: s.meta_description || s.tagline,
    ...(site ? { url: site } : {}),
    ...(image ? { image } : {}),
    ...(s.logo_url ? { logo: abs(s.logo_url, site) } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: (s.address || '').replace(/\n/g, ', '),
      addressLocality: 'Abuja',
      addressRegion: 'FCT',
      addressCountry: 'NG',
    },
    areaServed: 'Abuja',
    priceRange: '₦₦',
    currenciesAccepted: 'NGN',
    ...(sameAs.length ? { sameAs } : {}),
  }
}

export function productJsonLd(p: Product, s: Settings, path: string) {
  const site = (s.site_url ?? '').replace(/\/+$/, '')
  const prices = p.options.map((o) => o.price).filter((n) => n > 0)
  const availability = p.is_available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || `${p.name} from ${s.business_name}`,
    ...(p.image_url ? { image: abs(p.image_url, site) } : {}),
    brand: { '@type': 'Brand', name: s.business_name },
    category: p.category_name,
    ...(prices.length
      ? {
          offers:
            prices.length > 1
              ? { '@type': 'AggregateOffer', priceCurrency: 'NGN', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability }
              : { '@type': 'Offer', priceCurrency: 'NGN', price: prices[0], availability, ...(site ? { url: `${site}${path}` } : {}) },
        }
      : {}),
  }
}
