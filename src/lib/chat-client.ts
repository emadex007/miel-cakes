// Browser side of the live chat. Talks to plain endpoints on our own Worker
// (/api/chat/...), handled in src/server/chat-api.ts.
import type { ChatBotTopic, ChatConversation, ChatMessage, ChatPollResult } from './chat-types'

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

/** Sends a picture (shrunk first if it's a big phone photo). */
async function upload(path: string, file: File, fields: Record<string, string>) {
  const body = new FormData()
  body.append('file', await shrinkImage(file))
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  const res = await fetch(`/api/chat/${path}`, { method: 'POST', body, credentials: 'same-origin' })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; token?: string; error?: string }
  if (!res.ok) throw new Error(data.error || 'Couldn’t send the picture. Please try again.')
  return { token: data.token ?? '' }
}

/** Phone photos are often 3–8 MB: resize to at most 1600px wide as a JPEG. */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 600_000 || typeof createImageBitmap !== 'function') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export const chatImageUrl = (key: string, token?: string) =>
  token ? `/api/chat/image?k=${encodeURIComponent(key)}&t=${encodeURIComponent(token)}` : `/api/chat/admin/image?k=${encodeURIComponent(key)}`

// ----- visitors -----
export const chatBot = () => call<{ enabled: boolean; intro: string; topics: ChatBotTopic[] }>('bot')
export const chatSendPicture = (d: { token: string; file: File; caption: string; page: string }) =>
  upload('upload', d.file, { token: d.token, caption: d.caption, page: d.page })
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
export const chatReplyPicture = (d: { id: number; file: File; caption: string }) => upload('admin/upload', d.file, { id: String(d.id), caption: d.caption })
export const chatSaveContact = (id: number) => call<{ already: boolean }>('admin/save-contact', { id })
