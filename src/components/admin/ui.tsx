import { useRef, useState, type ReactNode } from 'react'
import { isVideoUrl } from '~/lib/format'
import type { ProductMedia } from '~/lib/types'
import { ChevronLeftIcon, ChevronRightIcon } from '~/components/icons'

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Something went wrong. Try again.'

/** Runs an async action with busy + message state. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function run<T>(fn: () => Promise<T>, success?: string): Promise<T | undefined> {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const out = await fn()
      if (success) setNotice(success)
      return out
    } catch (e) {
      setError(errorMessage(e))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, notice, run, setError, setNotice }
}

export function Messages({ error, notice }: { error?: string; notice?: string }) {
  if (!error && !notice) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-xl px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}
    >
      {error || notice}
    </p>
  )
}

export function PageTitle({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-cocoa">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-[#667085]">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, help, children, htmlFor }: { label: string; help?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="admin-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help && <p className="admin-help">{help}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
      <span className="relative inline-flex">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-[#d0d5e2] transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  )
}

/** Uploads one file to R2 and returns its /media URL. */
export async function uploadFile(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed. Try again.')
  return data.url
}

/** URL box + upload button + preview, for photo or video settings. */
export function MediaField({
  id,
  value,
  onChange,
  kind = 'image',
}: {
  id: string
  value: string
  onChange: (url: string) => void
  kind?: 'image' | 'video'
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await uploadFile(file))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  const showVideo = kind === 'video' || (value && isVideoUrl(value))
  return (
    <div className="space-y-2">
      {value ? (
        showVideo ? (
          <video src={value} muted loop autoPlay playsInline className="aspect-video w-full max-w-sm rounded-xl bg-[#eef1f7] object-cover" />
        ) : (
          <img src={value} alt="" className="aspect-video w-full max-w-sm rounded-xl bg-[#eef1f7] object-cover" />
        )
      ) : (
        <div className="flex aspect-video w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-[#d0d5e2] text-sm text-[#667085]">
          No {kind} yet
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input id={id} className="admin-input min-w-0 flex-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste a link, or upload" />
        <input
          ref={input}
          type="file"
          accept={kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button type="button" className="btn btn-ghost !py-2.5 text-cocoa" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        {value && (
          <button type="button" className="px-2 text-sm font-semibold text-[#667085] hover:text-red-700" onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}

/**
 * Several photos and videos for one item. Pick many files at once; they upload
 * one after another. Drag order is kept simple: arrows move an item.
 */
export function MediaListField({ value, onChange }: { value: ProductMedia[]; onChange: (v: ProductMedia[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const latest = useRef(value)
  latest.current = value

  async function pick(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const list = Array.from(files).slice(0, 20)
    let done = 0
    for (const file of list) {
      setProgress(`Uploading ${done + 1} of ${list.length}…`)
      try {
        const url = await uploadFile(file)
        const kind: ProductMedia['kind'] = file.type.startsWith('video/') ? 'video' : 'image'
        latest.current = [...latest.current, { url, kind }]
        onChange(latest.current)
      } catch (e) {
        setError(`${file.name}: ${errorMessage(e)}`)
      }
      done++
    }
    setProgress('')
    if (input.current) input.current.value = ''
  }
  const move = (i: number, by: number) => {
    const next = [...value]
    const j = i + by
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {value.map((m, i) => (
            <li key={`${m.url}-${i}`} className="group relative overflow-hidden rounded-xl bg-[#eef1f7]">
              {m.kind === 'video' ? (
                <video src={m.url} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
              ) : (
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              )}
              {m.kind === 'video' && <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">VIDEO</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 px-1 py-0.5 text-white">
                <button type="button" aria-label="Move left" className="px-1.5 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronLeftIcon />
                </button>
                <button type="button" aria-label="Remove" className="px-1.5 text-xs font-semibold" onClick={() => onChange(value.filter((_, k) => k !== i))}>
                  Remove
                </button>
                <button type="button" aria-label="Move right" className="px-1.5 disabled:opacity-30" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  <ChevronRightIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <button type="button" className="btn btn-ghost w-full !py-2.5 text-sm" disabled={!!progress} onClick={() => input.current?.click()}>
        {progress || 'Add photos or videos'}
      </button>
      <p className="admin-help">You can pick several at once. Photos up to 15 MB, videos up to 90 MB. They show on the item&rsquo;s page after the main photo.</p>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
    </div>
  )
}
