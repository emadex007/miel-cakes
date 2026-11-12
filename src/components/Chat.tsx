import { useEffect, useRef, useState } from 'react'
import { chatHello, chatPoll, chatSend, chatStart, chatUpdateContact } from '~/lib/chat-client'
import type { ChatMessage } from '~/lib/chat-types'
import { whatsappLink } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import { CloseIcon, WhatsAppIcon } from './icons'

const TOKEN_KEY = 'mc_chat_token'
const TEASER_KEY = 'mc_chat_teaser_closed'
const OPEN_EVENT = 'mc:open-chat'
const POPUP_DELAY = 4000

/** Opens the live chat from anywhere (buttons, links). */
export function openChat() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export const chatTime = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'))
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
}

function store(kind: 'local' | 'session') {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}
const readToken = () => {
  try {
    return store('local')?.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}
const writeToken = (t: string) => {
  try {
    if (t) store('local')?.setItem(TOKEN_KEY, t)
    else store('local')?.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked: the chat still works until the page is closed */
  }
}

function ChatIcon({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth="2.6" />
    </svg>
  )
}

function SendIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function Avatar({ s, size = 'h-9 w-9', online }: { s: SiteSettings; size?: string; online?: boolean }) {
  const name = s.chat_agent_name || s.business_name || 'Us'
  return (
    <span className={`relative inline-flex shrink-0 ${size}`}>
      {s.chat_agent_photo ? (
        <img src={s.chat_agent_photo} alt="" className={`${size} rounded-full object-cover ring-2 ring-white`} />
      ) : (
        <span className={`${size} flex items-center justify-center rounded-full bg-brand font-display text-white ring-2 ring-white`}>{name.trim().charAt(0).toUpperCase()}</span>
      )}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden="true" />
      )}
    </span>
  )
}

/** Live chat: a friendly pop-up hello with a message box, which opens into the full chat. */
export function LiveChat({ s }: { s: SiteSettings }) {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const [token, setToken] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState<string[]>([])
  const [unread, setUnread] = useState(0)
  const [online, setOnline] = useState(false)
  const [hasContact, setHasContact] = useState(true)
  const [me, setMe] = useState<{ name: string; phone: string; email: string } | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lastId = useRef(0)
  const listEnd = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  const agent = s.chat_agent_name || s.business_name
  const left = s.chat_on_left === '1'
  const side = left ? 'left-3 sm:left-6' : 'right-3 sm:right-6'

  // Start: pick up an earlier conversation, pop the hello after a few seconds, listen for "open chat" buttons
  useEffect(() => {
    setToken(readToken())
    setReady(true)
    let dismissed = false
    try {
      dismissed = store('session')?.getItem(TEASER_KEY) === '1'
    } catch {
      dismissed = false
    }
    const t = s.chat_popup === '1' && !dismissed ? setTimeout(() => !openRef.current && setTeaser(true), POPUP_DELAY) : undefined
    const onOpen = () => {
      setTeaser(false)
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    // Only ask who's online when there's no earlier chat to check (that check tells us anyway),
    // so the two requests never start at the same moment.
    if (!readToken()) {
      chatHello()
        .then((r) => {
          setOnline(r.online)
          setMe(r.me)
        })
        .catch(() => null)
    }
    return () => {
      if (t) clearTimeout(t)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  async function poll() {
    const t = readToken()
    if (!t || document.hidden) return
    try {
      const r = await chatPoll({ token: t, after: lastId.current, open: openRef.current })
      if (r.gone) {
        writeToken('')
        setToken('')
        setMessages([])
        lastId.current = 0
        return
      }
      setOnline(r.online)
      setHasContact(r.hasContact)
      if (r.messages.length) {
        lastId.current = r.messages[r.messages.length - 1].id
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...prev, ...r.messages.filter((m) => !seen.has(m.id))]
        })
        setPending([])
      }
      setUnread(r.unread)
      if (r.unread > 0 && !openRef.current) setTeaser(true) // a reply arrived: show it
    } catch {
      /* offline for a moment: try again next time */
    }
  }

  // Check for replies: often while the chat is open, now and then while it's closed
  useEffect(() => {
    if (!token) return
    poll()
    const id = setInterval(poll, open ? 3500 : 20000)
    return () => clearInterval(id)
  }, [token, open])

  useEffect(() => {
    if (!open) return
    setUnread(0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    setTimeout(() => input.current?.focus(), 150)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending.length, open, hasContact])

  async function send(body: string) {
    const message = body.trim()
    if (!message || busy) return
    setError('')
    setBusy(true)
    setPending((p) => [...p, message])
    setText('')
    setTeaser(false)
    setOpen(true)
    try {
      if (!token) {
        const r = await chatStart({ name: me?.name ?? '', phone: me?.phone ?? '', email: me?.email ?? '', message, page: window.location.pathname })
        if (!r.token) return
        writeToken(r.token)
        lastId.current = 0
        setMessages([])
        setHasContact(r.hasContact)
        setToken(r.token) // starts polling, which brings the message back from the server
      } else {
        await chatSend({ token, body: message })
        await poll()
      }
    } catch (err) {
      setPending((p) => p.filter((x) => x !== message))
      setText(message)
      setError(err instanceof Error ? err.message : 'Couldn’t send. Please try again.')
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  function closeTeaser() {
    setTeaser(false)
    try {
      store('session')?.setItem(TEASER_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  function newChat() {
    writeToken('')
    setToken('')
    setMessages([])
    setPending([])
    setHasContact(true)
    lastId.current = 0
  }

  if (!ready || s.chat_enabled !== '1') return null
  const wa = s.chat_show_whatsapp === '1' ? whatsappLink(s.whatsapp, `Hello ${s.business_name}! I found you on your website.`) : ''
  const lastReply = [...messages].reverse().find((m) => m.sender === 'admin')
  const showContactCard = !!token && !hasContact && messages.some((m) => m.sender === 'visitor')

  const composer = (compact: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        send(text)
      }}
      className={`flex items-end gap-2 ${compact ? 'p-3 pt-0' : 'border-t border-line bg-white p-3'}`}
    >
      <textarea
        ref={compact ? undefined : input}
        rows={1}
        aria-label="Write a message"
        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-cream px-4 py-3 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand"
        placeholder="Write a message…"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(text)
          }
        }}
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={busy || !text.trim()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-[var(--c-hover)] hover:text-[var(--c-hover-text)] disabled:bg-line disabled:text-muted"
      >
        <SendIcon />
      </button>
    </form>
  )

  return (
    <>
      {/* ---------- Full chat ---------- */}
      {open && (
        <div
          role="dialog"
          aria-label={`Chat with ${agent}`}
          className={`fixed inset-x-2 bottom-2 z-[60] flex max-h-[min(640px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-3xl bg-cream shadow-[0_24px_60px_-12px_rgba(0,0,0,.45)] ring-1 ring-line sm:inset-x-auto sm:bottom-6 sm:h-[600px] sm:w-[380px] ${left ? 'sm:left-6' : 'sm:right-6'}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-3 bg-cocoa px-4 py-3.5 text-cream">
            <Avatar s={s} size="h-11 w-11" online={online} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg leading-tight">{agent}</p>
              <p className="text-xs text-cream/75">{online ? 'Online now · we reply very fast' : 'Away · we’ll reply as soon as we can'}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close chat">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <Bubble mine={false} who={agent}>
              {s.chat_greeting}
            </Bubble>
            {!online && !token && s.chat_away_note && <p className="rounded-2xl bg-honey px-4 py-3 text-sm text-cocoa/85">{s.chat_away_note}</p>}
            {messages.map((m) => (
              <Bubble key={m.id} mine={m.sender === 'visitor'} who={m.sender === 'admin' ? m.admin_name || agent : ''} time={chatTime(m.created_at)}>
                {m.body}
              </Bubble>
            ))}
            {pending.map((p, i) => (
              <Bubble key={`p${i}`} mine who="" time="Sending…">
                {p}
              </Bubble>
            ))}
            {showContactCard && <ContactCard token={token} me={me} onSaved={() => setHasContact(true)} />}
            <div ref={listEnd} />
          </div>

          {error && <p role="alert" className="bg-white px-4 pt-2 text-xs font-semibold text-highlight">{error}</p>}
          {composer(false)}
          <div className="flex items-center justify-between bg-white px-4 pb-3 text-xs text-muted">
            {token ? (
              <button type="button" onClick={newChat} className="hover:text-brand">Start a new chat</button>
            ) : (
              <span>We usually reply within minutes</span>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-1 hover:text-brand">
                <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp instead
              </a>
            )}
          </div>
        </div>
      )}

      {/* ---------- Pop-up hello (like a friendly person saying hi) ---------- */}
      {!open && teaser && (
        <div
          className={`chat-pop fixed bottom-3 z-50 w-[calc(100vw-1.5rem)] max-w-[300px] sm:bottom-6 ${side}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-semibold shadow-md ring-1 ring-line">
              <Avatar s={s} size="h-6 w-6" online={online} />
              {agent}
            </button>
            <button type="button" onClick={closeTeaser} className="rounded-full bg-white p-1.5 shadow-md ring-1 ring-line hover:text-highlight" aria-label="Close">
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_44px_-12px_rgba(0,0,0,.35)] ring-1 ring-line">
            <button type="button" onClick={() => setOpen(true)} className="block w-full p-3 text-left">
              <span className="block whitespace-pre-line rounded-2xl rounded-bl-md bg-soft px-4 py-3 text-sm leading-relaxed text-cocoa">
                {unread > 0 && lastReply ? lastReply.body : s.chat_greeting}
              </span>
              {unread > 0 && <span className="mt-1.5 block px-1 text-xs font-semibold text-brand">{unread} new message{unread === 1 ? '' : 's'} · tap to read</span>}
            </button>
            {composer(true)}
          </div>
        </div>
      )}

      {/* ---------- Round button (after the hello is closed) ---------- */}
      {!open && !teaser && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread ? `Chat with us, ${unread} new message${unread === 1 ? '' : 's'}` : s.chat_title || 'Chat with us'}
          className={`chat-pop group fixed bottom-4 z-50 flex items-center gap-2 rounded-full bg-brand p-3.5 text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,.45)] transition hover:scale-105 sm:bottom-6 ${side}`}
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <ChatIcon />
          <span className="hidden whitespace-nowrap pr-1 font-semibold sm:inline">{s.chat_title || 'Chat with us'}</span>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-bold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      )}
    </>
  )
}

/** After the first message: ask for a name and phone so the bakery can reply even if they leave. */
function ContactCard({ token, me, onSaved }: { token: string; me: { name: string; phone: string; email: string } | null; onSaved: () => void }) {
  const [form, setForm] = useState({ name: me?.name ?? '', phone: me?.phone ?? '', email: me?.email ?? '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [skipped, setSkipped] = useState(false)
  if (skipped) return null
  const field = 'w-full rounded-xl border-0 bg-cream px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand'
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await chatUpdateContact({ token, ...form })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={save} className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="text-sm font-semibold">So we can reply even if you leave the page:</p>
      <input aria-label="Your name" className={field} placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input aria-label="Phone or WhatsApp number" type="tel" className={field} placeholder="Phone / WhatsApp number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input aria-label="Email (optional)" type="email" className={field} placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      {error && <p role="alert" className="text-xs font-semibold text-highlight">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary !px-5 !py-2 text-sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setSkipped(true)} className="text-xs font-semibold text-muted hover:text-cocoa">
          Not now
        </button>
      </div>
    </form>
  )
}

function Bubble({ mine, who, time, children }: { mine: boolean; who: string; time?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white text-cocoa ring-1 ring-line'
        }`}
      >
        {children}
      </div>
      {(who || time) && (
        <span className="mt-1 px-1 text-[11px] text-muted">
          {who}
          {who && time ? ' · ' : ''}
          {time}
        </span>
      )}
    </div>
  )
}
