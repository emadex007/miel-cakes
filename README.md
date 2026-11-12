# Miel Cakes

Website and admin dashboard for **Miel Cakes**, a bakery in Abuja selling cakes, small chops, pastries, snacks and drinks.

Built by Emadex Creations on TanStack Start + Cloudflare Workers, D1 (database) and R2 (photos and videos). It runs on Cloudflare's free tier, so there are no monthly hosting costs.

## What's in this build

**Website**
- Taller header with a navy contact bar (phone, WhatsApp, socials, a short message), plus Menu, Gallery, About, Contact, **Get a quote** and **Order now**
- Homepage, in this order: (1) hero with a signature cake photo (or optional video), menu and WhatsApp buttons; (2) shop by category; (3) customer favourites with starting prices; (4) why choose Miel Cakes, with reasons, a short story and review rating; (5) ready-to-go and everyday treats (items available daily); (6) corporate and event catering with a short list of popular occasions; (7) gallery and customer reviews; (8) how to order and FAQs; (9) location with map, opening hours, contact and a final call to action. Every section is edited under Website content → Homepage sections
- Header **search** and a **Menu dropdown** listing every category (also in the phone menu)
- Product cards with labels (**Hot**, **New**, **Kids**…), **Quick view** (choose size and quantity in a pop-up) and **Buy now** (straight to checkout)
- Homepage extras: "Cakes from ₦X" worked out from her cheapest cake, a free-gift perk line, extra rows by label (Popular cakes, New designs, Children's cakes), and a happy-deliveries counter that counts up
- **Privacy policy** page, plus X (Twitter) and LinkedIn links
- **Cake customiser** on cake pages: size, shape, flavour, layers, filling, icing, icing colour, decoration style and extras, topper, cake message, special instructions, occasion, quantity and a reference picture, with a live order summary (base cake + customisations = total). Choices and their extra prices are set in the dashboard; the server always recalculates the price. The details follow the cake into the cart, checkout, the order, the dashboard and the receipt
- Menu with category filters; product pages with sizes, quantity, cake message, **Add to cart** (sprinkle burst) and Order on WhatsApp
- **Online ordering**: customer sign-up/sign-in (needed to add to cart), cart, checkout with pickup or delivery (area fee added), date picker that respects notice days and fully booked dates, and payment by **Paystack** (card/bank/USSD) or **bank transfer with proof-of-payment upload**
- **Order tracking**: customers see an animated progress bar (placed → payment confirmed → baking → ready → out for delivery → delivered) on their order page, or at **/track** with order number + phone, no sign-in needed
- **Event bookings** (**/events**): customers describe their event (occasion, date, time, guests, what they want, a reference picture, venue area and address). The owner replies with an itemised quote and deposit; the customer pays the deposit (transfer with proof upload, or Paystack once on) to book the date, then the balance. They follow it all on their booking page with a progress bar and history
- **Delivery time slots** at checkout (set them under Settings → Payment & delivery) and a **daily order limit**: a date closes automatically once it has that many orders
- **Discount codes** at checkout; the server checks and recalculates every code
- **Rate your order:** once an order is completed, the customer can leave stars and a review on their order page; it shows on the website after the owner switches it on under Reviews. The "Delivered/Collected" WhatsApp message includes the link
- **Track by booking number too:** /track works for MC- orders and MB- event bookings with the phone number, no sign-in needed
- **Google:** bakery details and product prices as structured data for search results, plus optional free Cloudflare Web Analytics (Settings → Sharing & Google)
- Customer account page: event bookings, order history, edit details, change password
- **Gallery** page: filter by occasion, tap a photo to enlarge
- About page: story, photo, video, numbers, values and closing section, all editable, and empty boxes hide their section
- **Careers** page: open jobs with details, and an application form (with optional CV upload). A general application works even when no job is open
- Contact page: details, searchable Abuja delivery fees and a full **Get a quote** form (occasion, date, guests, budget, what they want; for cakes: shape, size or tiers, flavour, colours, message; pickup or delivery). The request is saved to the dashboard, then sent to WhatsApp with everything filled in, or by email
- **How to pay** everywhere: Paystack is marked as coming soon; pay by bank transfer, send proof on WhatsApp, and work starts once payment is confirmed
- **Customer reviews** on the homepage (hidden until real reviews are added), **FAQs** section and page, **Terms & refunds** page
- **Promo banner** at the top of every page, switched on and off from the dashboard
- **Live chat** on every page: visitors leave their name (and phone or email) and chat with you right on the website. You reply from the dashboard. Shows "Online now" while the dashboard is open, and WhatsApp is offered as an option inside the chat. Switch it off to show the floating WhatsApp button instead
- Link previews for WhatsApp, Facebook and X (image, title, description), plus `/sitemap.xml` and `/robots.txt` for Google
- Taller footer: how-to-pay strip with bank details and "Send proof of payment", quick links, occasions, contact and hours
- Blue, yellow and a touch of red, with a **button hover colour** you choose

**Admin dashboard** at `/admin`
- **Alerts:** red counts in the menu for new orders, event bookings, quote requests, job applications, reviews and chat messages, with a soft ding and a count in the browser tab (checked every 20 seconds)
- **Staff permissions:** staff accounts handle orders, bookings, chat, quotes, the menu, gallery, reviews and photos. Only the owner can open receipts and money, customers, discount codes, careers, website content, delivery areas and settings (enforced on the server too)
- **Discount codes:** % or ₦ off, minimum order, total number of uses, start and end dates, switch on/off, and how much each code has given away
- **Live chat**: every conversation with unread counts (also shown in the menu), a sound and tab count when new messages arrive, reply, mark as done, save the person to Customers, follow up on WhatsApp
- **Orders**: filter by what needs action, view proof of payment, confirm payment, move orders along (the customer's tracking updates), send the update on WhatsApp, reset a customer's password, create a receipt from the order, download for Excel
- **Event bookings**: filter by what needs action, see the request and reference picture, send an itemised **quote with a deposit** (filled in from your usual %), check proof of payment and confirm it, record cash/POS/transfer payments (part payments are fine), book the date, mark completed, decline or cancel, message the customer on WhatsApp with the right wording for each stage, private notes, create a receipt from the booking, download for Excel
- **Fully booked dates** (under Delivery areas): customers can't pick them at checkout or for event bookings
- Overview: orders to handle, event bookings to handle, new quote requests, money received this month, customers, menu, and a getting-ready checklist
- **Quote requests**: status (New, Contacted, Price sent, Confirmed, Declined), private notes, reply on WhatsApp, save as a customer, turn into a receipt, download for Excel
- **Receipts**: create with items, delivery, discount and amount paid; send on **WhatsApp** or **email** with a thank-you message and a private link; **print or save as PDF**; monthly totals, what's still owed, download for Excel
- **Reviews**: add real customer reviews with stars and an optional photo, show or hide each one
- **Careers**: post jobs (title, type, pay, duties, requirements), open or close them, review applications by status (New, Shortlisted, Interview, Hired, Not selected), download CVs, message applicants on WhatsApp or email, private notes, download for Excel
- **Customers**: add or edit details (phone, email, area, address, birthday, notes), see receipts and total paid per customer, WhatsApp them, **download for Excel** or **print the list**
- Menu items, categories, **gallery** (bulk upload with occasion tags), website content, occasions, quote-form options, delivery areas, photos & videos
- Settings & colours: main, hover, hover text, second colour, touch of red, dark and background, with a live preview. Also contact details, bank details, payment and delivery wording, and receipt wording
- Staff accounts and password

## Ideas for later

- Email alerts to the owner for new orders and bookings
- Connect a custom domain (for example mielcakes.com.ng)

---

## Set up on your computer (Windows)

Use **Node 22.12 or newer** for everything in this project, the same as SpiritualGym (TanStack Start and Wrangler require it). Package versions match SpiritualGym's.

```powershell
nvm use 22
cd C:\Users\LENOVO\Documents\GitHub\miel-cakes
npm install
```

### 1. Create the Cloudflare database and storage

```powershell
npx wrangler login
npx wrangler d1 create miel_cakes_db
```

Copy the `database_id` it prints and paste it into `wrangler.toml`, replacing `PASTE_YOUR_D1_DATABASE_ID_HERE`.

```powershell
npx wrangler r2 bucket create miel-cakes-media
```

If Wrangler says R2 isn't enabled, open the Cloudflare dashboard, go to **R2**, and turn it on. The free tier includes 10 GB.

### 2. Load the tables and starter menu

```powershell
npm run db:migrate:local
```

This creates all tables, plus 7 categories, 24 menu items, 18 Abuja delivery areas and 12 sample gallery photos. **Prices and delivery fees are samples.** Edit them in the dashboard.

### 3. Run it

```powershell
npm run dev
```

Open http://localhost:3000. Then open http://localhost:3000/admin/setup to create the owner account.

`src/routeTree.gen.ts` is created automatically the first time you run `npm run dev` or `npm run build`.

## Deploy

```powershell
npm run db:migrate:remote
npm run deploy
```

The live site is **https://mielcakes.com**. `www.mielcakes.com` and the old `miel-cakes.emadexcreations.workers.dev` address redirect there (see `routes`, `workers_dev` and `CANONICAL_HOST` in `wrangler.toml`).

**Right after the first deploy, open `/admin/setup` on the live site and create the owner account.** The setup page only works until one account exists.

Deploys must come from the Cloudflare account **Emadexcreations@gmail.com's Account** (`723bc041…`). If a deploy fails with "Authentication error", Wrangler is logged in to another account: run `npx wrangler logout`, delete `node_modules\.cache\wrangler`, then `npx wrangler login` and pick that account.

## Push to GitHub

Create an empty repo called `miel-cakes` on GitHub (no README), then:

```powershell
git init
git add .
git commit -m "Miel Cakes phase 1: website, menu and admin dashboard"
git branch -M main
git remote add origin https://github.com/emadex007/miel-cakes.git
git push -u origin main
```

## Photos and videos

The starter photos and videos are real stock from [Unsplash](https://unsplash.com/license) and [Pexels](https://www.pexels.com/license/). Both licences allow free commercial use, and credit isn't required. They load from those sites until they're replaced. The owner's own photos (uploaded under **Photos & videos**, or straight from a menu item) will sell better. The dashboard checklist counts how many items still use sample photos.

## Project layout

```
migrations/          D1 schema (all phases) and starter menu
src/lib/site-fields.ts   every editable setting, which also builds the admin forms
src/server.ts        Worker entry: serves /media/ files (with video range support), admin uploads, job applications and private CV downloads, then hands off to TanStack
src/server/          database, auth and settings helpers (server only)
src/fns/             server functions for the website and the admin dashboard
src/routes/          pages: /, /menu, /menu/$slug, /about, /contact, /admin/*
src/components/      header, footer, animations, product card, admin UI
```

## Turning on Paystack

Bank transfer works out of the box. To accept cards too:

1. In the Paystack dashboard, go to **Settings → API Keys & Webhooks** and copy the **secret key** (`sk_live_...`, or `sk_test_...` to test first).
2. Add it to Cloudflare. It's never stored in the code or database:
   ```powershell
   npx wrangler secret put PAYSTACK_SECRET_KEY
   ```
   For testing on your computer, create a file called `.dev.vars` in the project folder containing `PAYSTACK_SECRET_KEY=sk_test_...` (it's git-ignored).
3. In Paystack, set the **Webhook URL** to `https://YOUR-SITE/api/webhooks/paystack`. This confirms payments even if a customer closes the page after paying.
4. In the dashboard, go to **Settings & colours → Payment & delivery** and switch on **Accept card payments with Paystack**. Also update the "How to pay" text, which currently says card payment is coming soon.

The same switch turns on card payment for event booking deposits and balances. The one webhook URL handles both orders and bookings.

## Turning on emails (Resend)

Order alerts to your inbox, order updates to customers, and festive emails all go through [Resend](https://resend.com) (free: 100 emails a day, 3,000 a month).

1. Create a free account at resend.com.
2. **Domains → Add domain** → `mielcakes.com`. Choose **Sign in to Cloudflare** so Resend adds its DNS records for you (or copy them into Cloudflare → DNS). Wait for **Verified**.
3. **API Keys → Create API key** (Sending access), copy it, then:
   ```powershell
   npx wrangler secret put RESEND_API_KEY
   ```
4. In the dashboard: **Settings & colours → Alerts & emails**: put the email that should get order alerts. Then **Alerts & emails** in the menu → **Send me a test email**.

Festive emails go out in daily batches (about 80 a day, set in Settings) so order emails always have room. A daily schedule in `wrangler.toml` (`[triggers]`) sends the next batch at about 9:17am Abuja time.

## Phone alerts

Nothing to set up on Cloudflare: the site makes its own notification keys the first time. On each phone: open the dashboard → **Alerts & emails** → **Turn on alerts on this phone**. On iPhone, first add the dashboard to the Home Screen (Share → Add to Home Screen) and open it from there; Apple only allows website alerts that way.

## Updating an existing install

Updates arrive through GitHub. To get one:

```powershell
git pull
npm run db:migrate:remote    # only when the update adds a file in migrations/
npm run deploy
```

If you change files yourself, commit and push them first (`git add -A`, `git commit -m "..."`, `git push`) so your changes and new updates don't clash.


When an update adds a file in `migrations/`, apply it before running the new code:

```powershell
npm run db:migrate:local     # your computer
npm run db:migrate:remote    # the live site, before npm run deploy
```
