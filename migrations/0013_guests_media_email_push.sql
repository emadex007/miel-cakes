-- Update 21: guest checkout, own rider, several pictures/videos per item,
-- pictures in chat, emails (alerts, festive campaigns) and phone push alerts.

-- Guests: people who order or book without creating an account
ALTER TABLE customers ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0;

-- Contact details typed at checkout (guests have no real email on their account)
ALTER TABLE orders ADD COLUMN contact_name TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN own_rider INTEGER NOT NULL DEFAULT 0;     -- 1 = customer sends their own rider to collect
ALTER TABLE bookings ADD COLUMN contact_name TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN own_rider INTEGER NOT NULL DEFAULT 0;

-- Several pictures and videos per menu item: [{ "url": "...", "kind": "image" | "video" }]
ALTER TABLE products ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]';

-- Pictures sent in the live chat (stored privately)
ALTER TABLE chat_messages ADD COLUMN image_key TEXT NOT NULL DEFAULT '';

-- Phone notifications for the dashboard
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Festive emails
ALTER TABLE clients ADD COLUMN email_opt_out INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN unsub_token TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  heading TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  button_label TEXT NOT NULL DEFAULT '',
  button_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sending',       -- sending | done | stopped
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id),
  client_id INTEGER,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',        -- queued | sent | failed | skipped
  error TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients ON email_campaign_recipients(status, campaign_id);

-- Every email the site sends (counts against the daily allowance)
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                           -- alert | customer | campaign
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  ok INTEGER NOT NULL DEFAULT 1,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_email_log_day ON email_log(created_at);

-- Private values the site makes for itself (e.g. the phone-notification keys).
-- Kept apart from settings so they are never sent to the browser.
CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
