# Miel Cakes

Website and admin dashboard for **Miel Cakes**, a bakery in Abuja selling cakes, small chops, pastries, snacks and drinks.

Built by Emadex Creations on TanStack Start + Cloudflare Workers, D1 (database) and R2 (photos and videos). It runs on Cloudflare's free tier, so there are no monthly hosting costs.

## What's in this build

**Website**
- Taller header with a navy contact bar (phone, WhatsApp, socials, a short message), plus Menu, Gallery, About, Contact, **Get a quote** and **Order now**
- Homepage: looping video, animated headline with icing underline, rotating "Fresh in Abuja today" line, scrolling strip, categories, favourites, **occasions grouped by type** (Celebrations, Weddings & love, Family moments, Faith & festive, Work & events), recent work from the gallery, how-it-works steps, event banner and delivery areas
- Menu with category filters; product pages with sizes, quantity, cake message, **Add to cart** (sprinkle burst) and Order on WhatsApp
- **Online ordering**: customer sign-up/sign-in (needed to add to cart), cart, checkout with pickup or delivery (area fee added), date picker that respects notice days and fully booked dates, and payment by **Paystack** (card/bank/USSD) or **bank transfer with proof-of-payment upload**
- **Order tracking**: customers see an animated progress bar (placed → payment confirmed → baking → ready → out for delivery → delivered) on their order page, or at **/track** with order number + phone, no sign-in needed
- Customer account page: order history, edit details, change password
- **Gallery** page: filter by occasion, tap a photo to enlarge
- About page: story, photo, video, numbers, values and closing section, all editable, and empty boxes hide their section
- **Careers** page: open jobs with details, and an application form (with optional CV upload). A general application works even when no job is open
- Contact page: details, searchable Abuja delivery fees and a full **Get a quote** form (occasion, date, guests, budget, what they want; for cakes: shape, size or tiers, flavour, colours, message; pickup or delivery). The request is saved to the dashboard, then sent to WhatsApp with everything filled in, or by email
- **How to pay** everywhere: Paystack is marked as coming soon; pay by bank transfer, send proof on WhatsApp, and work starts once payment is confirmed
- **Customer reviews** on the homepage (hidden until real reviews are added), **FAQs** section and page, **Terms & refunds** page
- **Promo banner** at the top of every page, switched on and off from the dashboard
- **Floating WhatsApp button** on every page
- Link previews for WhatsApp, Facebook and X (image, title, description), plus `/sitemap.xml` and `/robots.txt` for Google
- Taller footer: how-to-pay strip with bank details and "Send proof of payment", quick links, occasions, contact and hours
- Blue, yellow and a touch of red, with a **button hover colour** you choose

**Admin dashboard** at `/admin`
- **Orders**: filter by what needs action, view proof of payment, confirm payment, move orders along (the customer's tracking updates), send the update on WhatsApp, reset a customer's password, create a receipt from the order, download for Excel
- **Fully booked dates** (under Delivery areas): customers can't pick them at checkout
- Overview: orders to handle, new quote requests, money received this month, customers, menu, and a getting-ready checklist
- **Quote requests**: status (New, Contacted, Price sent, Confirmed, Declined), private notes, reply on WhatsApp, save as a customer, turn into a receipt, download for Excel
- **Receipts**: create with items, delivery, discount and amount paid; send on **WhatsApp** or **email** with a thank-you message and a private link; **print or save as PDF**; monthly totals, what's still owed, download for Excel
- **Reviews**: add real customer reviews with stars and an optional photo, show or hide each one
- **Careers**: post jobs (title, type, pay, duties, requirements), open or close them, review applications by status (New, Shortlisted, Interview, Hired, Not selected), download CVs, message applicants on WhatsApp or email, private notes, download for Excel
- **Customers**: add or edit details (phone, email, area, address, birthday, notes), see receipts and total paid per customer, WhatsApp them, **download for Excel** or **print the list**
- Menu items, categories, **gallery** (bulk upload with occasion tags), website content, occasions, quote-form options, delivery areas, photos & videos
- Settings & colours: main, hover, hover text, second colour, touch of red, dark and background, with a live preview. Also contact details, bank details, payment and delivery wording, and receipt wording
- Staff accounts and password

## Coming next

| Phase | What it adds |
|---|---|
| 2 | Customer sign-up and login, cart (login required to add to cart) |
| 3 | Checkout with Paystack and bank transfer, pickup or delivery with area fee, admin order management |
| 4 | Event bookings: date, guests and items; admin sends a quote; customer pays deposit via Paystack; blocked dates |
| 5 | Order tracking page with animated progress, email and dashboard alerts, final polish |

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

It goes live at `https://miel-cakes.<your-subdomain>.workers.dev`.

**Right after the first deploy, open `/admin/setup` on the live site and create the owner account.** The setup page only works until one account exists.

For a custom domain later, go to Cloudflare dashboard → Workers → miel-cakes → Settings → Domains & Routes.

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

## Updating an existing install

When an update adds a file in `migrations/`, apply it before running the new code:

```powershell
npm run db:migrate:local     # your computer
npm run db:migrate:remote    # the live site, before npm run deploy
```
