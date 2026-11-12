-- Cake customiser: shape, flavour, layers, filling, icing, decoration, topper, notes and a reference picture.
ALTER TABLE products ADD COLUMN customizable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cart_items ADD COLUMN custom_json TEXT NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN ref_key TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN custom_json TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN ref_key TEXT NOT NULL DEFAULT '';

-- Turn it on for the main Cakes category to start with (switch others on per item in the dashboard)
UPDATE products SET customizable = 1
WHERE category_id IN (SELECT id FROM categories WHERE lower(slug) = 'cakes' OR lower(name) IN ('cakes', 'celebration cakes'));
