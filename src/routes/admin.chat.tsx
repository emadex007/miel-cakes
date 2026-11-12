import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ding } from '~/components/admin/ding'
import { Messages, PageTitle, useAction } from '~/components/admin/ui'
import { ArrowLeftIcon, PaperclipIcon, WhatsAppIcon } from '~/components/icons'
import { chatDelete, chatImageUrl, chatList, chatReply, chatReplyPicture, chatSaveContact, chatSetStatus, chatThread } from '~/lib/chat-client'
import { ChatPicture } from '~/components/Chat'
import type { ChatConversation, ChatMessage } from '~/lib/chat-types'
import { toIntlPhone, whatsappLink } from '~/lib/format'

export const Route = createFileRoute('/admin/chat')({
  component: ChatAdmin,
})

const timeOf = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
}

const ago = (iso: string) => {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (Number.isNaN(mins)) return ''
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function ChatAdmin() {
  const [list, setList] = useState<ChatConversation[]>([])
  const [business, setBusiness] = useState('Miel Cakes')
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [filter, setFilter] = useState<'open' | 'closed'>('open')
  const knownUnread = useRef<number | null>(null)

  // Load now, then refresh every few seconds; ding when new messages arrive
  useEffect(() => {
    let stop = false
    async function refresh() {
      if (document.hidden && knownUnread.current !== null) return
      try {
        const { conversations: next, business: name } = await chatList()
        if (stop) return
        setBusiness(name)
        const unread = next.reduce((n, c) => n + c.unread_admin, 0)
        if (knownUnread.current !== null && unread > knownUnread.current) ding()
        knownUnread.current = unread
        setList(next)
        setLoadError('')
      } catch (e) {
        if (!stop) setLoadError(e instanceof Error ? e.message : 'Could not load chats.')
      } finally {
        if (!stop) setLoaded(true)
      }
    }
    refresh()
    const id = setInterval(refresh, 5000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [])

  const shown = list.filter((c) => c.status === filter)
  const current = list.find((c) => c.id === selected) ?? null

  return (
    <>
      <PageTitle title="Live chat">
        Messages from the chat button on your website. You show as &ldquo;Online now&rdquo; to visitors while this dashboard is open.
      </PageTitle>

      <div className="admin-card grid min-h-[560px] overflow-hidden lg:grid-cols-[300px_1fr]">
        <div className={`border-[#e3e7f0] lg:border-r ${current ? 'hidden lg:block' : ''}`}>
          <div className="flex gap-1 border-b border-[#e3e7f0] p-2">
            {(['open', 'closed'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${filter === f ? 'bg-cocoa text-white' : 'hover:bg-[#f6f7fb]'}`}
              >
                {f === 'open' ? `Open (${list.filter((c) => c.status === 'open').length})` : 'Closed'}
              </button>
            ))}
          </div>
          {loadError && <p className="m-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>}
          {!loaded ? (
            <p className="p-6 text-center text-sm text-[#667085]">Loading chats…</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-[#667085]">
              {filter === 'open' ? 'No open chats. New ones appear here as soon as a visitor writes.' : 'No closed chats.'}
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-[#eceff5] overflow-y-auto">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f6f7fb] ${selected === c.id ? 'bg-[#eef1f7]' : ''}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand font-display text-lg text-white">
                      {(c.name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${c.unread_admin ? 'font-bold' : 'font-semibold'}`}>{c.name || 'Visitor'}</span>
                        <span className="shrink-0 text-xs text-[#98a2b3]">{ago(c.last_message_at)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${c.unread_admin ? 'text-cocoa' : 'text-[#667085]'}`}>
                          {c.last_from === 'admin' ? 'You: ' : ''}
                          {c.last_message}
                        </span>
                        {c.unread_admin > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-highlight px-1.5 text-xs font-bold text-white">
                            {c.unread_admin}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {current ? (
          <Thread
            key={current.id}
            conv={current}
            business={business}
            onBack={() => setSelected(null)}
            onChanged={async () => setList((await chatList()).conversations)}
            onDeleted={async () => {
              setSelected(null)
              setList((await chatList()).conversations)
            }}
          />
        ) : (
          <div className="hidden items-center justify-center p-10 text-center text-[#667085] lg:flex">Choose a chat on the left to read and reply.</div>
        )}
      </div>
    </>
  )
}

function Thread({
  conv,
  business,
  onBack,
  onChanged,
  onDeleted,
}: {
  conv: ChatConversation
  business: string
  onBack: () => void
  onChanged: () => void
  onDeleted: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const lastId = useRef(0)
  const end = useRef<HTMLDivElement>(null)
  const pic = useRef<HTMLInputElement>(null)
  const { busy, error, notice, run } = useAction()

  async function sendPicture(file: File | undefined) {
    if (!file) return
    const caption = text.trim()
    const ok = await run(() => chatReplyPicture({ id: conv.id, file, caption }))
    if (pic.current) pic.current.value = ''
    if (ok) {
      setText('')
      await load()
      onChanged()
    }
  }

  async function load() {
    try {
      const next = await chatThread({ id: conv.id, after: lastId.current })
      if (next.length) {
        lastId.current = next[next.length - 1].id
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...prev, ...next.filter((m) => !seen.has(m.id))]
        })
      }
    } catch {
      /* try again next time */
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => !document.hidden && load(), 3500)
    return () => clearInterval(id)
  }, [])
  // Braces matter: newer browsers return a Promise from scrollIntoView, and React
  // would try to call whatever an effect returns as its clean-up function.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    const body = text.trim()
    if (!body) return
    const ok = await run(() => chatReply({ id: conv.id, body }))
    if (ok) {
      setText('')
      await load()
      onChanged()
    }
  }

  const wa = conv.phone ? whatsappLink(toIntlPhone(conv.phone), `Hello ${(conv.name || 'there').split(' ')[0]}, this is ${business} following up on your chat with us.`) : ''

  return (
    <div className="flex min-h-[560px] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e3e7f0] px-4 py-3">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-[#667085] lg:hidden"><ArrowLeftIcon className="mr-1 inline h-4 w-4 align-[-3px]" />Chats</button>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{conv.name || 'Visitor'}</p>
          <p className="truncate text-xs text-[#667085]">
            {[conv.phone, conv.email].filter(Boolean).join(' · ') || 'No contact details left'}
            {conv.customer_id ? ' · has an account' : ''}
            {conv.page ? ` · started on ${conv.page}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="flex items-center gap-1 font-semibold text-brand hover:underline">
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {(conv.phone || conv.email) && (
            <button
              type="button"
              className="font-semibold text-brand hover:underline"
              onClick={() => run(async () => {
                const r = await chatSaveContact(conv.id)
                return r
              }, 'Saved to Customers (or they were already there).')}
              disabled={busy}
            >
              Save to customers
            </button>
          )}
          <button
            type="button"
            className="rounded-full px-3 py-1.5 font-semibold ring-1 ring-[#d0d5e2] hover:ring-brand"
            onClick={async () => {
              if (await run(() => chatSetStatus({ id: conv.id, status: conv.status === 'open' ? 'closed' : 'open' }))) onChanged()
            }}
            disabled={busy}
          >
            {conv.status === 'open' ? 'Mark as done' : 'Reopen'}
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              Delete?
              <button type="button" className="font-semibold text-red-700" onClick={async () => (await run(() => chatDelete(conv.id))) && onDeleted()}>Yes</button>
              <button type="button" className="text-[#667085]" onClick={() => setConfirmDelete(false)}>No</button>
            </span>
          ) : (
            <button type="button" className="text-[#98a2b3] hover:text-red-700" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] flex-1 space-y-3 overflow-y-auto bg-[#f6f7fb] px-4 py-5">
        {messages.map((m) => {
          const mine = m.sender === 'admin'
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-white ring-1 ring-[#e3e7f0]'}`}>
                {m.image_key && <ChatPicture src={chatImageUrl(m.image_key)} />}
                {m.body}
              </div>
              <span className="mt-1 px-1 text-[11px] text-[#98a2b3]">
                {mine ? m.admin_name || 'You' : conv.name} · {timeOf(m.created_at)}
              </span>
            </div>
          )
        })}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="border-t border-[#e3e7f0] p-3">
        <div className="flex items-end gap-2">
          <input ref={pic} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => sendPicture(e.target.files?.[0])} />
          <button
            type="button"
            aria-label="Send a picture"
            title="Send a picture"
            disabled={busy}
            onClick={() => pic.current?.click()}
            className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl text-[#667085] ring-1 ring-[#d0d5e2] hover:text-brand hover:ring-brand disabled:opacity-40"
          >
            <PaperclipIcon />
          </button>
          <textarea
            aria-label="Your reply"
            rows={2}
            className="admin-input flex-1 resize-none"
            placeholder="Type your reply… (Enter to send, Shift+Enter for a new line)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button type="submit" className="btn btn-primary !py-3" disabled={busy || !text.trim()}>Send</button>
        </div>
        {!conv.phone && !conv.email && (
          <p className="mt-2 text-xs text-[#667085]">They didn&rsquo;t leave contact details, so they&rsquo;ll only see your reply if they come back to the website on the same phone or computer.</p>
        )}
        <div className="mt-2"><Messages error={error} notice={notice} /></div>
      </form>
    </div>
  )
}
