# Miel Cakes

Website and admin dashboard for **Miel Cakes**, a bakery in Abuja selling cakes, small chops, pastries, snacks and drinks.

Built by Emadex Creations on TanStack Start + Cloudflare Workers, D1 (database) and R2 (photos and videos). It runs on Cloudflare's free tier, so there are no monthly hosting costs.

## What's in this build (Phase 1)

**Website**
- Homepage with a looping video background, animated headline (words rise in, and an icing line pipes under the highlighted words), rotating "Fresh in Abuja today" line, scrolling menu strip, categories, favourites, how-it-works steps, event banner and delivery areas
- Menu page with category filters
- Product pages with sizes, quantity, a cake-message box and an **Order on WhatsApp** button. It pre-fills the item, size and price, and bursts sprinkles when tapped
- About page with story, photo, video and gallery
- Contact & delivery page with a searchable list of Abuja delivery fees
- Scroll-in animations that switch off for visitors who turn off motion on their device

**Admin dashboard** at `/admin`
- Owner account setup, sign-in, staff accounts, change password
- Menu items: add, edit and delete, with sizes and prices, photo, daily or order-ahead with notice days, sold out on or off, and show on homepage
- Categories: add, edit, hide, reorder
- Website content: every headline, text, photo and video on the homepage and About page
- Settings: business name, logo, **brand colours** (the whole site recolours), contact and WhatsApp, social links, opening hours, bank details, booking deposit %
- Delivery areas: Abuja areas and fees
- Photos & videos: upload to R2 and copy links
- A getting-ready checklist on the overview page

The database already has tables for everything in later phases, so later updates won't need to reshape the data.

## Coming next

| Phase | What it adds |
|---|---|
| 2 | Customer sign-up and login, cart (login required to add to cart) |
| 3 | Checkout with Paystack and bank transfer, pickup or delivery with area fee, admin order management |
| 4 | Event bookings: date, guests and items; admin sends a quote; customer pays deposit via Paystack; blocked dates |
| 5 | Order tracking page with animated progress, email and dashboard alerts, final polish |

---

## Set up on your computer (Windows)

Use **Node 22** for everything in this project (Vite 7 needs Node 20.19+ or 22.12+).

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

Copy the `database_id` it prints and paste it into `wrangler.jsonc`, replacing `PASTE_YOUR_D1_DATABASE_ID_HERE`.

```powershell
npx wrangler r2 bucket create miel-cakes-media
```

If Wrangler says R2 isn't enabled, open the Cloudflare dashboard, go to **R2**, and turn it on. The free tier includes 10 GB.

### 2. Load the tables and starter menu

```powershell
npm run db:migrate:local
```

This creates all tables, plus 7 categories, 24 menu items and 18 Abuja delivery areas. **Prices and delivery fees are samples.** Edit them in the dashboard.

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
src/server/          database, auth and settings helpers (server only)
src/fns/             server functions for the website and the admin dashboard
src/routes/          pages: /, /menu, /menu/$slug, /about, /contact, /admin/*
src/routes/api.upload.tsx   upload to R2 (admin only)
src/routes/media.$.tsx      serves uploaded files, with video range support
src/components/      header, footer, animations, product card, admin UI
```

## Payments (Phase 3)

The Paystack **public** key goes in Settings. The **secret** key is never stored in the database. Add it as a Cloudflare secret:

```powershell
npx wrangler secret put PAYSTACK_SECRET_KEY
```
