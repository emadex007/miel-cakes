// GET /api/admin/alerts: counts for the dashboard menu badges.
// Also marks the dashboard as open, so visitors see "Online now" in the chat.

export interface AdminAlerts {
  chat: number
  orders: number
  bookings: number
  quotes: number
  applications: number
  reviews: number
}

export async function adminAlerts(db: D1Database): Promise<AdminAlerts> {
  const n = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0
  const [chat, orders, bookings, quotes, applications, reviews] = await Promise.all([
    n("SELECT COALESCE(SUM(unread_admin), 0) AS n FROM chat_conversations WHERE status = 'open'"),
    n("SELECT COUNT(*) AS n FROM orders WHERE status IN ('awaiting_confirmation', 'received')"),
    n("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('requested', 'checking') OR (status = 'booked' AND proof_pending = 1)"),
    n("SELECT COUNT(*) AS n FROM quote_requests WHERE status = 'new'"),
    n("SELECT COUNT(*) AS n FROM job_applications WHERE status = 'new'"),
    n('SELECT COUNT(*) AS n FROM reviews WHERE seen = 0'),
    db.prepare(`UPDATE chat_presence SET seen_at = datetime('now') WHERE id = 1`).run(),
  ])
  return { chat, orders, bookings, quotes, applications, reviews }
}
