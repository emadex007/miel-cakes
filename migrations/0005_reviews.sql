-- Customer reviews shown on the homepage. Starts empty: add real reviews from the dashboard.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT '',     -- e.g. "30th birthday cake"
  body TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,     -- 1 to 5
  photo_url TEXT NOT NULL DEFAULT '',    -- optional photo of the cake or a screenshot of the message
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
