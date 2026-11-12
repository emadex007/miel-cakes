// A date field that always shows and picks dates as day/month/year, the same
// on every phone and computer (the browser's own date box varies by device).
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDMY } from '~/lib/format'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayIso = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10) // Abuja

/** Accepts 24/12/2026, 24-12-2026 or 24.12.2026 and returns 2026-12-24 (or '' if not a real date). */
export function parseDMY(text: string) {
  const m = /^\s*(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4})\s*$/.exec(text)
  if (!m) return ''
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return ''
  return iso(y, mo - 1, d)
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  blocked,
  required,
  className = '',
  variant = 'site',
  placeholder = 'dd/mm/yyyy',
}: {
  id?: string
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  /** Dates that can't be chosen, with an optional reason shown on hover. */
  blocked?: Map<string, string> | Set<string>
  required?: boolean
  className?: string
  variant?: 'site' | 'admin'
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(formatDMY(value))
  const start = value || (min && min > todayIso() ? min : todayIso())
  const [view, setView] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }))
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setText(formatDMY(value))
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1))
    const lead = (first.getUTCDay() + 6) % 7 // Monday first
    const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
    const out: (number | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= count; d++) out.push(d)
    while (out.length % 7) out.push(null)
    return out
  }, [view])

  const why = (d: string) => {
    if (min && d < min) return 'Too soon'
    if (max && d > max) return 'Too far ahead'
    if (blocked && blocked.has(d)) return (blocked instanceof Map ? blocked.get(d) : '') || 'Fully booked'
    return ''
  }

  function openAt() {
    const s = value || (min && min > todayIso() ? min : todayIso())
    setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 })
    setOpen(true)
  }
  function move(by: number) {
    setView((v) => {
      const m = v.m + by
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }
    })
  }
  function commitText() {
    if (!text.trim()) {
      if (value) onChange('')
      return
    }
    const parsed = parseDMY(text)
    if (parsed) onChange(parsed)
    else setText(formatDMY(value))
  }

  const admin = variant === 'admin'
  const today = todayIso()
  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          className={`${className} pr-11`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onFocus={() => !open && openAt()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitText()
              setOpen(false)
            }
          }}
          pattern="\d{1,2}/\d{1,2}/\d{4}"
          title="Day/month/year, e.g. 24/12/2026"
        />
        <button
          type="button"
          aria-label="Open calendar"
          onClick={() => (open ? setOpen(false) : openAt())}
          className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center ${admin ? 'text-[#667085] hover:text-[#101828]' : 'text-cocoa/70 hover:text-brand'}`}
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className={`absolute left-0 z-40 mt-2 w-[19rem] rounded-2xl p-3 shadow-xl ring-1 ${admin ? 'bg-white ring-[#e3e7f0]' : 'bg-white ring-line'}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="rounded-full p-2 hover:bg-black/5">
              <ChevronLeftIcon />
            </button>
            <p className="text-sm font-bold">
              {MONTHS[view.m]} {view.y}
            </p>
            <button type="button" onClick={() => move(1)} aria-label="Next month" className="rounded-full p-2 hover:bg-black/5">
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[#98a2b3]">
            {DAYS.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />
              const day = iso(view.y, view.m, d)
              const reason = why(day)
              const chosen = day === value
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!reason}
                  title={reason ? `${formatDMY(day)}: ${reason}` : formatDMY(day)}
                  aria-label={`${d} ${MONTHS[view.m]} ${view.y}${reason ? `, ${reason}` : ''}`}
                  aria-pressed={chosen}
                  onClick={() => {
                    onChange(day)
                    setText(formatDMY(day))
                    setOpen(false)
                  }}
                  className={`h-9 rounded-xl text-sm tabular transition ${
                    chosen
                      ? admin
                        ? 'bg-[#1d4ed8] font-bold text-white'
                        : 'bg-cocoa font-bold text-cream'
                      : reason
                        ? `cursor-not-allowed text-[#c5cad3] ${blocked?.has(day) ? 'line-through' : ''}`
                        : `hover:bg-black/5 ${day === today ? 'font-bold ring-1 ring-current' : ''}`
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-center text-[11px] text-[#98a2b3]">Day/month/year. You can also type it, e.g. 24/12/2026</p>
        </div>
      )}
    </div>
  )
}
