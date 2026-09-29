import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Reveal } from '~/components/motion'
import { getOpenJobs } from '~/fns/careers'
import { lines } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import type { Job } from '~/lib/types'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/careers')({
  loader: () => getOpenJobs(),
  head: () => ({ meta: [{ title: 'Careers · Miel Cakes' }] }),
  component: CareersPage,
})

function CareersPage() {
  const s = root.useLoaderData()
  const jobs = Route.useLoaderData()
  const [applyFor, setApplyFor] = useState<number | 0>(jobs[0]?.id ?? 0)
  const perks = lines(s.careers_perks)

  function choose(id: number) {
    setApplyFor(id)
    setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="eyebrow text-brand">Careers</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{s.careers_title}</h1>
          {s.careers_intro && <p className="mt-4 max-w-xl text-lg text-cocoa/80">{s.careers_intro}</p>}
          {perks.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <a href="#apply" className="btn btn-primary mt-8">
            {jobs.length ? 'Apply now' : 'Send your details'}
          </a>
        </div>
        {s.careers_image_url && (
          <Reveal>
            <img src={s.careers_image_url} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
          </Reveal>
        )}
      </div>

      <section className="pt-20">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl">Open positions</h2>
        </Reveal>
        {jobs.length ? (
          <div className="mt-8 space-y-4">
            {jobs.map((j, n) => (
              <Reveal key={j.id} delay={n * 0.06}>
                <JobCard job={j} onApply={() => choose(j.id)} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-6 max-w-2xl rounded-3xl bg-white p-7 text-cocoa/80 ring-1 ring-line">{s.careers_closed_note}</p>
        )}
      </section>

      <section id="apply" className="scroll-mt-28 pt-20">
        <ApplyForm s={s} jobs={jobs} jobId={applyFor} setJobId={setApplyFor} />
      </section>
    </div>
  )
}

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) {
  const [open, setOpen] = useState(false)
  const duties = lines(job.duties)
  const reqs = lines(job.requirements)
  return (
    <article className="rounded-3xl bg-white ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-4 p-6">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl">{job.title}</h3>
          <p className="mt-1 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-honey px-3 py-0.5 font-semibold">{job.job_type}</span>
            <span className="rounded-full bg-soft px-3 py-0.5 font-semibold">{job.location}</span>
            {job.pay && <span className="rounded-full bg-soft px-3 py-0.5 font-semibold tabular">{job.pay}</span>}
          </p>
          {job.summary && <p className="mt-3 text-cocoa/80">{job.summary}</p>}
        </div>
        <div className="flex gap-2">
          {(duties.length > 0 || reqs.length > 0) && (
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Hide details' : 'Details'}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>
      {open && (
        <div className="grid gap-6 border-t border-line p-6 sm:grid-cols-2">
          {duties.length > 0 && (
            <div>
              <h4 className="eyebrow text-brand">What you&rsquo;ll do</h4>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-cocoa/85">
                {duties.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {reqs.length > 0 && (
            <div>
              <h4 className="eyebrow text-brand">What we&rsquo;re looking for</h4>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-cocoa/85">
                {reqs.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function ApplyForm({ s, jobs, jobId, setJobId }: { s: SiteSettings; jobs: Job[]; jobId: number; setJobId: (id: number) => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ code: string; jobTitle: string } | null>(null)
  const [fileName, setFileName] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const cv = form.get('cv')
    if (cv instanceof File && cv.size > 5 * 1024 * 1024) return setError('Your CV must be 5 MB or smaller.')
    setBusy(true)
    try {
      const res = await fetch('/api/careers/apply', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as { code?: string; jobTitle?: string; error?: string }
      if (!res.ok || !data.code) throw new Error(data.error || 'Something went wrong. Please try again.')
      setDone({ code: data.code, jobTitle: data.jobTitle ?? '' })
      formRef.current?.reset()
      setFileName('')
      document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-[2rem] bg-white p-8 ring-1 ring-line sm:p-10">
        <p className="eyebrow text-brand">Application {done.code}</p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">Thank you. We&rsquo;ve received your application</h2>
        <p className="mt-3 max-w-xl text-cocoa/80">
          {done.jobTitle && done.jobTitle !== 'General application' ? `You applied for ${done.jobTitle}. ` : ''}
          We read every application. If you&rsquo;re a good fit, we&rsquo;ll call or message you on the number you gave us.
        </p>
        <button type="button" onClick={() => setDone(null)} className="mt-8 text-sm font-semibold text-muted hover:text-brand">
          Send another application
        </button>
      </div>
    )
  }

  const input = 'w-full rounded-2xl border-0 bg-white px-4 py-3 ring-1 ring-line focus:ring-2 focus:ring-brand'
  const label = 'mb-1.5 block text-sm font-semibold'

  return (
    <form ref={formRef} onSubmit={submit} className="rounded-[2rem] bg-soft p-6 sm:p-10" encType="multipart/form-data">
      <h2 className="font-display text-3xl sm:text-4xl">Apply to {s.business_name}</h2>
      <p className="mt-2 text-cocoa/80">It takes about 3 minutes. Fields marked * are required.</p>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="a-job" className={label}>Position</label>
          <select id="a-job" name="job_id" className={input} value={jobId} onChange={(e) => setJobId(Number(e.target.value))}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.job_type})
              </option>
            ))}
            <option value={0}>General application (any future role)</option>
          </select>
        </div>
        <div>
          <label htmlFor="a-name" className={label}>Full name *</label>
          <input id="a-name" name="name" required autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="a-phone" className={label}>Phone / WhatsApp *</label>
          <input id="a-phone" name="phone" type="tel" required autoComplete="tel" className={input} placeholder="0801 234 5678" />
        </div>
        <div>
          <label htmlFor="a-email" className={label}>Email</label>
          <input id="a-email" name="email" type="email" autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="a-area" className={label}>Where in Abuja do you live?</label>
          <input id="a-area" name="area" className={input} placeholder="e.g. Kubwa" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="a-exp" className={label}>Your experience</label>
          <textarea id="a-exp" name="experience" rows={3} className={input} placeholder="Where have you worked before, and what did you do there?" />
        </div>
        <div>
          <label htmlFor="a-avail" className={label}>When can you start?</label>
          <input id="a-avail" name="availability" className={input} placeholder="e.g. Immediately, or 1st November" />
        </div>
        <div>
          <span className={label}>CV (optional)</span>
          <label htmlFor="a-cv" className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line hover:ring-brand">
            <span className="truncate text-sm text-muted">{fileName || 'PDF, Word or photo, up to 5 MB'}</span>
            <span className="shrink-0 text-sm font-semibold text-brand">Choose file</span>
          </label>
          <input
            id="a-cv"
            name="cv"
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="a-about" className={label}>Tell us about yourself</label>
          <textarea id="a-about" name="about" rows={4} className={input} placeholder="Why would you like to work with us?" />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl bg-highlight/10 px-4 py-3 text-sm font-semibold text-highlight">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-8 !px-8 !py-4 text-base" disabled={busy}>
        {busy ? 'Sending…' : 'Send application'}
      </button>
    </form>
  )
}
