-- Online orders: proof of payment uploads and the Paystack switch.
ALTER TABLE orders ADD COLUMN proof_key TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN proof_uploaded_at TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN paid_at TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);
