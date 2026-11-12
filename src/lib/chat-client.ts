// Browser side of the live chat. Talks to plain endpoints on our own Worker
// (/api/chat/...), handled in src/server/chat-api.ts.
import type { ChatConversation, ChatMessage, ChatPollResult } from './chat-types'

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/chat/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? { accept: 'application/json' } : { 'content-type': 'application/json', accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

type Me = { name: string; phone: string; email: string }

// ----- visitors -----
export const chatHello = () => call<{ online: boolean; me: Me | null }>('hello')
export const chatStart = (d: { name: string; phone: string; email: string; message: string; page: string; website?: string }) =>
  call<{ token: string; hasContact: boolean }>('start', d)
export const chatUpdateContact = (d: { token: string; name: string; phone: string; email: string }) => call<{ ok: true }>('contact', d)
export const chatPoll = (d: { token: string; after: number; open: boolean }) => call<ChatPollResult>('poll', d)
export const chatSend = (d: { token: string; body: string }) => call<{ ok: true }>('send', d)

// ----- dashboard -----
export const chatUnreadCount = () => call<{ unread: number }>('admin/unread')
export const chatList = () => call<{ conversations: ChatConversation[]; business: string }>('admin/list')
export const chatThread = (d: { id: number; after: number }) => call<ChatMessage[]>('admin/thread', d)
export const chatReply = (d: { id: number; body: string }) => call<{ ok: true }>('admin/reply', d)
export const chatSetStatus = (d: { id: number; status: 'open' | 'closed' }) => call<{ ok: true }>('admin/status', d)
export const chatDelete = (id: number) => call<{ ok: true }>('admin/delete', { id })
export const chatSaveContact = (id: number) => call<{ already: boolean }>('admin/save-contact', { id })
