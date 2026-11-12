-- Delivery time slots, discount codes, and reviews written by customers.

ALTER TABLE orders ADD COLUMN time_slot TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN discount_code TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_orders_needed_date ON orders(needed_date);

CREATE TABLE IF NOT EXISTS discount_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                 -- stored in capitals, e.g. XMAS10
  kind TEXT NOT NULL DEFAULT 'percent',      -- percent | amount
  value INTEGER NOT NULL DEFAULT 0,          -- 10 = 10% off, or ₦ off
  min_order INTEGER NOT NULL DEFAULT 0,      -- items total needed to use it
  max_uses INTEGER NOT NULL DEFAULT 0,       -- 0 = no limit
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_on TEXT NOT NULL DEFAULT '',        -- YYYY-MM-DD, '' = straight away
  ends_on TEXT NOT NULL DEFAULT '',          -- YYYY-MM-DD, '' = no end
  is_active INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE reviews ADD COLUMN order_id INTEGER;
ALTER TABLE reviews ADD COLUMN customer_id INTEGER;
ALTER TABLE reviews ADD COLUMN source TEXT NOT NULL DEFAULT 'owner';   -- owner | customer
ALTER TABLE reviews ADD COLUMN seen INTEGER NOT NULL DEFAULT 1;        -- 0 = new from a customer, not looked at yet
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id) WHERE order_id IS NOT NULL;
