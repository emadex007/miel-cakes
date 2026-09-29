// Every editable site setting lives here. The admin forms are generated from
// this list, and these values are the fallbacks until the owner edits them.

export type FieldType = 'text' | 'textarea' | 'color' | 'image' | 'video' | 'url' | 'number' | 'lines'

export interface SiteField {
  key: string
  label: string
  type: FieldType
  default: string
  help?: string
}

export interface FieldGroup {
  id: string
  title: string
  description: string
  fields: SiteField[]
}

const PEXELS_IMG = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`
const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'brand',
    title: 'Business & branding',
    description: 'Your name, logo and colours. Colour changes apply across the whole website.',
    fields: [
      { key: 'business_name', label: 'Business name', type: 'text', default: 'Miel Cakes' },
      { key: 'tagline', label: 'Short tagline', type: 'text', default: 'Cakes, small chops & pastries in Abuja' },
      { key: 'logo_url', label: 'Logo', type: 'image', default: '', help: 'Leave empty to show the business name as text. A PNG with a transparent background works best.' },
      { key: 'color_primary', label: 'Main colour', type: 'color', default: '#B8325A', help: 'Buttons, links and highlights.' },
      { key: 'color_accent', label: 'Accent colour', type: 'color', default: '#E3A82B', help: 'Small touches like badges and the rotating menu line.' },
      { key: 'color_dark', label: 'Dark colour', type: 'color', default: '#3A2320', help: 'Headings, footer and dark sections.' },
      { key: 'color_cream', label: 'Background colour', type: 'color', default: '#FFF7F2', help: 'The page background.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & social',
    description: 'Shown in the footer and on the Contact page. The WhatsApp number powers every "Order on WhatsApp" button.',
    fields: [
      { key: 'whatsapp', label: 'WhatsApp number', type: 'text', default: '', help: 'International format without + or spaces, e.g. 2348012345678.' },
      { key: 'phone', label: 'Phone number', type: 'text', default: '', help: 'As you want it displayed, e.g. 0801 234 5678.' },
      { key: 'email', label: 'Email', type: 'text', default: '' },
      { key: 'address', label: 'Pickup address', type: 'textarea', default: 'Abuja, FCT' },
      { key: 'opening_hours', label: 'Opening hours', type: 'lines', default: 'Mon – Fri: 8am – 7pm\nSat: 9am – 6pm\nSun: Orders only', help: 'One line per row.' },
      { key: 'instagram', label: 'Instagram link', type: 'url', default: '' },
      { key: 'facebook', label: 'Facebook link', type: 'url', default: '' },
      { key: 'tiktok', label: 'TikTok link', type: 'url', default: '' },
    ],
  },
  {
    id: 'hero',
    title: 'Homepage top section',
    description: 'The first thing visitors see. The headline animates in and the highlighted words get an icing underline.',
    fields: [
      { key: 'hero_eyebrow', label: 'Small line above headline', type: 'text', default: 'Home bakery · Abuja' },
      { key: 'hero_title', label: 'Headline', type: 'text', default: 'Cakes, small chops and pastries, freshly baked' },
      { key: 'hero_highlight', label: 'Words to highlight', type: 'text', default: 'freshly baked', help: 'Must match words in the headline exactly.' },
      { key: 'hero_rotating', label: 'Rotating menu line', type: 'lines', default: 'Birthday cakes\nSmall chops\nMeat pies\nPuff-puff\nWedding cakes\nCupcakes', help: 'One item per line. They cycle after "Fresh in Abuja today:".' },
      { key: 'hero_subtitle', label: 'Text under headline', type: 'textarea', default: 'Order online for pickup or delivery anywhere in Abuja, or book us for your birthday, wedding, church or office event.' },
      { key: 'hero_video_url', label: 'Background video', type: 'video', default: 'https://videos.pexels.com/video-files/6942765/6942765-hd_1920_1080_25fps.mp4', help: 'Short, silent loop. MP4 under 15 MB loads best on phones. Leave empty to use the image only.' },
      { key: 'hero_image_url', label: 'Background image', type: 'image', default: 'https://images.pexels.com/videos/6942765/pexels-photo-6942765.jpeg?auto=compress&cs=tinysrgb&w=1600', help: 'Shows while the video loads, and on its own if there is no video.' },
    ],
  },
  {
    id: 'home',
    title: 'Homepage sections',
    description: 'Section titles and the event booking banner on the homepage.',
    fields: [
      { key: 'home_categories_title', label: 'Categories title', type: 'text', default: 'What are you craving?' },
      { key: 'home_featured_title', label: 'Favourites title', type: 'text', default: 'Customer favourites' },
      { key: 'home_steps', label: 'How it works steps', type: 'lines', default: 'Pick your treats|Choose from cakes, small chops, pastries and more.\nPay online|Pay securely with Paystack or bank transfer.\nPickup or delivery|Collect from us or get it delivered anywhere in Abuja.', help: 'One step per line, written as Title|Description.' },
      { key: 'event_title', label: 'Event banner title', type: 'text', default: 'Planning a party?' },
      { key: 'event_body', label: 'Event banner text', type: 'textarea', default: 'Birthdays, weddings, naming ceremonies, church and office events. Tell us your date and guest count, and we will put together cakes, small chops trays and pastries for you.' },
      { key: 'event_image_url', label: 'Event banner image', type: 'image', default: PEXELS_IMG('39660402') },
    ],
  },
  {
    id: 'about',
    title: 'About page',
    description: 'Tell your story. Separate paragraphs with a blank line.',
    fields: [
      { key: 'about_title', label: 'Title', type: 'text', default: 'Baked with love in Abuja' },
      { key: 'about_body', label: 'Story', type: 'textarea', default: 'Miel Cakes started in a home kitchen with one oven and a lot of birthday requests from friends and family.\n\nToday we bake celebration cakes, small chops, pastries and treats for homes, offices and events across Abuja. Everything is made fresh to order, with good ingredients and careful finishing.\n\nWhether it is a 6-inch birthday cake or trays for 200 wedding guests, we treat every order like it is for our own family.' },
      { key: 'about_image_url', label: 'Photo', type: 'image', default: UNSPLASH('1709837167684-47d7ccf0ed89') },
      { key: 'about_video_url', label: 'Video (optional)', type: 'video', default: 'https://videos.pexels.com/video-files/6576502/6576502-uhd_1440_2560_24fps.mp4', help: 'Plays silently on a loop beside your story. Leave empty to hide.' },
      { key: 'gallery', label: 'Gallery photos', type: 'lines', default: [UNSPLASH('1535254973040-607b474cb50d'), PEXELS_IMG('13915068'), UNSPLASH('1603532648955-039310d9ed75'), PEXELS_IMG('37648029'), UNSPLASH('1604413191066-4dd20bedf486'), PEXELS_IMG('13988870')].join('\n'), help: 'One image link per line. Upload in Photos & videos, then paste the link here.' },
    ],
  },
  {
    id: 'ordering',
    title: 'Ordering & payments',
    description: 'Rules for orders and bookings. Online checkout switches on in the next build phase.',
    fields: [
      { key: 'order_note', label: 'Note shown on every product', type: 'textarea', default: 'Cakes need at least 3 days notice. Small chops and pastries can be ready the same day if you order before 12 noon.' },
      { key: 'booking_deposit_percent', label: 'Event booking deposit (%)', type: 'number', default: '50', help: 'Share of the quoted price paid to confirm a booking.' },
      { key: 'bank_name', label: 'Bank name', type: 'text', default: '', help: 'For customers who pay by transfer.' },
      { key: 'bank_account_name', label: 'Account name', type: 'text', default: '' },
      { key: 'bank_account_number', label: 'Account number', type: 'text', default: '' },
      { key: 'paystack_public_key', label: 'Paystack public key', type: 'text', default: '', help: 'Starts with pk_. The secret key is stored separately as a Cloudflare secret, never here.' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'The bottom of every page.',
    fields: [
      { key: 'footer_note', label: 'Footer text', type: 'textarea', default: 'Freshly baked cakes, small chops and pastries. Pickup and delivery across Abuja.' },
      { key: 'footer_credit', label: 'Website credit', type: 'text', default: 'Website by Emadex Creations' },
    ],
  },
]

export const ALL_FIELDS: SiteField[] = FIELD_GROUPS.flatMap((g) => g.fields)
export const FIELD_KEYS = new Set(ALL_FIELDS.map((f) => f.key))
export const DEFAULT_SETTINGS: Record<string, string> = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.default]),
)

export type SiteSettings = Record<string, string>

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
