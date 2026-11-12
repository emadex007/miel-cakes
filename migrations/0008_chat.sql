-- Website live chat: visitors message the bakery, the team replies from the dashboard.
CREATE TABLE IF NOT EXISTS chat_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,                   -- secret kept in the visitor's browser
  customer_id INTEGER REFERENCES customers(id), -- set when a signed-in customer chats
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '',                -- page they started on
  status TEXT NOT NULL DEFAULT 'open',          -- open | closed
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_visitor INTEGER NOT NULL DEFAULT 0,
  last_message TEXT NOT NULL DEFAULT '',
  last_from TEXT NOT NULL DEFAULT 'visitor',
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_last ON chat_conversations(last_message_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id),
  sender TEXT NOT NULL,                         -- visitor | admin
  admin_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, id);

-- When someone last had the dashboard open (shows "Online now" in the chat).
CREATE TABLE IF NOT EXISTS chat_presence (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  seen_at TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO chat_presence (id, seen_at) VALUES (1, '');
