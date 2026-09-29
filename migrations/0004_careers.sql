-- Careers: job openings and applications.

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time',   -- Full-time | Part-time | Contract | Internship | Weekends only
  location TEXT NOT NULL DEFAULT 'Abuja',
  pay TEXT NOT NULL DEFAULT '',                 -- e.g. ₦80,000 – ₦100,000 a month
  summary TEXT NOT NULL DEFAULT '',
  duties TEXT NOT NULL DEFAULT '',              -- one per line
  requirements TEXT NOT NULL DEFAULT '',        -- one per line
  is_open INTEGER NOT NULL DEFAULT 0,           -- only open jobs show on the website
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,                    -- e.g. A-1004
  job_id INTEGER REFERENCES jobs(id),           -- NULL = general application
  job_title TEXT NOT NULL DEFAULT 'General application',
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',                -- where in Abuja they live
  experience TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL DEFAULT '',
  about TEXT NOT NULL DEFAULT '',
  cv_key TEXT NOT NULL DEFAULT '',              -- private R2 key (never served publicly)
  cv_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',           -- new | shortlisted | interview | hired | not_selected
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);

-- Draft openings (closed until the owner opens them in the dashboard)
INSERT INTO jobs (title, job_type, pay, summary, duties, requirements, is_open, sort) VALUES
  ('Assistant Baker', 'Full-time', '', 'Help our head baker prepare cakes, cupcakes and pastries for daily orders and events.',
   'Measure, mix and bake cakes and pastries
Prepare fillings, frostings and small decorations
Keep the kitchen clean and tidy
Help pack orders for pickup and delivery',
   'At least 1 year of baking experience
Neat, careful and on time
Able to work some weekends before big events', 0, 1),
  ('Small Chops & Kitchen Assistant', 'Part-time', '', 'Prepare and fry small chops for daily orders and party trays.',
   'Prepare puff-puff, samosa, spring rolls and peppered chicken
Pack small chops packs and trays
Keep work areas clean',
   'Experience making small chops is a plus
Good hygiene
Available on event days', 0, 2),
  ('Delivery Rider', 'Contract', '', 'Deliver cakes and trays safely and on time across Abuja.',
   'Deliver orders across Abuja carefully and on time
Call customers before arrival
Collect payment on delivery when needed',
   'Valid rider''s licence
Own motorcycle is a plus
Knows Abuja well and has a smartphone', 0, 3);
