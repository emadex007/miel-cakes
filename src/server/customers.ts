// Server-only helpers for customer details (accounts and guests).
import { isGuestEmail } from './auth'
import { db } from './db'

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)

/** Adds someone to the owner's customer records, unless that phone or email is already there. */
export async function addClientRecord(name: string, phone: string, email: string, note = 'Signed up on the website') {
  const known = await db()
    .prepare("SELECT id FROM clients WHERE (phone = ? AND phone != '') OR (email = ? AND email != '')")
    .bind(phone, email)
    .first()
  if (!known) {
    await db()
      .prepare("INSERT INTO clients (name, phone, email, source, notes) VALUES (?, ?, ?, 'website', ?)")
      .bind(name, phone, email, note)
      .run()
  }
}

/**
 * Name and email for an order or booking. Guests type them at checkout; people
 * with an account can change them for this order. Guests' details are also
 * saved on their guest record and added to the owner's customer list.
 */
export async function contactDetails(
  me: { id: number; name: string; email: string; is_guest: number },
  nameIn: string,
  emailIn: string,
  phone: string,
) {
  const name = str(nameIn, 100) || me.name
  const email = (str(emailIn, 200) || (isGuestEmail(me.email) ? '' : me.email)).toLowerCase()
  if (!name) throw new Error('Please enter your name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address, so we can send you updates.')
  if (me.is_guest) {
    await db().prepare('UPDATE customers SET name = ?, phone = ? WHERE id = ?').bind(name, phone, me.id).run()
    await addClientRecord(name, phone, email, 'Ordered on the website')
  }
  return { name, email }
}

