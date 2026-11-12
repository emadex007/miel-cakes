-- Emoji look different on every phone, so the site uses its own line icons instead.
-- Remove the emoji from any of the old default wording already saved in settings.
UPDATE settings SET value = replace(replace(replace(replace(replace(replace(value, ' 🕯️', ''), ' 🕯', ''), ' 🎂', ''), ' 👋', ''), ' ✨', ''), '🎂', '')
WHERE key IN ('perk_text', 'custom_title', 'chat_greeting');
