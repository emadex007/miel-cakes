-- Event bookings with deposits.
-- The bookings table was created in 0001; this adds what the booking flow needs.
ALTER TABLE bookings ADD COLUMN event_time TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN budget TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN quote_items_json TEXT NOT NULL DEFAULT '[]';  -- [{ "description": "...", "qty": 1, "price": 25000 }]
ALTER TABLE bookings ADD COLUMN delivery_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN quote_message TEXT NOT NULL DEFAULT '';       -- shown to the customer with the quote
ALTER TABLE bookings ADD COLUMN quoted_at TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN proof_key TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN proof_uploaded_at TEXT NOT NULL DEFAULT '';
ALTER TABLE bookings ADD COLUMN proof_pending INTEGER NOT NULL DEFAULT 0;     -- 1 = customer sent proof, owner hasn't checked yet

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE TABLE IF NOT EXISTS booking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON booking_events(booking_id);

-- Every payment towards a booking (deposit, balance, part payments).
-- A Paystack reference can only be counted once.
CREATE TABLE IF NOT EXISTS booking_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'transfer',      -- transfer | paystack | cash | pos
  reference TEXT,                               -- Paystack reference, NULL for manual payments
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments(booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_payments_ref ON booking_payments(reference);
