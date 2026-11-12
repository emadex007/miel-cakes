import { createServerFn } from '@tanstack/react-start'
import type { Job, JobApplication } from '~/lib/types'
import { requireAdmin, requireOwner } from '~/server/auth'
import { db, media } from '~/server/db'

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, fallback = 0) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? n : fallback
}

// ---------- public ----------
export const getOpenJobs = createServerFn({ method: 'GET' }).handler(async () => {
  const { results } = await db().prepare('SELECT * FROM jobs WHERE is_open = 1 ORDER BY sort, id DESC').all<Job>()
  return results
})

// ---------- jobs (admin) ----------
export const listJobsAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const [jobs, apps] = await Promise.all([
    db()
      .prepare(
        `SELECT j.*, (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id) AS application_count
         FROM jobs j ORDER BY j.is_open DESC, j.sort, j.id DESC`,
      )
      .all<Job>(),
    db().prepare('SELECT * FROM job_applications ORDER BY id DESC LIMIT 1000').all<JobApplication>(),
  ])
  return { jobs: jobs.results, applications: apps.results }
})

export interface JobInput {
  id?: number
  title: string
  job_type: string
  location: string
  pay: string
  summary: string
  duties: string
  requirements: string
  is_open: boolean | number
  sort: number
}

export const saveJob = createServerFn({ method: 'POST' })
  .validator((d: JobInput) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const title = str(data.title, 120)
    if (!title) throw new Error('Give the job a title.')
    const values = [
      title,
      str(data.job_type, 40) || 'Full-time',
      str(data.location, 80) || 'Abuja',
      str(data.pay, 80),
      str(data.summary, 600),
      str(data.duties, 3000),
      str(data.requirements, 3000),
      data.is_open ? 1 : 0,
      int(data.sort),
    ]
    if (data.id) {
      await db()
        .prepare(
          `UPDATE jobs SET title=?, job_type=?, location=?, pay=?, summary=?, duties=?, requirements=?, is_open=?, sort=?,
           updated_at=datetime('now') WHERE id=?`,
        )
        .bind(...values, int(data.id))
        .run()
      return { id: int(data.id) }
    }
    const r = await db()
      .prepare('INSERT INTO jobs (title, job_type, location, pay, summary, duties, requirements, is_open, sort) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const setJobOpen = createServerFn({ method: 'POST' })
  .validator((d: { id: number; open: boolean }) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    await db().prepare(`UPDATE jobs SET is_open = ?, updated_at = datetime('now') WHERE id = ?`).bind(data.open ? 1 : 0, int(data.id)).run()
    return { ok: true }
  })

export const deleteJob = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    // Keep applications; they keep the job title they applied for.
    await db().batch([
      db().prepare('UPDATE job_applications SET job_id = NULL WHERE job_id = ?').bind(id),
      db().prepare('DELETE FROM jobs WHERE id = ?').bind(id),
    ])
    return { ok: true }
  })

// ---------- applications (admin) ----------
export const updateApplication = createServerFn({ method: 'POST' })
  .validator((d: { id: number; status: JobApplication['status']; admin_note: string }) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const allowed = ['new', 'shortlisted', 'interview', 'hired', 'not_selected']
    await db()
      .prepare('UPDATE job_applications SET status = ?, admin_note = ? WHERE id = ?')
      .bind(allowed.includes(data.status) ? data.status : 'new', str(data.admin_note, 2000), int(data.id))
      .run()
    return { ok: true }
  })

export const deleteApplication = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    const row = await db().prepare('SELECT cv_key FROM job_applications WHERE id = ?').bind(id).first<{ cv_key: string }>()
    if (row?.cv_key) await media().delete(row.cv_key)
    await db().prepare('DELETE FROM job_applications WHERE id = ?').bind(id).run()
    return { ok: true }
  })
