import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { Messages, PageTitle, errorMessage, uploadFile, useAction } from '~/components/admin/ui'
import { deleteMedia, listMedia } from '~/fns/admin'

export const Route = createFileRoute('/admin/media')({
  loader: () => listMedia(),
  component: MediaAdmin,
})

const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function MediaAdmin() {
  const items = Route.useLoaderData()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [copied, setCopied] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const { error, notice, run, setError, setNotice } = useAction()

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setError('')
    setNotice('')
    let done = 0
    const failed: string[] = []
    for (const f of Array.from(files)) {
      setProgress(`Uploading ${done + 1} of ${files.length}: ${f.name}`)
      try {
        await uploadFile(f)
      } catch (e) {
        failed.push(`${f.name}: ${errorMessage(e)}`)
      }
      done++
    }
    setProgress('')
    if (input.current) input.current.value = ''
    if (failed.length) setError(failed.join(' '))
    else setNotice(`Uploaded ${done} file${done === 1 ? '' : 's'}.`)
    router.invalidate()
  }

  async function copy(id: number, url: string) {
    const full = `${window.location.origin}${url}`
    try {
      await navigator.clipboard.writeText(full)
      setCopied(id)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      setNotice(`Link: ${full}`)
    }
  }
  async function remove(id: number) {
    const ok = await run(() => deleteMedia({ data: id }), 'File deleted.')
    setConfirmId(null)
    if (ok) router.invalidate()
  }

  return (
    <>
      <PageTitle
        title="Photos & videos"
        actions={
          <>
            <input
              ref={input}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <button type="button" className="btn btn-primary" onClick={() => input.current?.click()} disabled={!!progress}>
              Upload files
            </button>
          </>
        }
      >
        Everything you upload is stored with the website. Copy a link to use it in the gallery, or upload straight from a menu item.
        Photos up to 15 MB, videos up to 90 MB.
      </PageTitle>
      <div className="mb-4 space-y-2">
        {progress && <p className="rounded-xl bg-[#f3ece9] px-4 py-3 text-sm font-medium">{progress}</p>}
        <Messages error={error} notice={notice} />
      </div>

      {items.length === 0 ? (
        <div className="admin-card p-10 text-center text-[#85726d]">
          No uploads yet. Your own photos sell your food best, so start by uploading pictures of your cakes and small chops.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.id} className="admin-card overflow-hidden">
              {m.content_type.startsWith('video/') ? (
                <video src={m.url} muted playsInline preload="metadata" className="aspect-square w-full bg-[#f3ece9] object-cover" />
              ) : (
                <img src={m.url} alt={m.filename} loading="lazy" className="aspect-square w-full bg-[#f3ece9] object-cover" />
              )}
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-semibold" title={m.filename}>{m.filename}</p>
                <p className="text-xs text-[#85726d]">{size(m.size)}</p>
                <div className="flex justify-between text-sm">
                  <button type="button" className="font-semibold text-brand hover:underline" onClick={() => copy(m.id, m.url)}>
                    {copied === m.id ? 'Copied' : 'Copy link'}
                  </button>
                  {confirmId === m.id ? (
                    <span className="flex gap-2">
                      <button type="button" className="font-semibold text-red-700" onClick={() => remove(m.id)}>Delete</button>
                      <button type="button" className="text-[#85726d]" onClick={() => setConfirmId(null)}>No</button>
                    </span>
                  ) : (
                    <button type="button" className="text-[#85726d] hover:text-red-700" onClick={() => setConfirmId(m.id)}>
                      Delete
                    </button>
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
