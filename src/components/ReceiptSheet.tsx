import { formatNaira } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import type { Receipt } from '~/lib/types'

export const PAYMENT_METHODS: Record<Receipt['payment_method'], string> = {
  transfer: 'Bank transfer',
  cash: 'Cash',
  pos: 'POS / card',
  paystack: 'Paystack',
}

export const RECEIPT_STATUS: Record<Receipt['status'], { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  part_paid: { label: 'Part paid', className: 'bg-amber-100 text-amber-900' },
  unpaid: { label: 'Not paid', className: 'bg-red-100 text-red-800' },
}

export const formatDate = (iso: string) => {
  if (!iso) return ''
  // Date-only values get midday so time zones never shift the day; SQLite's "YYYY-MM-DD HH:MM:SS" gets a T for Safari.
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** The receipt itself, designed to look good on screen and on A4 paper. */
export function ReceiptSheet({ r, s }: { r: Receipt; s: SiteSettings }) {
  const balance = r.total - r.amount_paid
  const status = RECEIPT_STATUS[r.status]
  return (
    <article className="print-sheet mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] bg-white text-[#1b2437] shadow-[0_30px_80px_-40px_var(--c-dark)] ring-1 ring-line">
      <header className="flex flex-wrap items-start justify-between gap-6 bg-cocoa px-8 py-8 text-white sm:px-10">
        <div>
          {s.logo_url ? (
            <img src={s.logo_url} alt={s.business_name} className="h-14 w-auto object-contain" />
          ) : (
            <p className="font-display text-3xl">
              {s.business_name}
              <span className="text-highlight">.</span>
            </p>
          )}
          <p className="mt-2 max-w-xs text-sm text-white/75">{s.tagline}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Receipt</p>
          <p className="mt-1 font-display text-2xl tabular">{r.code}</p>
          <p className="mt-1 text-sm text-white/75">{formatDate(r.issued_on)}</p>
        </div>
      </header>

      <div className="h-2 bg-accent" />

      <div className="space-y-8 px-8 py-8 sm:px-10">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#6b7385]">Billed to</p>
            <p className="mt-1 text-lg font-semibold">{r.client_name}</p>
            {r.client_phone && <p className="tabular text-[#4a5368]">{r.client_phone}</p>}
            {r.client_email && <p className="break-all text-[#4a5368]">{r.client_email}</p>}
            {r.client_address && <p className="whitespace-pre-line text-[#4a5368]">{r.client_address}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6b7385]">Details</p>
            <p className="mt-1">
              <span className={`inline-block rounded-full px-3 py-0.5 text-sm font-bold ${status.className}`}>{status.label}</span>
            </p>
            <p className="mt-1 text-[#4a5368]">{PAYMENT_METHODS[r.payment_method]}</p>
            <p className="text-[#4a5368]">{r.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</p>
            {r.event_date && <p className="text-[#4a5368]">For {formatDate(r.event_date)}</p>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b-2 border-[#1b2437] text-xs uppercase tracking-wider text-[#6b7385]">
                <th className="py-2 pr-3 font-bold">Item</th>
                <th className="px-3 py-2 text-right font-bold">Qty</th>
                <th className="px-3 py-2 text-right font-bold">Price</th>
                <th className="py-2 pl-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e9ef]">
              {r.items.map((i, n) => (
                <tr key={n}>
                  <td className="py-3 pr-3">{i.description}</td>
                  <td className="px-3 py-3 text-right tabular">{i.qty}</td>
                  <td className="px-3 py-3 text-right tabular">{formatNaira(i.price)}</td>
                  <td className="py-3 pl-3 text-right font-semibold tabular">{formatNaira(i.qty * i.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto max-w-xs space-y-2 tabular">
          <div className="flex justify-between"><dt className="text-[#4a5368]">Subtotal</dt><dd>{formatNaira(r.subtotal)}</dd></div>
          {r.delivery_fee > 0 && <div className="flex justify-between"><dt className="text-[#4a5368]">Delivery</dt><dd>{formatNaira(r.delivery_fee)}</dd></div>}
          {r.discount > 0 && <div className="flex justify-between"><dt className="text-[#4a5368]">Discount</dt><dd>−{formatNaira(r.discount)}</dd></div>}
          <div className="flex justify-between border-t-2 border-[#1b2437] pt-2 text-lg font-bold"><dt>Total</dt><dd>{formatNaira(r.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-[#4a5368]">Paid</dt><dd>{formatNaira(r.amount_paid)}</dd></div>
          {balance > 0 && (
            <div className="flex justify-between rounded-lg bg-red-50 px-2 py-1 font-bold text-red-800"><dt>Balance due</dt><dd>{formatNaira(balance)}</dd></div>
          )}
        </dl>

        {r.note && <p className="rounded-2xl bg-[#f4f6fb] p-4 text-sm text-[#4a5368]">{r.note}</p>}

        <div className="rounded-2xl bg-honey p-5 text-center">
          <p className="font-display text-xl">{s.receipt_thanks}</p>
        </div>

        {balance > 0 && s.bank_account_number && (
          <p className="text-center text-sm text-[#4a5368]">
            Pay the balance to <strong>{s.bank_name}</strong> · <strong className="tabular">{s.bank_account_number}</strong>
            {s.bank_account_name ? ` · ${s.bank_account_name}` : ''}
          </p>
        )}
      </div>

      <footer className="border-t border-[#e7e9ef] px-8 py-6 text-center text-xs leading-relaxed text-[#6b7385] sm:px-10">
        <p>{s.receipt_footer}</p>
        <p className="mt-2">
          {[s.business_name, s.phone, s.email, s.address.replace(/\n/g, ', ')].filter(Boolean).join(' · ')}
        </p>
      </footer>
    </article>
  )
}
