import { useEffect, useRef, useState, type ReactNode } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Headline whose words rise in one by one; `highlight` gets an animated icing underline. */
export function AnimatedHeadline({
  text,
  highlight,
  className = '',
  as: Tag = 'h1',
}: {
  text: string
  highlight?: string
  className?: string
  as?: 'h1' | 'h2'
}) {
  const hl = (highlight ?? '').trim()
  const idx = hl ? text.toLowerCase().indexOf(hl.toLowerCase()) : -1
  const before = idx >= 0 ? text.slice(0, idx) : text
  const middle = idx >= 0 ? text.slice(idx, idx + hl.length) : ''
  const after = idx >= 0 ? text.slice(idx + hl.length) : ''
  const beforeWords = before.split(/\s+/).filter(Boolean)
  const afterWords = after.split(/\s+/).filter(Boolean)
  const step = 0.09
  let i = 0
  const word = (w: string, key: string) => (
    <span key={key} className="rise-word" style={{ animationDelay: `${(i++) * step}s` }}>
      {w}
    </span>
  )
  const nodes: ReactNode[] = []
  beforeWords.forEach((w, n) => {
    nodes.push(word(w, `b${n}`), ' ')
  })
  if (middle) {
    const delay = i * step
    i++
    nodes.push(
      <span key="hl" className="rise-word" style={{ animationDelay: `${delay}s` }}>
        <span className="icing">
          {middle}
          <svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M3 12 C 25 3, 45 18, 68 10 S 110 3, 135 11 S 175 17, 197 8"
              style={{ animationDelay: `${delay + 0.45}s` }}
            />
          </svg>
        </span>
      </span>,
      ' ',
    )
  }
  afterWords.forEach((w, n) => {
    nodes.push(word(w, `a${n}`), ' ')
  })
  return (
    <Tag className={className} aria-label={text}>
      <span aria-hidden="true">{nodes}</span>
    </Tag>
  )
}

/** Cycles through words with a slide-up transition. */
export function Rotator({ items, interval = 2400, className = '' }: { items: string[]; interval?: number; className?: string }) {
  const [current, setCurrent] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  useEffect(() => {
    if (items.length < 2) return
    const t = setInterval(() => {
      setCurrent((c) => {
        setLeaving(c)
        return (c + 1) % items.length
      })
    }, interval)
    return () => clearInterval(t)
  }, [items.length, interval])
  if (!items.length) return null
  return (
    <span className={`rotator ${className}`} aria-live="off">
      {items.map((item, n) => (
        <span key={item + n} className={n === current ? 'is-current' : n === leaving ? 'is-leaving' : ''} aria-hidden={n !== current}>
          {item}
        </span>
      ))}
    </span>
  )
}

/** Fades and slides children up when they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ ['--delay' as string]: `${delay}s` }}
    >
      {children}
    </Tag>
  )
}

const SPRINKLE_COLOURS = ['var(--c-primary)', 'var(--c-accent)', 'var(--c-highlight)', '#ffffff', '#93C5FD', '#FDE68A']

/** Fires a sprinkle burst from an element. */
export function burstSprinkles(host: HTMLElement) {
  if (prefersReducedMotion()) return
  host.classList.remove('pop')
  void host.offsetWidth
  host.classList.add('pop')
  for (let n = 0; n < 18; n++) {
    const s = document.createElement('span')
    s.className = 'sprinkle'
    const angle = Math.random() * Math.PI * 2
    const dist = 45 + Math.random() * 55
    s.style.background = SPRINKLE_COLOURS[n % SPRINKLE_COLOURS.length]
    s.style.setProperty('--x', `${Math.cos(angle) * dist}px`)
    s.style.setProperty('--y', `${Math.sin(angle) * dist - 18}px`)
    s.style.setProperty('--r', `${Math.random() * 540}deg`)
    host.appendChild(s)
    setTimeout(() => s.remove(), 950)
  }
}

/** Background video that respects reduced-motion and falls back to the poster image. */
export function LoopVideo({ src, poster, className = '' }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (prefersReducedMotion()) v.pause()
    else v.play().catch(() => {})
  }, [src])
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  )
}
