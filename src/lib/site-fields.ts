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
      { key: 'cf_analytics_token', label: 'Cloudflare Web Analytics token (optional)', type: 'text', default: '', help: 'Free visitor statistics. In Cloudflare, open Analytics & Logs, then Web Analytics, add your site, and paste the token from the snippet here (the text after "token":). Leave empty to switch off.' },
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
      { key: 'address', label: 'Pickup address', type: 'textarea', default: 'Asokoro, Abuja, FCT' },
      { key: 'opening_hours', label: 'Opening hours', type: 'lines', default: 'Mon – Fri: 8am – 7pm\nSat: 9am – 6pm\nSun: Orders only', help: 'One line per row.' },
      { key: 'topbar_note', label: 'Top bar message', type: 'text', default: 'Order cakes 3 days ahead · Same-day small chops if you order before 12 noon', help: 'The thin bar at the very top of every page. Leave empty to hide the message.' },
      { key: 'instagram', label: 'Instagram link', type: 'url', default: '' },
      { key: 'facebook', label: 'Facebook link', type: 'url', default: '' },
      { key: 'tiktok', label: 'TikTok link', type: 'url', default: '' },
      { key: 'twitter', label: 'X (Twitter) link', type: 'url', default: '' },
      { key: 'linkedin', label: 'LinkedIn link', type: 'url', default: '' },
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
      { key: 'hero_price_text', label: 'Price line', type: 'text', default: 'Cakes from {price}', help: '{price} becomes your cheapest cake price automatically. Leave empty to hide.' },
      { key: 'perk_text', label: 'Free gift / perk', type: 'text', default: 'Free candles with every cake', help: 'A little extra every order gets. Shown on the homepage, product pages and at checkout. Leave empty to hide.' },
      { key: 'hero_subtitle', label: 'Text under headline', type: 'textarea', default: 'Birthdays, weddings, naming ceremonies, church and office events. Order for pickup or delivery anywhere in Abuja, or ask us for a quote.' },
      { key: 'hero_image_url', label: 'Main photo', type: 'image', default: UNSPLASH('1606983340126-99ab4feaa64a'), help: 'Your best signature cake photo. A wide, bright photo works best (at least 1600 pixels wide).' },
      { key: 'hero_video_url', label: 'Background video (optional)', type: 'video', default: '', help: 'Plays instead of the photo. Short, silent loop; MP4 under 15 MB loads best on phones. Leave empty to show the photo.' },
    ],
  },
  {
    id: 'home',
    title: 'Homepage sections',
    description: 'The homepage, from top to bottom: categories, favourites, why choose us, ready-to-go treats, catering, gallery and reviews, how to order, and your location. Leave a text box empty to hide that part.',
    fields: [
      { key: 'home_categories_title', label: '2. Categories title', type: 'text', default: 'Shop by category' },
      { key: 'home_featured_title', label: '3. Favourites title', type: 'text', default: 'Customer favourites', help: 'Shows up to 4 items marked "Featured" under Menu items.' },
      { key: 'home_collections', label: '3. Extra product rows', type: 'lines', default: 'Hot|Popular cakes\nNew|New designs\nKids|Children\u2019s cakes', help: 'One row per line, written as Label|Row title. Give products that label under Menu items and they appear in the row. Rows with no products stay hidden.' },
      { key: 'home_counter_label', label: '4. Counter label', type: 'text', default: 'Happy deliveries', help: 'A number that counts up on the homepage. Leave empty to hide.' },
      { key: 'home_counter_start', label: '4. Counter: orders before the website', type: 'number', default: '500', help: 'Added to the orders completed on the website, so the number starts from your real track record.' },
      { key: 'home_why_title', label: '4. "Why choose us" title', type: 'text', default: 'Why choose Miel Cakes?' },
      { key: 'home_why_story', label: '4. Short story', type: 'textarea', default: 'Miel Cakes is a home bakery in Asokoro, Abuja. Every cake, tray and pastry is made fresh for your date, finished by hand, and delivered when we say it will be.' },
      { key: 'home_why_points', label: '4. Reasons', type: 'lines', default: 'Baked fresh for your date|Nothing sits on a shelf. We bake every order for the day you need it.\nMade the way you want|Your colours, your message, your flavour. Send a picture and we\u2019ll match it.\nOn time, every time|Pickup or delivery anywhere in Abuja, at the time we agree.\nClear prices|Starting prices on every item, and your full total before you pay.', help: 'One per line, written as Title|Description. Up to 4 look best.' },
      { key: 'home_why_image', label: '4. Photo', type: 'image', default: UNSPLASH('1709837167684-47d7ccf0ed89') },
      { key: 'home_ready_title', label: '5. Ready-to-go title', type: 'text', default: 'Ready to go & everyday treats' },
      { key: 'home_ready_intro', label: '5. Ready-to-go text', type: 'textarea', default: 'Need something today? Small chops, pastries and snacks can be ready the same day if you order before 12 noon.', help: 'Shows menu items set to "Available daily" (not pre-order). Leave the title empty to hide this section.' },
      { key: 'event_title', label: '6. Catering title', type: 'text', default: 'Corporate and event catering' },
      { key: 'event_body', label: '6. Catering text', type: 'textarea', default: 'Office events, weddings, church programmes and parties. Tell us your date and number of guests, and we\u2019ll put together the cake, small chops trays, pastries and drinks, with a full quotation.' },
      { key: 'home_catering_points', label: '6. What you offer', type: 'lines', default: 'Small chops and pastry trays for 20 to 500 guests\nWedding and celebration cakes, designed with you\nBranded cakes and treats for offices and launches\nDelivery and set-up at your venue', help: 'One per line.' },
      { key: 'home_occasion_links', label: '6. Occasion links', type: 'lines', default: 'Birthdays|/gallery?o=Birthdays\nWeddings|/gallery?o=Weddings\nChurch events|/gallery?o=Church%20events\nCorporate orders|/events', help: 'A short list of the occasions you want to highlight, written as Label|Link. Keep it to 4 or 5. Your full list of occasions is under Occasions.' },
      { key: 'event_image_url', label: '6. Catering photo', type: 'image', default: PEXELS_IMG('39660402') },
      { key: 'home_gallery_title', label: '7. Gallery & reviews title', type: 'text', default: 'Our work & happy customers' },
      { key: 'home_steps', label: '8. How to order steps', type: 'lines', default: 'Choose your treats|Browse the menu and add to cart, or ask for a quote for a custom cake or event.\nPick your date|Choose pickup or delivery and the day you need it. Cakes need 3 days\u2019 notice.\nPay securely|Pay by bank transfer and upload your proof. We start as soon as it\u2019s confirmed.\nTrack your order|Follow every step online, from baking to delivery.', help: 'One step per line, written as Title|Description.' },
      { key: 'home_location_title', label: '9. Location title', type: 'text', default: 'Visit our Asokoro studio' },
      { key: 'home_location_body', label: '9. Location text', type: 'textarea', default: 'Pick up your order, or come and talk to us about your event. Please message us before you visit.' },
      { key: 'home_map_query', label: '9. Map location', type: 'text', default: 'Asokoro, Abuja', help: 'What to search on Google Maps, e.g. your business name and street. Leave empty to hide the map.' },
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
    title: 'Terms, refunds & privacy',
    description: 'Your order terms, refund rules and privacy policy. Edit them to match how you run your business. Start a heading with ## on its own line.',
    fields: [
      { key: 'terms_title', label: 'Title', type: 'text', default: 'Terms & refunds' },
      {
        key: 'checkout_terms',
        label: 'Short terms shown at checkout',
        type: 'lines',
        help: 'One point per line. Customers see these in a box at checkout and must tick “I agree” before ordering.',
        default:
          'Your order is confirmed once payment is received.\nYou can change your order up to 48 hours before your date, if we have not started on it.\nCancel more than 7 days before your date and we refund you, minus costs already spent. Cancellations within 7 days are not refunded.\nHandmade cakes may differ slightly from photos and reference pictures.\nTell us about any allergies. Our kitchen uses eggs, milk, wheat, nuts and soy.\nCheck your order when it arrives. Send us a photo within 2 hours if anything is wrong.',
      },
      { key: 'privacy_title', label: 'Privacy policy title', type: 'text', default: 'Privacy policy' },
      { key: 'privacy_body', label: 'Privacy policy', type: 'textarea', default: '## What we collect\nWhen you order, book an event, ask for a quote, chat with us or apply for a job, we collect the details you give us: your name, phone number, email, delivery address and the details of your order.\n\n## How we use it\nWe use your details only to make and deliver your order, contact you about it, send receipts, and answer your questions. We do not sell or share your details with anyone else, except a delivery rider who needs your address and phone number on the day.\n\n## Payments\nBank transfers go straight to our bank account. Card payments are handled securely by Paystack; we never see or store your card details.\n\n## Proof of payment and files\nScreenshots, receipts, pictures and CVs you upload are stored privately and only our team can see them.\n\n## Your account\nYour password is stored securely and we cannot see it. You can update your details on your account page at any time.\n\n## Keeping or deleting your details\nWe keep order records for our accounts. To have your details removed, message us and we will delete what we do not need to keep by law.\n\n## Contact\nQuestions about your privacy? Message us on WhatsApp or through the chat on our website.' },
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
      { key: 'delivery_slots', label: 'Delivery / pickup time slots', type: 'lines', default: 'Morning (9am – 12pm)\nAfternoon (12pm – 4pm)\nEvening (4pm – 7pm)', help: 'One per line. Customers choose one at checkout. Leave empty to only ask for the date.' },
      { key: 'daily_order_limit', label: 'Most orders you can take in one day', type: 'number', default: '0', help: 'When a date reaches this many orders, it closes at checkout automatically. 0 = no limit. You can still block dates by hand under Delivery areas.' },
      { key: 'paystack_enabled', label: 'Accept card payments with Paystack at checkout', type: 'toggle', default: '', help: 'Only switch this on after your Paystack secret key has been added to Cloudflare (your web developer does this once). Bank transfer is always available.' },
      { key: 'transfer_enabled', label: 'Accept bank transfer at checkout', type: 'toggle', default: '1', help: 'Customers transfer, then upload their proof of payment. You confirm it under Orders.' },
    ],
  },
  {
    id: 'notifications',
    title: 'Alerts & emails',
    description:
      'How you hear about new orders, and the emails customers get. Phone alerts are switched on per phone under Alerts & emails in the menu. Emails need a free Resend account (see the setup steps on that page).',
    fields: [
      { key: 'alert_email', label: 'Send order alerts to this email', type: 'text', default: '', help: 'Leave empty to use the email in Contact details.' },
      { key: 'email_alerts_enabled', label: 'Email me about new orders, bookings, quote requests and chats', type: 'toggle', default: '1' },
      { key: 'push_enabled', label: 'Phone alerts', type: 'toggle', default: '1', help: 'A notification on every phone where you tapped “Turn on alerts on this phone”.' },
      { key: 'customer_emails_enabled', label: 'Email customers about their orders and bookings', type: 'toggle', default: '1', help: 'Order received, payment confirmed, baking, ready, out for delivery, quote ready, and so on.' },
      { key: 'email_from', label: 'Emails come from', type: 'text', default: 'orders@mielcakes.com', help: 'Must be on the domain you verified with Resend.' },
      { key: 'email_daily_limit', label: 'Most emails per day', type: 'number', default: '100', help: 'Resend’s free plan allows 100 a day and 3,000 a month.' },
      { key: 'campaign_daily_count', label: 'Festive emails sent per day', type: 'number', default: '80', help: 'Festive emails go out in daily batches of this size. The rest of the daily allowance is kept for order emails.' },
    ],
  },
  {
    id: 'customizer',
    title: 'Cake customiser',
    description: 'The choices customers make on a cake\u2019s page (switch it on per cake under Menu items). Write one choice per line as Name|extra price. The first line is the default, so give it 0. Leave a list empty to hide it.',
    fields: [
      { key: 'custom_title', label: 'Title', type: 'text', default: 'Customise your cake' },
      { key: 'custom_intro', label: 'Intro text', type: 'textarea', default: 'Create a cake that\u2019s perfect for your special occasion.' },
      { key: 'custom_shapes', label: 'Shapes', type: 'lines', default: 'Round|0\nSquare|0\nHeart|3000\nRectangle (sheet)|5000\nNumber or letter|10000' },
      { key: 'custom_flavours', label: 'Flavours', type: 'lines', default: 'Vanilla|0\nChocolate|0\nRed velvet|3000\nStrawberry|2000\nLemon|2000\nCoconut|2000\nFruit cake|8000\nMix of flavours|3000' },
      { key: 'custom_layers', label: 'Layers', type: 'lines', default: '1 layer|0\n2 layers|8000\n3 layers|15000' },
      { key: 'custom_fillings', label: 'Fillings', type: 'lines', default: 'No filling|0\nButtercream|0\nChocolate ganache|4000\nFresh cream & fruit|5000\nCaramel|3000' },
      { key: 'custom_icings', label: 'Icing / frosting', type: 'lines', default: 'Buttercream|0\nWhipped cream|2000\nChocolate ganache|5000\nFondant|10000' },
      { key: 'custom_decorations', label: 'Decoration styles', type: 'lines', default: 'Simple|0\nFloral|5000\nDrip & sprinkles|4000\nPremium (gold leaf, pearls)|10000' },
      { key: 'custom_toppers', label: 'Cake toppers', type: 'lines', default: 'None|0\nPrinted topper|3000\nAcrylic name topper|7000\nFigurine|10000' },
    ],
  },
  {
    id: 'events',
    title: 'Event bookings',
    description: 'The Events page, where customers book cakes and trays for weddings, parties and other events. You reply with a quote, and they pay a deposit to secure the date.',
    fields: [
      { key: 'events_title', label: 'Title', type: 'text', default: 'Book us for your event' },
      { key: 'events_intro', label: 'Intro text', type: 'textarea', default: 'Weddings, birthdays, naming ceremonies, church and office events. Tell us about your day, and we\u2019ll send you a quote for the cake, small chops trays, pastries and drinks.' },
      { key: 'events_image_url', label: 'Photo', type: 'image', default: PEXELS_IMG('39660402') },
      { key: 'events_steps', label: 'How booking works', type: 'lines', default: 'Tell us about your event|Your date, number of guests and what you would like. Add a picture if you have one.\nGet your quote|We reply with a full price breakdown, usually within a day.\nPay a deposit|Your date is booked once the deposit is in. Pay by transfer and upload your proof.\nWe bake, you celebrate|Pay the balance before the day. We deliver to your venue, or you pick up.', help: 'One step per line, written as Title|Description.' },
      { key: 'booking_min_days', label: 'Minimum notice (days)', type: 'number', default: '7', help: 'How far ahead customers must book. Anything sooner, they message you instead.' },
      { key: 'booking_deposit_percent', label: 'Usual deposit (%)', type: 'number', default: '50', help: 'Filled in for you when you send a quote. You can change it on each booking.' },
      { key: 'events_note', label: 'Note under the booking form', type: 'textarea', default: 'Sending a request doesn\u2019t commit you to anything. Your date is only booked once you accept our quote and pay the deposit.' },
    ],
  },
  {
    id: 'chat',
    title: 'Live chat',
    description: 'The chat button on every page. Visitors type a message, and you answer under Live chat in this dashboard. You show as "Online now" while the dashboard is open.',
    fields: [
      { key: 'chat_enabled', label: 'Show the live chat button', type: 'toggle', default: '1', help: 'When off, the green WhatsApp button shows instead.' },
      { key: 'chat_agent_name', label: 'Name shown in the chat', type: 'text', default: 'Miel', help: 'Your name or a team name, e.g. Favour. Customers see it at the top of the chat.' },
      { key: 'chat_agent_photo', label: 'Photo shown in the chat', type: 'image', default: '', help: 'Optional. A friendly face, or your logo. A small square photo works best.' },
      { key: 'chat_greeting', label: 'Welcome message', type: 'textarea', default: 'Hi, can I help you with your order? We reply very fast!' },
      { key: 'chat_popup', label: 'Pop the chat open a few seconds after a visitor arrives', type: 'toggle', default: '1', help: 'Shows the welcome message with a message box, like a friendly hello. Visitors can close it.' },
      { key: 'chat_on_left', label: 'Show the chat on the left side of the screen', type: 'toggle', default: '1', help: 'Off puts it on the right.' },
      { key: 'chat_title', label: 'Chat button label', type: 'text', default: 'Chat with us' },
      { key: 'chat_away_note', label: 'Message when you\u2019re away', type: 'textarea', default: 'We\u2019re away right now. Leave your message with your phone number and we\u2019ll get back to you as soon as we\u2019re back.' },
      { key: 'chat_show_whatsapp', label: 'Offer WhatsApp inside the chat too', type: 'toggle', default: '1' },
      { key: 'chat_bot_enabled', label: 'Quick-answer buttons', type: 'toggle', default: '1', help: 'Shows tap-to-answer questions (prices, delivery fees, how to order, track my order, opening hours). Answers come from your menu, delivery areas and settings, so they stay up to date.' },
      { key: 'chat_bot_intro', label: 'Text above the quick-answer buttons', type: 'text', default: 'Tap a question for a quick answer, or type your message to talk to us.' },
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
