// Shapes shared by the chat endpoints (src/server/chat-api.ts) and the pages that use them.

export interface ChatMessage {
  id: number
  sender: 'visitor' | 'admin'
  admin_name: string
  body: string
  /** A picture sent in the chat (private storage key), or '' */
  image_key?: string
  created_at: string
}

export interface ChatConversation {
  id: number
  customer_id: number | null
  name: string
  phone: string
  email: string
  page: string
  status: 'open' | 'closed'
  unread_admin: number
  unread_visitor: number
  last_message: string
  last_from: 'visitor' | 'admin'
  last_message_at: string
  created_at: string
}

export type ChatPollResult =
  | { gone: true }
  | { gone: false; messages: ChatMessage[]; unread: number; online: boolean; name: string; hasContact: boolean }

export interface ChatBotTopic {
  id: string
  label: string
  answer: string
  link?: { href: string; label: string }
}
