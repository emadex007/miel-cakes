// Spreadsheet (CSV) export that opens in Excel, Google Sheets and Numbers.

export function toCsv<T>(rows: T[], columns: { label: string; value: (row: T) => string | number }[]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = columns.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\r\n')
  // The BOM makes Excel read ₦ and accented names correctly.
  return `﻿${head}\r\n${body}`
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Reads CSV text (from Excel or Google Sheets "Save as CSV") into rows of cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  // Excel in some countries uses ; between columns
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean))
}

export interface ImportedClient {
  name: string
  phone: string
  email: string
  address: string
  area: string
  birthday: string
  notes: string
}

/** Works out which column is which from the header row (Name, Phone, Email, …). */
export function clientsFromCsv(text: string): { rows: ImportedClient[]; missingHeader: boolean } {
  const all = parseCsv(text)
  if (!all.length) return { rows: [], missingHeader: false }
  const head = all[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''))
  const find = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)))
  const col = {
    name: find('name', 'fullname', 'customer', 'client'),
    first: find('firstname'),
    last: find('lastname', 'surname'),
    phone: find('phone', 'phonenumber', 'mobile', 'whatsapp', 'tel'),
    email: find('email', 'emailaddress', 'mail'),
    address: find('address'),
    area: find('area', 'location', 'city'),
    birthday: find('birthday', 'dateofbirth', 'dob'),
    notes: find('notes', 'note', 'comment'),
  }
  const hasHeader = col.name >= 0 || col.first >= 0 || col.phone >= 0 || col.email >= 0
  if (!hasHeader) return { rows: [], missingHeader: true }
  const get = (r: string[], i: number) => (i >= 0 ? r[i] ?? '' : '')
  const rows = all.slice(1).map((r) => ({
    name: get(r, col.name) || [get(r, col.first), get(r, col.last)].filter(Boolean).join(' '),
    phone: get(r, col.phone),
    email: get(r, col.email).toLowerCase(),
    address: get(r, col.address),
    area: get(r, col.area),
    birthday: get(r, col.birthday),
    notes: get(r, col.notes),
  }))
  return { rows: rows.filter((r) => r.name || r.phone || r.email), missingHeader: false }
}
