import { useState } from 'react'
import { whatsappLink } from '~/lib/format'
import type { SiteSettings } from '~/lib/site-fields'
import { WhatsAppIcon } from './icons'

/** Bank transfer instructions + proof-of-payment button + delivery note. */
export function PaymentInfo({ s, compact = false }: { s: SiteSettings; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const proofWa = whatsappLink(s.whatsapp, `Hello ${s.business_name}, here is my proof of payment.`)
  const hasBank = !!(s.bank_account_number && s.bank_name)

  async function copy() {
    try {
      await navigator.clipboard.writeText(s.bank_account_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* the number is selectable as a fallback */
    }
  }

  return (
    <div className={`rounded-3xl bg-white ring-1 ring-line ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
      <p className="eyebrow text-brand">How to pay</p>
      <p className="mt-2 text-cocoa/85">{s.payment_note}</p>

      {hasBank ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-honey px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-cocoa/75">{s.bank_name}</p>
            <p className="font-display text-2xl tabular select-all">{s.bank_account_number}</p>
            {s.bank_account_name && <p className="text-sm text-cocoa/75">{s.bank_account_name}</p>}
          </div>
          <button type="button" onClick={copy} className="btn btn-ghost !px-4 !py-2 text-sm text-cocoa">
            {copied ? 'Copied' : 'Copy number'}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-honey px-5 py-4 text-sm">Message us on WhatsApp for our account details.</p>
      )}

      <ol className="mt-5 space-y-2 text-sm text-cocoa/85">
        <li><strong>1.</strong> Confirm your order and total with us on WhatsApp.</li>
        <li><strong>2.</strong> Transfer the total to the account above.</li>
        <li><strong>3.</strong> Send your proof of payment (screenshot or receipt) on WhatsApp.</li>
        <li><strong>4.</strong> We start baking once payment is confirmed.</li>
      </ol>

      {proofWa && (
        <a href={proofWa} target="_blank" rel="noopener" className="btn btn-primary mt-5">
          <WhatsAppIcon /> Send proof of payment
        </a>
      )}

      {!compact && s.delivery_note && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="eyebrow text-brand">Pickup & delivery</p>
          <p className="mt-2 text-cocoa/85">{s.delivery_note}</p>
        </div>
      )}
    </div>
  )
}
