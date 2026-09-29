import { createFileRoute, getRouteApi, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Field, MediaField, Messages, PageTitle, Toggle, errorMessage, uploadFile, useAction } from '~/components/admin/ui'
import { deleteGalleryItem, getGallery, saveGalleryItem } from '~/fns/business'
import { parseOccasions } from '~/lib/site-fields'
import type { GalleryItem } from '~/lib/types'

const root = getRouteApi('__root__')

export const Route = createFileRoute('/admin/gallery')({
  loader: () => getGallery(),
  component: GalleryAdmin,
})

type Draft = { id?: number; image_url: string; title: string; occasion: string; description: string; featured: boolean; sort: number }
const toDraft = (g: GalleryItem): Draft => ({ ...g, featured: !!g.featured })

function GalleryAdmin() {
  const items = Route.useLoaderData()
  const s = root.useLoaderData()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [progress, setProgress] = useState('')
  const [bulkOccasion, setBulkOccasion] = useState('')
  const { busy, error, notice, run, setError, setNotice } = useAction()
  const occasionNames = parseOccasions(s.occasions).flatMap((g) => g.items)

  async function uploadMany(files: FileList | null) {
    if (!files?.length) return
    setError('')
    setNotice('')
    const failed: string[] = []
    let n = 0
    for (const f of Array.from(files)) {
      n++
      setProgress(`Uploading ${n} of ${files.length}: ${f.name}`)
      try {
        const url = await uploadFile(f)
        await saveGalleryItem({
          data: { image_url: url, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), occasion: bulkOccasion, description: '', featured: false, sort: 0 },
        })
      } catch (e) {
        failed.push(`${f.name}: ${errorMessage(e)}`)
      }
    }
    setProgress('')
    if (input.current) input.current.value = ''
    if (failed.length) setError(failed.join(' '))
    else setNotice(`Added ${files.length} photo${files.length === 1 ? '' : 's'} to the gallery. Click a photo to give it a title.`)
    router.invalidate()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    const ok = await run(() => saveGalleryItem({ data: editing }), 'Saved.')
    if (ok) {
      setEditing(null)
      router.invalidate()
    }
  }
  async function remove(id: number) {
    const ok = await run(() => deleteGalleryItem({ data: id }), 'Photo removed from the gallery.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <PageTitle title="Gallery">
        Photos of work you&rsquo;ve done. They appear on the Gallery page, the homepage and the About page. Tag each one with an
        occasion so customers can filter.
      </PageTitle>

      <section className="admin-card mb-6 flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="bulk-occasion" className="admin-label">Occasion for new photos (optional)</label>
          <input id="bulk-occasion" list="occasion-list" className="admin-input" value={bulkOccasion} onChange={(e) => setBulkOccasion(e.target.value)} placeholder="e.g. Weddings" />
        </div>
        <input ref={input} type="file" multiple accept="image/*" className="hidden" onChange={(e) => uploadMany(e.target.files)} />
        <button type="button" className="btn btn-primary" onClick={() => input.current?.click()} disabled={!!progress}>
          Upload photos
        </button>
        <button
          type="button"
          className="btn btn-ghost text-cocoa"
          onClick={() => setEditing({ image_url: '', title: '', occasion: '', description: '', featured: false, sort: 0 })}
        >
          Add from a link
        </button>
      </section>
      <datalist id="occasion-list">
        {occasionNames.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <div className="mb-4 space-y-2">
        {progress && <p className="rounded-xl bg-[#eef1f7] px-4 py-3 text-sm font-medium">{progress}</p>}
        <Messages error={error} notice={notice} />
      </div>

      {editing && (
        <form onSubmit={save} className="admin-card mb-6 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <h2 className="text-lg font-bold sm:col-span-2">{editing.id ? 'Edit photo' : 'Add a photo'}</h2>
          <Field label="Photo" htmlFor="g-image">
            <MediaField id="g-image" value={editing.image_url} onChange={(v) => setEditing({ ...editing, image_url: v })} />
          </Field>
          <div className="space-y-5">
            <Field label="Title" htmlFor="g-title">
              <input id="g-title" className="admin-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. 3-tier white and gold wedding cake" />
            </Field>
            <Field label="Occasion" help="Pick from your occasions list, or type your own." htmlFor="g-occasion">
              <input id="g-occasion" list="occasion-list" className="admin-input" value={editing.occasion} onChange={(e) => setEditing({ ...editing, occasion: e.target.value })} />
            </Field>
            <Field label="Short description (optional)" htmlFor="g-desc">
              <textarea id="g-desc" rows={3} className="admin-input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <Field label="Position" help="Lower numbers show first." htmlFor="g-sort">
              <input id="g-sort" type="number" className="admin-input w-28" value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) })} />
            </Field>
            <Toggle id="g-featured" checked={editing.featured} onChange={(v) => setEditing({ ...editing, featured: v })} label="Show first (featured)" />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save photo'}</button>
            <button type="button" className="btn btn-ghost text-cocoa" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#667085]">No photos yet. Upload pictures of cakes and trays you&rsquo;ve made.</div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g) => (
            <li key={g.id} className="admin-card overflow-hidden">
              <button type="button" className="block w-full" onClick={() => setEditing(toDraft(g))} aria-label={`Edit ${g.title || 'photo'}`}>
                <img src={g.image_url} alt={g.title} loading="lazy" className="aspect-square w-full bg-[#eef1f7] object-cover" />
              </button>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-semibold" title={g.title}>{g.title || 'Untitled'}</p>
                <p className="text-xs text-[#667085]">
                  {g.occasion || 'No occasion'}
                  {g.featured ? ' · Featured' : ''}
                </p>
                <div className="flex justify-between pt-1 text-sm">
                  <button type="button" className="font-semibold text-brand hover:underline" onClick={() => setEditing(toDraft(g))}>Edit</button>
                  {confirmId === g.id ? (
                    <span className="flex gap-2">
                      <button type="button" className="font-semibold text-red-700" onClick={() => remove(g.id)}>Remove</button>
                      <button type="button" className="text-[#667085]" onClick={() => setConfirmId(null)}>No</button>
                    </span>
                  ) : (
                    <button type="button" className="text-[#667085] hover:text-red-700" onClick={() => setConfirmId(g.id)}>Remove</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
