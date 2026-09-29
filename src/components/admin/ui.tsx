import { useRef, useState, type ReactNode } from 'react'
import { isVideoUrl } from '~/lib/format'

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
