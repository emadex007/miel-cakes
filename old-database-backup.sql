PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
INSERT INTO "categories" ("id","name","slug") VALUES(1,'Graphic Design','graphic-design');
INSERT INTO "categories" ("id","name","slug") VALUES(2,'Website Design','website-design');
INSERT INTO "categories" ("id","name","slug") VALUES(3,'App Development','app-development');
INSERT INTO "categories" ("id","name","slug") VALUES(4,'Social Media','social-media');
INSERT INTO "categories" ("id","name","slug") VALUES(5,'Video Editing','video-editing');
CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  image_urls TEXT,
  live_url TEXT,
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
, client_name TEXT, project_date TEXT, slug TEXT, client_logo_url TEXT);
INSERT INTO "portfolio_items" ("id","title","description","category","type","image_urls","live_url","featured","created_at","client_name","project_date","slug","client_logo_url") VALUES(1,'Emadex Creations Project','','Graphic Design','website','[{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786303069986-g3rr5u.jpg","type":"image"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786303100531-gkvn5s.jpg","type":"image"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786303113195-h79e8m.jpg","type":"image"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313562454-mythik.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313562658-y60gk5.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313562908-gu7jyj.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313563255-kkmv9y.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313563836-w2ehyy.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313563998-q1qiu8.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313564237-lneonn.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313564481-iy696l.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313564687-1p4yyl.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313564859-fg7t2g.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313565024-sdzgnf.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313565236-6znx2u.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786313565432-gmlc33.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460349489-0447q0.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460349656-ar3i92.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460349986-rt0ckq.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350113-2l4yeh.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350208-5nssg1.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350314-dweu0i.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350483-fsmbwz.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350628-b7cswp.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460350934-mr2f77.jpg","type":"image","category":"Website Development"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786460351030-rf0lcg.jpg","type":"image","category":"Website Development"}]','',1,'2026-08-09 19:18:39','Emadex Creations','2026-02-14','emadex-creations-project','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786312965659-0k0nu2.png');
INSERT INTO "portfolio_items" ("id","title","description","category","type","image_urls","live_url","featured","created_at","client_name","project_date","slug","client_logo_url") VALUES(2,'CENTERPOINTE FC INC.','','Graphic Design','website','[{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868041-7bjyop.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868233-g7qa1b.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868532-gfkzwt.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868652-ufzpml.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868790-95r5xj.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458868906-c16cwv.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458869006-ndzvys.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458869150-wvx4am.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458869489-6afdxr.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458869630-w0dvln.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458869757-njet0g.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458870080-eac6ck.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458870503-ea0vvl.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459067364-gkv35x.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459067478-0pluze.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459067626-zvsli1.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459067737-7ukllv.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459067892-h90doo.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786459068017-ash0pz.jpg","type":"image","category":"Graphic Design"}]','',1,'2026-08-11 14:39:24','CENTERPOINTE FC INC.','2025-01-01','centerpointe-fc-inc','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786458516286-ofg61e.png');
INSERT INTO "portfolio_items" ("id","title","description","category","type","image_urls","live_url","featured","created_at","client_name","project_date","slug","client_logo_url") VALUES(3,'Servelead Global','','Graphic Design','website','[{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674003101-2i8psh.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674003844-zc7zre.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674004152-knnfwm.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674004434-vjk0te.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674004674-urbsj7.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674005044-t81gph.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674005308-uhc61r.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674085636-m6kcjp.jpg","type":"image","category":"Graphic Design"},{"url":"https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787674085855-pplxps.jpg","type":"image","category":"Graphic Design"}]','',1,'2026-08-25 16:08:27','Servelead Global','2022-01-01','servelead-global','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1787673616999-9k9tkn.png');
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  cover_image TEXT,
  pinterest_url TEXT,
  social_url TEXT,
  published_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- owner, content_manager, graphic_designer, admin_staff
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
, avatar_url TEXT);
INSERT INTO "users" ("id","name","email","password_hash","role","active","created_at","avatar_url") VALUES(1,'Emadex Admin','emadexcreations@gmail.com','066e90c2679ea1efe83518c9924fdabe:70b0ce002972008e92014afe27a0b0fa2022d8fe431836e3622091cebc8bde53','owner',1,'2026-08-08 21:36:22','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786311382580-1bu6pg.jpg');
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT,
  image_url TEXT,
  items TEXT, -- JSON array of bullet points
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "services" ("id","name","slug","tagline","description","image_url","items","sort_order","created_at") VALUES(1,'Graphic Design','graphic-design','Identity systems that hold up everywhere.',NULL,NULL,'["Logo & brand identity","Print & packaging","Social media creative","Pitch decks & documents"]',1,'2026-08-07 17:38:08');
INSERT INTO "services" ("id","name","slug","tagline","description","image_url","items","sort_order","created_at") VALUES(2,'Website Development','website-development','Fast, modern sites built to convert.',NULL,NULL,'["Marketing & business sites","E-commerce","Landing pages","Performance & SEO"]',2,'2026-08-07 17:38:08');
INSERT INTO "services" ("id","name","slug","tagline","description","image_url","items","sort_order","created_at") VALUES(3,'App Development','app-development','Full-stack products, from idea to launch.',NULL,NULL,'["Web applications","Admin dashboards & CMS","API & database design","Ongoing maintenance"]',3,'2026-08-07 17:38:08');
INSERT INTO "services" ("id","name","slug","tagline","description","image_url","items","sort_order","created_at") VALUES(4,'IT Consultant','it-consultant','Technical strategy without the guesswork.',NULL,NULL,'["Infrastructure planning","Cloud migration","Tech stack audits","Security best practices"]',4,'2026-08-07 17:38:08');
CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  category TEXT,
  tags TEXT, -- comma-separated
  status TEXT DEFAULT 'draft', -- draft, published
  seo_title TEXT,
  seo_description TEXT,
  author_id INTEGER,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "blog_posts" ("id","title","slug","excerpt","content","featured_image","category","tags","status","seo_title","seo_description","author_id","published_at","created_at") VALUES(1,'5 Signs Your Brand Identity Needs a Refresh','5-signs-your-brand-identity-needs-a-refresh','Your logo might have looked great five years ago. Here''s how to tell if it''s time for an update — and what to actually change.',replace('Brand identity isn''t a one-time project. Businesses grow, markets shift, and what worked at launch can start to feel dated fast.\n\nHere are five signs it''s time for a refresh: your logo doesn''t work well on mobile or social avatars, your competitors all look more modern than you, your brand colors clash across different platforms, you''re embarrassed to hand out your business card, or your visual identity doesn''t match the quality of the work you actually deliver.\n\nA refresh doesn''t mean starting from zero. Often it''s about simplifying a logo, tightening a color palette, and creating consistent templates for social media, print, and your website — so every touchpoint feels like the same brand.\n\nAt Emadex Creations, we start every brand refresh with a short discovery conversation: what''s working, what''s not, and what you want people to feel when they see your brand. From there we build a system, not just a logo — one that scales across everything from business cards to billboards.\n\nIf your brand hasn''t been touched in a few years, it might be worth a second look.','\n',char(10)),'https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786370914666-gaktib.jpg','Design','branding, design, identity','published','','',1,'2026-08-10T13:42:16.908Z','2026-08-10 13:42:16');
INSERT INTO "blog_posts" ("id","title","slug","excerpt","content","featured_image","category","tags","status","seo_title","seo_description","author_id","published_at","created_at") VALUES(2,'Why Your Business Needs a Professional Website in 2026','why-your-business-needs-a-professional-website-in-2026','A Facebook page isn''t a website. Here''s what a real, owned website does for your business that social media can''t.',replace('It''s tempting to rely entirely on Instagram or Facebook to represent your business online. It''s free, it''s familiar, and everyone''s already there.\n\nBut a social media page isn''t something you own — the platform controls what people see, how your page looks, and whether it''s even accessible tomorrow. A website is yours. You control the design, the content, and the experience from the first click.\n\nA professional website also builds trust in a way social media can''t. When a potential client is deciding between you and a competitor, a fast, clean, well-built site signals that you take your business seriously — and that you''ll take their project seriously too.\n\nBeyond trust, a real website gives you tools social media doesn''t: a proper contact form, a portfolio people can actually browse, SEO that brings in traffic from Google, and a foundation you can build on as your business grows — blogs, online stores, booking systems, whatever comes next.\n\nIf you''re still relying only on social pages to represent your business, a website is the single highest-leverage investment you can make this year.','\n',char(10)),'https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786370890545-ts5l6b.webp','Web Development','web development, business, websites','published','','',1,'2026-08-10T13:58:47.284Z','2026-08-10 13:58:47');
INSERT INTO "blog_posts" ("id","title","slug","excerpt","content","featured_image","category","tags","status","seo_title","seo_description","author_id","published_at","created_at") VALUES(3,'Do You Actually Need a Mobile App, or Just a Better Website?','do-you-actually-need-a-mobile-app-or-just-a-better-website','Not every business needs an app. Here''s how to know which one is actually worth building for you.',replace('"We need an app" is one of the most common requests we get — but it''s not always the right call. Apps are expensive to build and maintain, and they only pay off in specific situations.\n\nA mobile app makes sense when your users need something offline, when you need push notifications to bring people back regularly, or when the experience genuinely benefits from being installed — think ride-hailing, fitness tracking, or anything used daily.\n\nFor most businesses, a fast, mobile-friendly website does the job just as well, without the cost of maintaining two separate codebases and getting approved in app stores. If people mostly need to browse, book, or contact you occasionally, a website wins.\n\nThe businesses that get the most value from apps are usually ones with a recurring relationship with their users — a marketplace, a subscription service, a community platform.\n\nBefore committing to an app, it''s worth having an honest conversation about what your users actually need. Sometimes the right answer saves you significant time and money.','\n',char(10)),'https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786370876879-nbg7as.avif','Mobile Apps','mobile apps, technology, strategy','published','','',1,'2026-08-10T13:59:55.914Z','2026-08-10 13:59:55');
INSERT INTO "blog_posts" ("id","title","slug","excerpt","content","featured_image","category","tags","status","seo_title","seo_description","author_id","published_at","created_at") VALUES(4,'5 IT Mistakes Small Businesses Make (And How to Avoid Them)','5-it-mistakes-small-businesses-make-and-how-to-avoid-them','From no backups to weak passwords, these are the most common technical mistakes we see — and how to fix them before they cost you.',replace('Most small businesses don''t have a dedicated IT team, which means small technical mistakes can quietly turn into big problems.\n\nThe most common one we see: no backups. If your website, files, or customer data live in only one place, you''re one accident away from losing everything. A simple backup routine solves this entirely.\n\nThe second is weak or reused passwords across staff accounts — especially for anything connected to your website or customer data. A password manager and unique logins per person go a long way.\n\nThird is ignoring software updates. Outdated plugins and systems are the most common way small business sites get hacked. Fourth is having no plan for who owns what — if the person who built your website leaves, does anyone else have access to the domain, hosting, or code?\n\nFinally, many businesses grow their tech stack reactively — a tool here, a subscription there — without ever stepping back to see if it''s actually working together. An occasional audit catches this before it becomes expensive.\n\nNone of these fixes are complicated. They just need someone to actually look.','\n',char(10)),'https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786370861599-dz0cya.jpg','Technology','IT consulting, security, business','published','','',1,'2026-08-10T14:00:59.404Z','2026-08-10 14:00:59');
INSERT INTO "blog_posts" ("id","title","slug","excerpt","content","featured_image","category","tags","status","seo_title","seo_description","author_id","published_at","created_at") VALUES(5,'How We Work: A Look Inside the Emadex Creations Process','how-we-work-a-look-inside-the-emadex-creations-process','From first conversation to launch day — here''s exactly what working with us looks like.',replace('A lot of agencies keep their process vague. We''d rather be specific, so you know exactly what to expect if you work with us.\n\nIt starts with discovery — a real conversation about your business, your goals, and what success looks like for this specific project. No templates, no assumptions.\n\nFrom there we move into design. You''ll see concepts and mockups before a single line of code gets written, so there are no surprises later. We revise based on your feedback until it feels right.\n\nThen we build. Because design and development happen under one roof at Emadex Creations, nothing gets lost in translation between "what was designed" and "what actually gets built" — a common problem when those two things are outsourced separately.\n\nBefore launch, we test everything — every device, every browser, every form. And once it''s live, we don''t disappear. Ongoing support and maintenance are part of how we work, not an upsell.\n\nThat''s it. No mystery, no jargon — just a clear path from idea to a real, working product.','\n',char(10)),'https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1786370827531-qo1lq2.jpg','Tips & Tutorials','studio, process, about us','published','','',1,'2026-08-10T14:01:47.741Z','2026-08-10 14:01:47');
CREATE TABLE quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  service TEXT,
  description TEXT,
  budget TEXT,
  timeline TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'new', -- new, reviewed, quoted, closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "quote_requests" ("id","full_name","email","phone","company","service","description","budget","timeline","additional_info","status","created_at") VALUES(1,'Arowoduye Oluwasogo','arowoduye@gmail.com','+2347032115036','','Website Development',replace('Project Title: RabbitHub Africa\nLocation: Abuja, Nigeria\nHow they heard about us: Social Media\n\njfiuqwedgiwqdiuwqiudiuqwd;qdwoiwd;','\n',char(10)),'₦300,000 - ₦700,000','1-3 months','','reviewed','2026-09-01 15:04:46');
CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, read, replied, closed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "contact_messages" ("id","name","email","phone","company","subject","message","status","created_at") VALUES(1,'Arowoduye','arowoduye@gmail.com','07032115036','Emadex Creations','General Inquiry','jydyfghjchgj','replied','2026-08-10 11:54:33');
CREATE TABLE testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  company TEXT,
  quote TEXT NOT NULL,
  image_url TEXT,
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "testimonials" ("id","client_name","company","quote","image_url","featured","created_at") VALUES(1,'Arowoduye Wealth','Wealth Inspire','I love the design Emadex Creations did for me. They are excellent at what they do.','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1788174099232-pr6zbg.jpg',1,'2026-08-31 11:05:41');
CREATE TABLE faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO "site_settings" ("key","value") VALUES('site_name','Emadex Creations');
INSERT INTO "site_settings" ("key","value") VALUES('contact_email','emadexcreations@gmail.com');
INSERT INTO "site_settings" ("key","value") VALUES('contact_phone','+2347032115036 +2348113658605');
INSERT INTO "site_settings" ("key","value") VALUES('address','');
INSERT INTO "site_settings" ("key","value") VALUES('facebook_url','');
INSERT INTO "site_settings" ("key","value") VALUES('instagram_url','');
INSERT INTO "site_settings" ("key","value") VALUES('tiktok_url','');
INSERT INTO "site_settings" ("key","value") VALUES('linkedin_url','');
INSERT INTO "site_settings" ("key","value") VALUES('youtube_url','');
INSERT INTO "site_settings" ("key","value") VALUES('x_url','');
INSERT INTO "site_settings" ("key","value") VALUES('home_hero_badge','WELCOME TO EMADEX CREATIONS');
INSERT INTO "site_settings" ("key","value") VALUES('about_story_heading','Turning Ideas Into Powerful Digital Solutions ');
INSERT INTO "site_settings" ("key","value") VALUES('favicon_url','https://pub-5d365da19aac42adafb80e0a2e32991c.r2.dev/1788198573114-0orbkh.jpg');
CREATE TABLE media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  filename TEXT,
  uploaded_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "activity_logs" ("id","user_id","action","target","created_at") VALUES(1,1,'Added staff member','Sogo','2026-08-31 23:47:47');
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  website TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0001_schema.sql','2026-09-29 21:40:12');
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',          
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "admins" ("id","name","email","password_hash","role","created_at") VALUES(1,'Miel Cakes','emadexcreations@gmail.com','pbkdf2$100000$+0L+LA6ipR8K2j0CCR7Q7w==$TzGX5GlaPwPvcG+ZckJDa8qz8+4S0DPyro+Sr265jf4=','owner','2026-09-29 21:42:44');
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL,                      
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "sessions" ("id","user_type","user_id","expires_at","created_at") VALUES('10ae3491b7ccbb44f6568ec017d5304c2edd09423dd360207ea8a6500584f14d','admin',1,'2026-10-29T21:42:44.988Z','2026-09-29 21:42:45');
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  options_json TEXT NOT NULL DEFAULT '[]',      
  availability TEXT NOT NULL DEFAULT 'daily',   
  notice_days INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,      
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE delivery_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  option_label TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                    
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending_payment', 
  fulfilment TEXT NOT NULL DEFAULT 'pickup',    
  zone_id INTEGER REFERENCES delivery_zones(id),
  address TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  needed_date TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'paystack', 
  payment_status TEXT NOT NULL DEFAULT 'unpaid',   
  paystack_ref TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER,
  name TEXT NOT NULL,
  option_label TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                    
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  event_type TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL,
  guests INTEGER NOT NULL DEFAULT 0,
  items_wanted TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  reference_image TEXT NOT NULL DEFAULT '',
  fulfilment TEXT NOT NULL DEFAULT 'pickup',
  zone_id INTEGER REFERENCES delivery_zones(id),
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',     
  quote_amount INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  paystack_ref TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE blocked_dates (
  date TEXT PRIMARY KEY,                        
  reason TEXT NOT NULL DEFAULT ''
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('categories',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('services',4);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('users',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('portfolio_items',3);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('contact_messages',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('blog_posts',5);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('testimonials',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('activity_logs',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('quote_requests',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',1);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('admins',1);
CREATE INDEX idx_sessions_user ON sessions(user_type, user_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_cart_customer ON cart_items(customer_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
