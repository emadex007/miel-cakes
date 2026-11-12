-- Product labels such as "Hot", "New" or "Kids". Shown on product cards and used for homepage rows.
ALTER TABLE products ADD COLUMN badge TEXT NOT NULL DEFAULT '';

-- Starter labels on the sample menu (only where nothing has been set yet)
UPDATE products SET badge = 'Hot' WHERE badge = '' AND slug IN ('classic-birthday-cake', 'chocolate-fudge-cake', 'small-chops-pack', 'cupcake-box');
UPDATE products SET badge = 'New' WHERE badge = '' AND slug IN ('floral-celebration-cake', 'bento-cake', 'strawberry-cream-cake');
