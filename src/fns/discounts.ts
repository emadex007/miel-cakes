import { createServerFn } from '@tanstack/react-start'
import { requireOwner } from '~/server/auth'
import { db } from '~/server/db'
import { normaliseCode, type DiscountCode } from '~/server/discounts'
import { int, str } from '~/server/util'

export type { DiscountCode }

export const listDiscounts = createServerFn({ method: 'GET' }).handler(async () => {
  await requireOwner()
  const { results } = await db()
    .prepare(
      `SELECT d.*, (SELECT COALESCE(SUM(o.discount), 0) FROM orders o WHERE o.discount_code = d.code AND o.status != 'cancelled') AS total_off
       FROM discount_codes d ORDER BY d.is_active DESC, d.id DESC`,
    )
    .all<DiscountCode & { total_off: number }>()
  return results
})

export interface DiscountInput {
  id?: number
  code: string
  kind: 'percent' | 'amount'
  value: number
  min_order: number
  max_uses: number
  starts_on: string
  ends_on: string
  is_active: boolean | number
  note: string
}

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

export const saveDiscount = createServerFn({ method: 'POST' })
  .validator((d: DiscountInput) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    const code = normaliseCode(data.code)
    if (code.length < 3) throw new Error('Codes need at least 3 letters or numbers, e.g. XMAS10.')
    const kind = data.kind === 'amount' ? 'amount' : 'percent'
    const value = Math.max(0, int(data.value))
    if (!value) throw new Error(kind === 'percent' ? 'Enter how many percent off.' : 'Enter how much to take off.')
    if (kind === 'percent' && value > 90) throw new Error('A percent discount can be at most 90%.')
    const starts = isDate(str(data.starts_on, 10)) ? str(data.starts_on, 10) : ''
    const ends = isDate(str(data.ends_on, 10)) ? str(data.ends_on, 10) : ''
    if (starts && ends && ends < starts) throw new Error('The end date is before the start date.')
    const clash = await db().prepare('SELECT id FROM discount_codes WHERE code = ? AND id != ?').bind(code, int(data.id)).first()
    if (clash) throw new Error(`There is already a code called ${code}.`)
    const values = [code, kind, value, Math.max(0, int(data.min_order)), Math.max(0, int(data.max_uses)), starts, ends, data.is_active ? 1 : 0, str(data.note, 200)]
    if (data.id) {
      await db()
        .prepare('UPDATE discount_codes SET code=?, kind=?, value=?, min_order=?, max_uses=?, starts_on=?, ends_on=?, is_active=?, note=? WHERE id=?')
        .bind(...values, int(data.id))
        .run()
      return { id: int(data.id) }
    }
    const r = await db()
      .prepare('INSERT INTO discount_codes (code, kind, value, min_order, max_uses, starts_on, ends_on, is_active, note) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(...values)
      .run()
    return { id: Number(r.meta.last_row_id) }
  })

export const setDiscountActive = createServerFn({ method: 'POST' })
  .validator((d: { id: number; active: boolean }) => d)
  .handler(async ({ data }) => {
    await requireOwner()
    await db().prepare('UPDATE discount_codes SET is_active = ? WHERE id = ?').bind(data.active ? 1 : 0, int(data.id)).run()
    return { ok: true }
  })

export const deleteDiscount = createServerFn({ method: 'POST' })
  .validator((id: number) => int(id))
  .handler(async ({ data: id }) => {
    await requireOwner()
    await db().prepare('DELETE FROM discount_codes WHERE id = ?').bind(id).run()
    return { ok: true }
  })
