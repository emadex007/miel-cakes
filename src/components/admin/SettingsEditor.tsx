import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { FIELD_GROUPS, type SiteField, type SiteSettings } from '~/lib/site-fields'
import { updateSettings } from '~/fns/admin'
import { Field, MediaField, Messages, useAction } from './ui'

export function SettingsEditor({ groupIds, initial }: { groupIds: string[]; initial: SiteSettings }) {
  const groups = FIELD_GROUPS.filter((g) => groupIds.includes(g.id))
  const [values, setValues] = useState<SiteSettings>(initial)
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState(groups[0]?.id)
  const { busy, error, notice, run } = useAction()
  const router = useRouter()
  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    setDirty(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const keys = groups.flatMap((g) => g.fields.map((f) => f.key))
    const payload = Object.fromEntries(keys.map((k) => [k, values[k] ?? '']))
    const ok = await run(() => updateSettings({ data: payload }), 'Saved. The website now shows your changes.')
    if (ok) {
      setDirty(false)
      router.invalidate()
    }
  }

  const group = groups.find((g) => g.id === tab) ?? groups[0]

  return (
    <form onSubmit={save} className="space-y-6">
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === group.id}
              onClick={() => setTab(g.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                g.id === group.id ? 'bg-cocoa text-white' : 'bg-white ring-1 ring-[#ece3df] hover:ring-brand'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      <section className="admin-card space-y-6 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-bold">{group.title}</h2>
          <p className="mt-1 text-sm text-[#85726d]">{group.description}</p>
        </div>
        {group.fields.map((f) => (
          <SettingInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
        ))}
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-[#ece3df] bg-[#faf6f4]/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        {dirty && !busy && <span className="text-sm text-[#85726d]">You have unsaved changes.</span>}
        <div className="min-w-0 flex-1">
          <Messages error={error} notice={notice} />
        </div>
      </div>
    </form>
  )
}

function SettingInput({ field: f, value, onChange }: { field: SiteField; value: string; onChange: (v: string) => void }) {
  const id = `setting-${f.key}`
  switch (f.type) {
    case 'textarea':
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <textarea id={id} className="admin-input" rows={5} value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )
    case 'lines':
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <textarea id={id} className="admin-input font-mono text-sm" rows={6} value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )
    case 'color':
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label={`${f.label} picker`}
              value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="h-11 w-14 cursor-pointer rounded-lg border border-[#ddd3cf] bg-white p-1"
            />
            <input id={id} className="admin-input max-w-[9rem] font-mono uppercase" value={value} onChange={(e) => onChange(e.target.value)} />
          </div>
        </Field>
      )
    case 'image':
    case 'video':
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <MediaField id={id} value={value} onChange={onChange} kind={f.type} />
        </Field>
      )
    case 'number':
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <input id={id} type="number" min={0} className="admin-input max-w-[10rem]" value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )
    default:
      return (
        <Field label={f.label} help={f.help} htmlFor={id}>
          <input id={id} type={f.type === 'url' ? 'url' : 'text'} className="admin-input" value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      )
  }
}
