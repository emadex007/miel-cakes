import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Field, MediaField, Messages, PageTitle, Toggle, useAction } from '~/components/admin/ui'
import { Stars } from '~/components/Extras'
import { deleteReview, listReviewsAdmin, saveReview, type ReviewInput } from '~/fns/reviews'
import type { Review } from '~/lib/types'

export const Route = createFileRoute('/admin/reviews')({
  loader: () => listReviewsAdmin(),
  component: ReviewsAdmin,
})

const blank = (): ReviewInput => ({ name: '', occasion: '', body: '', rating: 5, photo_url: '', is_visible: true, sort: 0 })
const toInput = (r: Review): ReviewInput => ({ ...r, is_visible: !!r.is_visible })

function ReviewsAdmin() {
  const reviews = Route.useLoaderData()
  const router = useRouter()
  const { busy, error, notice, run } = useAction()
  const [editing, setEditing] = useState<ReviewInput | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveReview({ data: editing }), 'Review saved.')
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }
  async function toggle(r: Review, visible: boolean) {
    await run(() => saveReview({ data: { ...toInput(r), is_visible: visible } }))
    router.invalidate()
  }
  async function remove(id: number) {
    const ok = await run(() => deleteReview({ data: id }), 'Review deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <PageTitle
        title="Reviews"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(blank())}>
            + Add a review
          </button>
        }
      >
        Kind words from real customers, shown on the homepage. Copy them from WhatsApp, Instagram or Google, and ask the customer
        first. A first name is enough.
      </PageTitle>
      <div className="mb-4">
        <Messages error={error} notice={notice} />
      </div>

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <h2 className="text-lg font-bold sm:col-span-2">{editing.id ? 'Edit review' : 'New review'}</h2>
          <div className="space-y-5">
            <Field label="Customer name *" help="e.g. Ada, or Ada O." htmlFor="rv-name">
              <input id="rv-name" required className="admin-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="What they ordered (optional)" htmlFor="rv-occasion">
              <input id="rv-occasion" className="admin-input" value={editing.occasion} onChange={(e) => setEditing({ ...editing, occasion: e.target.value })} placeholder="e.g. 30th birthday cake" />
            </Field>
            <Field label="What they said *" htmlFor="rv-body">
              <textarea id="rv-body" required rows={5} className="admin-input" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="admin-label">Stars</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditing({ ...editing, rating: n })}
                    className={`h-10 w-10 rounded-lg text-xl ${n <= editing.rating ? 'bg-accent text-cocoa' : 'bg-[#eef1f7] text-[#98a2b3]'}`}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-pressed={n === editing.rating}
                  >
                    ★
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="space-y-5">
            <Field label="Photo (optional)" help="A photo of their cake, or a screenshot of their message." htmlFor="rv-photo">
              <MediaField id="rv-photo" value={editing.photo_url} onChange={(v) => setEditing({ ...editing, photo_url: v })} />
            </Field>
            <Field label="Position" help="Lower numbers show first." htmlFor="rv-sort">
              <input id="rv-sort" type="number" className="admin-input w-28" value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} />
            </Field>
            <Toggle id="rv-visible" checked={!!editing.is_visible} onChange={(v) => setEditing({ ...editing, is_visible: v })} label="Show on website" />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save review'}</button>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">
          No reviews yet. The homepage reviews section stays hidden until you add one.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className={`admin-card space-y-3 p-5 ${r.is_visible ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <Toggle id={`rv-vis-${r.id}`} checked={!!r.is_visible} onChange={(v) => toggle(r, v)} label="Shown" />
              </div>
              <p className="line-clamp-4 text-sm">&ldquo;{r.body}&rdquo;</p>
              <p className="text-sm font-semibold">
                {r.name}
                {r.occasion && <span className="font-normal text-[#667085]"> · {r.occasion}</span>}
              </p>
              <div className="flex justify-between text-sm">
                <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setEditing(toInput(r))}>Edit</button>
                {confirmId === r.id ? (
                  <span className="flex gap-2">
                    <button type="button" className="font-semibold text-red-700" onClick={() => remove(r.id)}>Delete</button>
                    <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmId(r.id)}>Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
