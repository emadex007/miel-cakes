import { COLOR_KEYS, DEFAULT_SETTINGS, FIELD_KEYS, isHexColor, type SiteSettings } from '~/lib/site-fields'
import { db } from './db'

export async function loadSettings(): Promise<SiteSettings> {
  const { results } = await db().prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()
  const settings: SiteSettings = { ...DEFAULT_SETTINGS }
  for (const row of results) {
    if (FIELD_KEYS.has(row.key)) settings[row.key] = row.value
  }
  // Never let a bad colour value break the site's styles.
  for (const key of COLOR_KEYS) {
    if (!isHexColor(settings[key])) settings[key] = DEFAULT_SETTINGS[key]
  }
  return settings
}

export async function saveSettings(values: Record<string, string>) {
  const statements: ReturnType<ReturnType<typeof db>['prepare']>[] = []
  for (const [key, raw] of Object.entries(values)) {
    if (!FIELD_KEYS.has(key)) continue
    const value = String(raw ?? '').slice(0, 20_000)
    if (key.startsWith('color_') && !isHexColor(value)) {
      throw new Error(`"${value}" isn't a valid colour. Use the colour picker or a code like #1D4ED8.`)
    }
    statements.push(
      db()
        .prepare(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(key, value),
    )
  }
  if (statements.length) await db().batch(statements)
}
