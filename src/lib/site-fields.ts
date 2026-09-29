// Every editable site setting lives here. The admin forms are generated from
// this list, and these values are the fallbacks until the owner edits them.

export type FieldType = 'text' | 'textarea' | 'color' | 'image' | 'video' | 'url' | 'number' | 'lines' | 'toggle'

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

export const COLOR_KEYS = [
  'color_primary',
  'color_hover',
  'color_hover_text',
  'color_accent',
  'color_highlight',
  'color_dark',
  'color_cream',
] as const

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'brand',
    title: 'Business & colours',
    description: 'Your name, logo and brand colours. Colour changes apply across the whole website as soon as you save.',
    fields: [
      { key: 'business_name', label: 'Business name', type: 'text', default: 'Miel Cakes' },
      { key: 'tagline', label: 'Short tagline', type: 'text', default: 'Cakes, small chops & pastries in Abuja' },
      { key: 'logo_url', label: 'Logo', type: 'image', default: '', help: 'Leave empty to show the business name as text. A PNG with a transparent background works best.' },
      { key: 'site_icon_url', label: 'Site icon (browser tab & phone home screen)', type: 'image', default: '', help: 'Optional. A square image, at least 512 × 512 pixels. Leave empty to use the built-in cake icon.' },
      { key: 'color_primary', label: 'Main colour (buttons)', type: 'color', default: '#1D4ED8', help: 'Buttons, links and highlights. Miel Cakes blue.' },
      { key: 'color_hover', label: 'Button hover colour', type: 'color', default: '#FACC15', help: 'What a button changes to when the mouse goes over it.' },
      { key: 'color_hover_text', label: 'Button hover text colour', type: 'color', default: '#0F1E3D', help: 'Text on a button while the mouse is over it. Use a dark colour on yellow.' },
      { key: 'color_accent', label: 'Second colour', type: 'color', default: '#FACC15', help: 'Badges, the rotating menu line, the icing underline. Miel Cakes yellow.' },
      { key: 'color_highlight', label: 'Touch of red', type: 'color', default: '#DC2626', help: 'Small touches only: the stars in the scrolling strip, "Sold out" badges, sprinkles.' },
      { key: 'color_dark', label: 'Dark colour', type: 'color', default: '#0F1E3D', help: 'Headings, the top bar, footer and dark sections. Deep navy blue.' },
      { key: 'color_cream', label: 'Page background', type: 'color', default: '#FFFCF5', help: 'The background of every page.' },
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing & Google',
    description: 'How the website looks when someone shares the link on WhatsApp, Facebook or X, and in Google results.',
    fields: [
      { key: 'share_image_url', label: 'Link preview image', type: 'image', default: '', help: 'Shown when the link is shared. Use a wide photo (1200 × 630 works best). Leave empty to use the homepage image.' },
      { key: 'meta_description', label: 'Description for Google and link previews', type: 'textarea', default: 'Miel Cakes bakes birthday, wedding and celebration cakes, small chops, pastries and treats in Abuja. Order for pickup or delivery, or ask for a quote.', help: 'One or two sentences, under 160 characters is best.' },
      { key: 'site_url', label: 'Website address', type: 'url', default: '', help: 'Your live address, e.g. https://mielcakes.com.ng. Used for Google and link previews.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & social',
    description: 'Shown in the top bar, footer and Contact page. The WhatsApp number powers every "Order on WhatsApp" and quote button.',
    fields: [
      { key: 'whatsapp', label: 'WhatsApp number', type: 'text', default: '', help: 'International format without + or spaces, e.g. 2348012345678.' },
      { key: 'phone', label: 'Phone number', type: 'text', default: '', help: 'As you want it displayed, e.g. 0801 234 5678.' },
      { key: 'email', label: 'Email', type: 'text', default: '' },
      { key: 'address', label: 'Pickup address', type: 'textarea', default: 'Abuja, FCT' },
      { key: 'opening_hours', label: 'Opening hours', type: 'lines', default: 'Mon – Fri: 8am – 7pm\nSat: 9am – 6pm\nSun: Orders only', help: 'One line per row.' },
      { key: 'topbar_note', label: 'Top bar message', type: 'text', default: 'Order cakes 3 days ahead · Same-day small chops if you order before 12 noon', help: 'The thin bar at the very top of every page. Leave empty to hide the message.' },
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
      { key: 'hero_rotating', label: 'Rotating menu line', type: 'lines', default: 'Birthday cakes\nWedding cakes\nSmall chops\nMeat pies\nPuff-puff\nCupcakes', help: 'One item per line. They cycle after "Fresh in Abuja today:".' },
      { key: 'hero_subtitle', label: 'Text under headline', type: 'textarea', default: 'Birthdays, weddings, naming ceremonies, church and office events. Order for pickup or delivery anywhere in Abuja, or ask us for a quote.' },
      { key: 'hero_video_url', label: 'Background video', type: 'video', default: 'https://videos.pexels.com/video-files/6942765/6942765-hd_1920_1080_25fps.mp4', help: 'Short, silent loop. MP4 under 15 MB loads best on phones. Leave empty to use the image only.' },
      { key: 'hero_image_url', label: 'Background image', type: 'image', default: 'https://images.pexels.com/videos/6942765/pexels-photo-6942765.jpeg?auto=compress&cs=tinysrgb&w=1600', help: 'Shows while the video loads, and on its own if there is no video.' },
    ],
  },
  {
    id: 'home',
    title: 'Homepage sections',
    description: 'Section titles, how-it-works steps and the event banner on the homepage.',
    fields: [
      { key: 'home_categories_title', label: 'Categories title', type: 'text', default: 'What are you craving?' },
      { key: 'home_featured_title', label: 'Favourites title', type: 'text', default: 'Customer favourites' },
      { key: 'home_steps', label: 'How it works steps', type: 'lines', default: 'Choose your treats|Pick from the menu, or ask for a quote for a custom cake or event.\nConfirm on WhatsApp|We confirm your order, date and total, including delivery.\nPay by transfer|Send your proof of payment on WhatsApp. We start once payment is confirmed.\nPickup or delivery|Collect from us, or we deliver anywhere in Abuja.', help: 'One step per line, written as Title|Description.' },
      { key: 'event_title', label: 'Event banner title', type: 'text', default: 'Planning something special?' },
      { key: 'event_body', label: 'Event banner text', type: 'textarea', default: 'Tell us your occasion, date and number of guests. We will put together the cake, small chops trays and pastries, and send you a quote.' },
      { key: 'event_image_url', label: 'Event banner image', type: 'image', default: PEXELS_IMG('39660402') },
    ],
  },
  {
    id: 'occasions',
    title: 'Occasions',
    description: 'The occasions you bake for. They appear on the homepage, in the footer, in the gallery filters and in the quote form.',
    fields: [
      { key: 'occasions_title', label: 'Section title', type: 'text', default: 'Treats for every occasion' },
      { key: 'occasions_intro', label: 'Intro text', type: 'textarea', default: 'From a small birthday surprise to a 300-guest wedding, we bake for the moments that matter.' },
      {
        key: 'occasions',
        label: 'Occasions by group',
        type: 'lines',
        default: [
          'Celebrations|Birthdays, Anniversaries, Graduations, Promotions, Surprise parties',
          "Weddings & love|Weddings, Traditional weddings, Engagements, Bridal showers, Valentine's Day",
          "Family moments|Baby showers, Naming ceremonies, Gender reveals, Kids' parties, Mother's & Father's Day",
          'Faith & festive|Church events, Thanksgiving, Christmas, Easter, Sallah, New Year',
          'Work & events|Office parties, Product launches, Conferences, Send-forths, Retirements',
        ].join('\n'),
        help: 'One group per line, written as Group|Occasion, Occasion, Occasion.',
      },
    ],
  },
  {
    id: 'about',
    title: 'About page',
    description: 'Tell your story. Every section is optional; leave a box empty to hide that part of the page.',
    fields: [
      { key: 'about_eyebrow', label: 'Small line above title', type: 'text', default: 'Our story' },
      { key: 'about_title', label: 'Title', type: 'text', default: 'Baked with love in Abuja' },
      { key: 'about_body', label: 'Story', type: 'textarea', default: 'Miel Cakes started in a home kitchen with one oven and a lot of birthday requests from friends and family.\n\nToday we bake celebration cakes, small chops, pastries and treats for homes, offices, churches and events across Abuja. Everything is made fresh to order, with good ingredients and careful finishing.\n\nWhether it is a 6-inch birthday cake or trays for 200 wedding guests, we treat every order like it is for our own family.', help: 'Separate paragraphs with a blank line.' },
      { key: 'about_image_url', label: 'Photo', type: 'image', default: UNSPLASH('1709837167684-47d7ccf0ed89') },
      { key: 'about_video_url', label: 'Video (optional)', type: 'video', default: 'https://videos.pexels.com/video-files/6576502/6576502-uhd_1440_2560_24fps.mp4', help: 'Plays silently on a loop beside your story. Leave empty to hide.' },
      { key: 'about_stats', label: 'Numbers to show off', type: 'lines', default: '500+|cakes baked\n5|years in business\n18|Abuja areas we deliver to', help: 'One per line, written as Number|Label. Leave empty to hide.' },
      { key: 'about_values_title', label: 'Values title', type: 'text', default: 'What you can count on' },
      { key: 'about_values', label: 'Values', type: 'lines', default: 'Fresh, every time|Nothing sits on a shelf. We bake your order for your date.\nMade the way you want|Your colours, your message, your flavour. Just ask.\nOn time, on budget|We confirm your total before we start, and deliver when we say we will.', help: 'One per line, written as Title|Description.' },
      { key: 'about_cta_title', label: 'Closing title', type: 'text', default: 'Let’s bake something for you' },
      { key: 'about_cta_body', label: 'Closing text', type: 'textarea', default: 'Browse the menu, or tell us about your occasion and we’ll send you a quote.' },
    ],
  },
  {
    id: 'gallery',
    title: 'Gallery page',
    description: 'The words on the Gallery page. Add and remove photos under Gallery in the menu.',
    fields: [
      { key: 'gallery_title', label: 'Title', type: 'text', default: 'Our work' },
      { key: 'gallery_intro', label: 'Intro text', type: 'textarea', default: 'Cakes, trays and treats we’ve made for birthdays, weddings, churches and offices across Abuja. See something you like? Ask us for a quote.' },
    ],
  },
  {
    id: 'quote',
    title: 'Quote form',
    description: 'The "Get a quote" form on the Contact page. Requests are saved under Quote requests and sent to your WhatsApp.',
    fields: [
      { key: 'quote_title', label: 'Title', type: 'text', default: 'Get a quote' },
      { key: 'quote_intro', label: 'Intro text', type: 'textarea', default: 'Tell us what you have in mind. We’ll reply on WhatsApp with a price, usually within a few hours.' },
      { key: 'quote_items', label: 'What can they ask for', type: 'lines', default: 'Cake\nCupcakes\nSmall chops\nPastries (meat pie, sausage rolls…)\nParty trays\nDrinks', help: 'One per line.' },
      { key: 'cake_shapes', label: 'Cake shapes', type: 'lines', default: 'Round\nSquare\nHeart\nRectangle (sheet cake)\nTiered (2 or more tiers)\nNumber or letter\nBento (mini)\nCustom or sculpted', help: 'One per line.' },
      { key: 'cake_flavours', label: 'Cake flavours', type: 'lines', default: 'Vanilla\nChocolate\nRed velvet\nStrawberry\nLemon\nCoconut\nFruit cake\nMix of flavours', help: 'One per line.' },
    ],
  },
  {
    id: 'careers',
    title: 'Careers page',
    description: 'The words on the Careers page. Add, open and close job openings under Careers in the menu.',
    fields: [
      { key: 'careers_title', label: 'Title', type: 'text', default: 'Bake with us' },
      { key: 'careers_intro', label: 'Intro text', type: 'textarea', default: 'We\u2019re a growing Abuja bakery, and we\u2019re always happy to meet people who love good food, work carefully and show up on time.' },
      { key: 'careers_perks', label: 'Why work with us', type: 'lines', default: 'Learn from experienced bakers\nFriendly, respectful team\nPaid on time, every month\nTreats on the house', help: 'One per line. Leave empty to hide.' },
      { key: 'careers_image_url', label: 'Photo', type: 'image', default: UNSPLASH('1709837167676-63c0750c6a4e') },
      { key: 'careers_closed_note', label: 'Message when there are no openings', type: 'textarea', default: 'We don\u2019t have any openings right now, but we\u2019d still love to hear from you. Send your details and we\u2019ll reach out when a role comes up.' },
    ],
  },
  {
    id: 'promo',
    title: 'Promo banner',
    description: 'A coloured strip at the very top of every page, for offers like Valentine\u2019s boxes or Christmas orders. Switch it off when the offer ends.',
    fields: [
      { key: 'promo_enabled', label: 'Show the promo banner', type: 'toggle', default: '' },
      { key: 'promo_text', label: 'Promo message', type: 'text', default: 'Christmas orders are open! Book your cakes and party trays early.' },
      { key: 'promo_link_label', label: 'Button text', type: 'text', default: 'Order now', help: 'Leave empty for no button.' },
      { key: 'promo_link', label: 'Button link', type: 'text', default: '/menu', help: 'A page on your site like /menu or /contact#quote, or a full web address.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQs',
    description: 'Common questions and answers. They appear on the FAQs page, and the first few on the homepage.',
    fields: [
      { key: 'faq_title', label: 'Title', type: 'text', default: 'Questions we get asked' },
      { key: 'faqs', label: 'Questions & answers', type: 'lines', default: 'How far ahead should I order?|Cakes need at least 3 days\u2019 notice, and wedding cakes 2 weeks or more. Small chops and pastries can be ready the same day if you order before 12 noon. For big events, book as early as you can.\nHow do I pay?|Card payment is coming soon. For now, pay by bank transfer to the account on our Contact page, then send your proof of payment on WhatsApp. We start work once payment is confirmed.\nDo you need a deposit for big orders?|Yes. Event and wedding orders are confirmed with a deposit, and the balance is due before delivery or pickup. We tell you the exact amounts when we send your quote.\nDo you deliver?|Yes, anywhere in Abuja. The fee depends on your area. See the list on our Contact page. Pickup is free.\nCan I send a picture of the cake I want?|Please do! Fill in the quote form, then send the picture on WhatsApp. We\u2019ll tell you if we can make it, and the price.\nCan I change or cancel my order?|Message us at least 48 hours before your date and we\u2019ll do our best. See our Terms & refunds page for details on deposits and cancellations.\nDo you make eggless, sugar-free or other special cakes?|Ask us about what you need when you request a quote, and we\u2019ll tell you honestly what we can do. Please always tell us about allergies.', help: 'One per line, written as Question|Answer.' },
    ],
  },
  {
    id: 'policies',
    title: 'Terms & refunds',
    description: 'Your order terms. Edit them to match how you run your business. Start a heading with ## on its own line.',
    fields: [
      { key: 'terms_title', label: 'Title', type: 'text', default: 'Terms & refunds' },
      { key: 'terms_body', label: 'Terms', type: 'textarea', default: '## Orders\nYour order is confirmed once we have agreed the details and total with you, and received payment (or a deposit for event orders).\n\n## Payment\nWe accept bank transfer. Please send your proof of payment on WhatsApp. Work on your order starts once payment is confirmed. Card payment is coming soon.\n\n## Deposits for events\nWedding, event and large orders need a deposit to secure your date. The balance is due before delivery or pickup.\n\n## Changes and cancellations\nYou can change your order up to 48 hours before your date, as long as we have not started on it. If you cancel more than 7 days before your date, we refund your payment minus any costs already spent on your order. Cancellations within 7 days are not refunded, because ingredients and time are already committed.\n\n## Delivery and pickup\nPlease be available on the phone number you gave us on the day. Delivery times are estimates, as Abuja traffic can cause delays. Once a cake is handed over, please keep it cool, flat and out of the sun.\n\n## Damage\nCheck your order when you receive it. If something is wrong, send us a photo on WhatsApp within 2 hours and we will make it right.\n\n## Allergies\nOur kitchen uses eggs, milk, wheat, nuts and soy. Please tell us about any allergies before you order.\n\n## Designs\nHandmade cakes may differ slightly from photos or reference pictures. Colours can look different on screens.' },
    ],
  },
  {
    id: 'ordering',
    title: 'Payment & delivery',
    description: 'How customers pay and get their order. Shown on product pages, the Contact page, the quote form and the footer.',
    fields: [
      { key: 'payment_note', label: 'How to pay', type: 'textarea', default: 'Card payment (Paystack) is coming soon. For now, please pay by bank transfer to the account below, then send your proof of payment on WhatsApp. We start work once your payment is confirmed.' },
      { key: 'bank_name', label: 'Bank name', type: 'text', default: '' },
      { key: 'bank_account_name', label: 'Account name', type: 'text', default: '' },
      { key: 'bank_account_number', label: 'Account number', type: 'text', default: '' },
      { key: 'delivery_note', label: 'How delivery works', type: 'textarea', default: 'Pick up from us for free, or we deliver anywhere in Abuja. The delivery fee depends on your area and is added to your total. Please be reachable on the phone number you give us on the day.' },
      { key: 'order_note', label: 'Note shown on every product', type: 'textarea', default: 'Cakes need at least 3 days’ notice. Small chops and pastries can be ready the same day if you order before 12 noon.' },
      { key: 'booking_deposit_percent', label: 'Event booking deposit (%)', type: 'number', default: '50', help: 'Share of the quoted price paid to confirm a big event order.' },
      { key: 'paystack_enabled', label: 'Accept card payments with Paystack at checkout', type: 'toggle', default: '', help: 'Only switch this on after your Paystack secret key has been added to Cloudflare (your web developer does this once). Bank transfer is always available.' },
      { key: 'transfer_enabled', label: 'Accept bank transfer at checkout', type: 'toggle', default: '1', help: 'Customers transfer, then upload their proof of payment. You confirm it under Orders.' },
    ],
  },
  {
    id: 'receipt',
    title: 'Receipts',
    description: 'The wording on receipts you send to customers.',
    fields: [
      { key: 'receipt_thanks', label: 'Thank-you message', type: 'textarea', default: 'Thank you for choosing Miel Cakes! We truly appreciate you reaching out to us, and we hope every bite makes your day sweeter.' },
      { key: 'receipt_footer', label: 'Small print', type: 'textarea', default: 'Please keep this receipt for your records. For changes to your order, message us on WhatsApp at least 48 hours before your date.' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'The bottom of every page.',
    fields: [
      { key: 'footer_note', label: 'Footer text', type: 'textarea', default: 'Freshly baked cakes, small chops and pastries for every occasion. Pickup and delivery across Abuja.' },
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

/** "Group|a, b, c" lines → [{ group, items }] */
export function parseOccasions(value: string | undefined) {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [group, list = ''] = l.split('|')
      return {
        group: group.trim(),
        items: list
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    })
    .filter((g) => g.group)
}
