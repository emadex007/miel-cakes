import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { formatDate } from '~/components/ReceiptSheet'
import { WhatsAppIcon } from '~/components/icons'
import { deleteApplication, deleteJob, listJobsAdmin, saveJob, setJobOpen, updateApplication, type JobInput } from '~/fns/careers'
import { downloadFile, toCsv, today } from '~/lib/export'
import { toIntlPhone, whatsappLink } from '~/lib/format'
import type { Job, JobApplication } from '~/lib/types'

export const Route = createFileRoute('/admin/careers')({
  loader: () => listJobsAdmin(),
  component: CareersAdmin,
})

const APP_STATUSES: { value: JobApplication['status']; label: string; className: string }[] = [
  { value: 'new', label: 'New', className: 'bg-blue-100 text-blue-800' },
  { value: 'shortlisted', label: 'Shortlisted', className: 'bg-amber-100 text-amber-900' },
  { value: 'interview', label: 'Interview', className: 'bg-violet-100 text-violet-800' },
  { value: 'hired', label: 'Hired', className: 'bg-emerald-100 text-emerald-800' },
  { value: 'not_selected', label: 'Not selected', className: 'bg-slate-100 text-slate-700' },
]
const statusOf = (v: string) => APP_STATUSES.find((s) => s.value === v) ?? APP_STATUSES[0]
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Weekends only']

function CareersAdmin() {
  const { jobs, applications } = Route.useLoaderData()
  const newCount = applications.filter((a) => a.status === 'new').length
  const [tab, setTab] = useState<'applications' | 'jobs'>(applications.length || !jobs.length ? 'applications' : 'jobs')

  return (
    <>
      <PageTitle title="Careers">
        Post job openings on the Careers page and review the people who apply. Only jobs marked <strong>Open</strong> show on the
        website.
      </PageTitle>
      <div className="mb-6 flex gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'applications'}
          onClick={() => setTab('applications')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'applications' ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#e3e7f0]'}`}
        >
          Applications ({applications.length}){newCount ? ` · ${newCount} new` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'jobs'}
          onClick={() => setTab('jobs')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'jobs' ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#e3e7f0]'}`}
        >
          Job openings ({jobs.filter((j) => j.is_open).length} open)
        </button>
      </div>
      {tab === 'applications' ? <Applications applications={applications} jobs={jobs} /> : <Jobs jobs={jobs} />}
    </>
  )
}

// ------------------------------------------------------------------
function Applications({ applications, jobs }: { applications: JobApplication[]; jobs: Job[] }) {
  const router = useRouter()
  const { error, notice, run } = useAction()
  const [jobFilter, setJobFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | JobApplication['status']>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const titles = Array.from(new Set(applications.map((a) => a.job_title)))
  const shown = applications.filter(
    (a) => (jobFilter === 'all' || a.job_title === jobFilter) && (statusFilter === 'all' || a.status === statusFilter),
  )

  async function setStatus(a: JobApplication, status: JobApplication['status']) {
    await run(() => updateApplication({ data: { id: a.id, status, admin_note: notes[a.id] ?? a.admin_note } }))
    router.invalidate()
  }
  async function saveNote(a: JobApplication) {
    const ok = await run(() => updateApplication({ data: { id: a.id, status: a.status, admin_note: notes[a.id] ?? a.admin_note } }), 'Note saved.')
    if (ok) router.invalidate()
  }
  async function remove(id: number) {
    const ok = await run(() => deleteApplication({ data: id }), 'Application deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }
  function exportCsv() {
    downloadFile(
      `miel-cakes-job-applications-${today()}.csv`,
      toCsv(shown, [
        { label: 'Code', value: (a) => a.code },
        { label: 'Received', value: (a) => a.created_at },
        { label: 'Position', value: (a) => a.job_title },
        { label: 'Status', value: (a) => statusOf(a.status).label },
        { label: 'Name', value: (a) => a.name },
        { label: 'Phone', value: (a) => a.phone },
        { label: 'Email', value: (a) => a.email },
        { label: 'Lives in', value: (a) => a.area },
        { label: 'Experience', value: (a) => a.experience },
        { label: 'Can start', value: (a) => a.availability },
        { label: 'About', value: (a) => a.about },
        { label: 'CV attached', value: (a) => (a.cv_key ? 'Yes' : 'No') },
        { label: 'Your notes', value: (a) => a.admin_note },
      ]),
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select id="app-job" aria-label="Filter by position" className="admin-input max-w-xs" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">All positions</option>
          {titles.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          id="app-status"
          aria-label="Filter by status"
          className="admin-input max-w-[12rem]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Any status</option>
          {APP_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost ml-auto text-cocoa" onClick={exportCsv} disabled={!shown.length}>
          Download (Excel)
        </button>
      </div>
      <div className="mb-4">
        <Messages error={error} notice={notice} />
      </div>

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          {applications.length
            ? 'No applications match these filters.'
            : jobs.some((j) => j.is_open)
              ? 'No applications yet. They appear here as soon as someone applies on the Careers page.'
              : 'No applications yet. Open a job under "Job openings" so people can apply for it. General applications can come in any time.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => {
            const st = statusOf(a.status)
            const isOpen = openId === a.id
            const wa = whatsappLink(toIntlPhone(a.phone), `Hello ${a.name.split(' ')[0]}, thank you for applying to Miel Cakes (${a.job_title}). `)
            return (
              <li key={a.id} className="admin-card overflow-hidden">
                <button type="button" onClick={() => setOpenId(isOpen ? null : a.id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left" aria-expanded={isOpen}>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.className}`}>{st.label}</span>
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-sm text-[#667085]">{[a.job_title, a.area].filter(Boolean).join(' · ')}</span>
                  {a.cv_key && <span className="rounded bg-[#eef1f7] px-1.5 py-0.5 text-xs font-semibold text-[#475467]">CV</span>}
                  <span className="ml-auto text-xs text-[#98a2b3]">
                    {a.code} · {formatDate(a.created_at)}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid gap-6 border-t border-[#eceff5] p-5 lg:grid-cols-[1.2fr_1fr]">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      {[
                        ['Phone', a.phone],
                        ['Email', a.email],
                        ['Lives in', a.area],
                        ['Can start', a.availability],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">{k}</dt>
                            <dd className="mt-0.5 select-all">{v}</dd>
                          </div>
                        ))}
                      {a.experience && (
                        <div className="col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">Experience</dt>
                          <dd className="mt-0.5 whitespace-pre-line">{a.experience}</dd>
                        </div>
                      )}
                      {a.about && (
                        <div className="col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-wide text-[#98a2b3]">About them</dt>
                          <dd className="mt-0.5 whitespace-pre-line">{a.about}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener" className="btn btn-primary !py-2.5 text-sm">
                            <WhatsAppIcon className="h-4 w-4" /> Message on WhatsApp
                          </a>
                        )}
                        {a.cv_key && (
                          <a href={`/api/admin/cv/${a.id}`} className="btn btn-ghost !py-2.5 text-sm text-cocoa">
                            Download CV
                          </a>
                        )}
                        {a.email && (
                          <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application to Miel Cakes (${a.job_title})`)}`} className="btn btn-ghost !py-2.5 text-sm text-cocoa">
                            Email
                          </a>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`app-status-${a.id}`} className="admin-label">Status</label>
                        <select id={`app-status-${a.id}`} className="admin-input" value={a.status} onChange={(e) => setStatus(a, e.target.value as JobApplication['status'])}>
                          {APP_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`app-note-${a.id}`} className="admin-label">Your notes (only you see these)</label>
                        <textarea
                          id={`app-note-${a.id}`}
                          rows={3}
                          className="admin-input"
                          value={notes[a.id] ?? a.admin_note}
                          onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                          placeholder="e.g. Interview Friday 10am, bring sample cupcakes"
                        />
                        <div className="mt-2 flex justify-between text-sm">
                          <button type="button" className="font-semibold text-brand hover:underline" onClick={() => saveNote(a)}>Save note</button>
                          {confirmId === a.id ? (
                            <span className="flex gap-2">
                              <button type="button" className="font-semibold text-red-700" onClick={() => remove(a.id)}>Delete</button>
                              <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                            </span>
                          ) : (
                            <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmId(a.id)}>Delete application</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// ------------------------------------------------------------------
const blankJob = (): JobInput => ({ title: '', job_type: 'Full-time', location: 'Abuja', pay: '', summary: '', duties: '', requirements: '', is_open: true, sort: 0 })
const toInput = (j: Job): JobInput => ({ ...j, is_open: !!j.is_open })

function Jobs({ jobs }: { jobs: Job[] }) {
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [editing, setEditing] = useState<JobInput | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveJob({ data: editing }), editing.is_open ? 'Saved. The job is live on the Careers page.' : 'Saved as closed. It won’t show on the website.')
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }
  async function toggle(j: Job, open: boolean) {
    await run(() => setJobOpen({ data: { id: j.id, open } }), open ? `${j.title} is now open for applications.` : `${j.title} is closed.`)
    router.invalidate()
  }
  async function remove(id: number) {
    const ok = await run(() => deleteJob({ data: id }), 'Job deleted. Its applications are kept.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Messages error={error} notice={notice} />
        <button type="button" className="btn btn-primary ml-auto" onClick={() => setEditing(blankJob())}>
          + Add a job
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <h2 className="text-lg font-bold sm:col-span-2">{editing.id ? `Edit ${editing.title}` : 'New job opening'}</h2>
          <Field label="Job title *" htmlFor="j-title">
            <input id="j-title" required className="admin-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Cake Decorator" />
          </Field>
          <Field label="Type" htmlFor="j-type">
            <select id="j-type" className="admin-input" value={editing.job_type} onChange={(e) => setEditing({ ...editing, job_type: e.target.value })}>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Location" htmlFor="j-location">
            <input id="j-location" className="admin-input" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
          </Field>
          <Field label="Pay (optional)" help="Leave empty to hide." htmlFor="j-pay">
            <input id="j-pay" className="admin-input" value={editing.pay} onChange={(e) => setEditing({ ...editing, pay: e.target.value })} placeholder="e.g. ₦80,000 – ₦100,000 a month" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Short summary" htmlFor="j-summary">
              <textarea id="j-summary" rows={2} className="admin-input" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </Field>
          </div>
          <Field label="What they'll do" help="One duty per line." htmlFor="j-duties">
            <textarea id="j-duties" rows={5} className="admin-input" value={editing.duties} onChange={(e) => setEditing({ ...editing, duties: e.target.value })} />
          </Field>
          <Field label="What you're looking for" help="One requirement per line." htmlFor="j-reqs">
            <textarea id="j-reqs" rows={5} className="admin-input" value={editing.requirements} onChange={(e) => setEditing({ ...editing, requirements: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
            <Toggle id="j-open" checked={!!editing.is_open} onChange={(v) => setEditing({ ...editing, is_open: v })} label="Open: show on the Careers page" />
            <label className="flex items-center gap-2 text-sm font-medium">
              Position
              <input id="j-sort" type="number" className="admin-input w-24" value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save job'}</button>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {jobs.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">No jobs yet. Add one when you&rsquo;re hiring.</div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="admin-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {j.title}
                  {!j.is_open && <span className="ml-2 rounded bg-[#eef1f7] px-1.5 py-0.5 text-xs font-semibold text-[#667085]">Closed</span>}
                </p>
                <p className="text-sm text-[#667085]">
                  {[j.job_type, j.location, j.pay].filter(Boolean).join(' · ')} · {j.application_count ?? 0} application
                  {j.application_count === 1 ? '' : 's'}
                </p>
              </div>
              <Toggle id={`job-open-${j.id}`} checked={!!j.is_open} onChange={(v) => toggle(j, v)} label="Open" />
              <button type="button" className="text-sm font-semibold text-brand hover:underline" onClick={() => setEditing(toInput(j))}>Edit</button>
              {confirmId === j.id ? (
                <span className="flex gap-2 text-sm">
                  <button type="button" className="font-semibold text-red-700" onClick={() => remove(j.id)}>Delete</button>
                  <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="text-sm text-[#667085] hover:text-red-700" onClick={() => setConfirmId(j.id)}>Delete</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
