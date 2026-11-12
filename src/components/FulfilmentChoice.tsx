// "How will you get it?" Three ways: we deliver (price by area), the customer
// sends their own rider, or they pick it up themselves.
export type Fulfilment = 'delivery' | 'own_rider' | 'pickup'

export function FulfilmentChoice({
  value,
  onChange,
  name,
  deliveryLabel = 'We deliver',
  deliveryHint = 'Price depends on your area',
}: {
  value: Fulfilment
  onChange: (v: Fulfilment) => void
  name: string
  deliveryLabel?: string
  deliveryHint?: string
}) {
  const options: { v: Fulfilment; title: string; hint: string }[] = [
    { v: 'delivery', title: deliveryLabel, hint: deliveryHint },
    { v: 'own_rider', title: 'My own rider', hint: 'Send your rider to collect. No delivery fee' },
    { v: 'pickup', title: 'I’ll pick up', hint: 'Collect it yourself. Free' },
  ]
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = value === o.v
        return (
          <label
            key={o.v}
            className={`cursor-pointer rounded-2xl px-4 py-3 ring-1 transition ${on ? 'bg-cocoa text-cream ring-cocoa' : 'bg-white ring-line hover:ring-brand'}`}
          >
            <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onChange(o.v)} />
            <span className="block font-semibold">{o.title}</span>
            <span className={`mt-0.5 block text-xs ${on ? 'text-cream/80' : 'text-muted'}`}>{o.hint}</span>
          </label>
        )
      })}
    </div>
  )
}
