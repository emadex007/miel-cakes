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
