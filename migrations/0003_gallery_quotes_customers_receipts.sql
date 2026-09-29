-- Gallery, quote requests, customer records and receipts.

CREATE TABLE IF NOT EXISTS gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  occasion TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                    -- e.g. Q-1007
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  occasion TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '',               -- what they want: cake, small chops, pastries...
  cake_shape TEXT NOT NULL DEFAULT '',
  cake_size TEXT NOT NULL DEFAULT '',
  flavour TEXT NOT NULL DEFAULT '',
  colours TEXT NOT NULL DEFAULT '',
  cake_message TEXT NOT NULL DEFAULT '',
  guests INTEGER NOT NULL DEFAULT 0,
  fulfilment TEXT NOT NULL DEFAULT 'pickup',
  area TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',           -- new | contacted | quoted | confirmed | declined
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customer records the owner keeps (separate from online login accounts).
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  birthday TEXT NOT NULL DEFAULT '',            -- e.g. 14 March (for reminders)
  notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',        -- manual | quote | receipt
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                    -- e.g. MC-2026-0001
  token TEXT NOT NULL UNIQUE,                   -- secret part of the customer's receipt link
  client_id INTEGER REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',        -- [{ "description": "...", "qty": 1, "price": 25000 }]
  subtotal INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'transfer', -- transfer | cash | pos | paystack
  status TEXT NOT NULL DEFAULT 'paid',          -- paid | part_paid | unpaid
  fulfilment TEXT NOT NULL DEFAULT 'pickup',
  event_date TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  issued_on TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts(client_id);

-- Sample gallery (replace with her own work from the dashboard)
INSERT INTO gallery_items (image_url, title, occasion, sort) VALUES
  ('https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=1200&q=80', 'Four-tier white wedding cake', 'Weddings', 1),
  ('https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=1200&q=80', 'Chocolate birthday cake with roses', 'Birthdays', 2),
  ('https://images.pexels.com/photos/37648029/pexels-photo-37648029.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Small chops platter', 'Office parties', 3),
  ('https://images.unsplash.com/photo-1604413191066-4dd20bedf486?auto=format&fit=crop&w=1200&q=80', 'Pink floral celebration cake', 'Anniversaries', 4),
  ('https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=80', 'Cupcake box with sprinkles', 'Birthdays', 5),
  ('https://images.pexels.com/photos/13915068/pexels-photo-13915068.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Fresh puff-puff', 'Naming ceremonies', 6),
  ('https://images.unsplash.com/photo-1525257831700-183b9b8bf5c4?auto=format&fit=crop&w=1200&q=80', 'Floral tiered wedding cake', 'Weddings', 7),
  ('https://images.pexels.com/photos/16966131/pexels-photo-16966131.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Bento cake with hearts', 'Valentine''s Day', 8),
  ('https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=1200&q=80', 'Chocolate hazelnut cupcake', 'Graduations', 9),
  ('https://images.pexels.com/photos/39660402/pexels-photo-39660402.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Dessert table for an event', 'Product launches', 10),
  ('https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=1200&q=80', 'Pink and white celebration cake', 'Baby showers', 11),
  ('https://images.pexels.com/photos/13988870/pexels-photo-13988870.jpeg?auto=compress&cs=tinysrgb&w=1200', 'Chin chin for guests', 'Thanksgiving', 12);
