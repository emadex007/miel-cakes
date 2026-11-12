// Cake customiser: the choices customers can make, and how they're priced and shown.
// Prices for each choice come from the dashboard (Website content → Cake customiser).

export interface PricedChoice {
  label: string
  price: number
}

/** The pick-one groups, in the order they appear on the product page. */
export const CHOICE_GROUPS = [
  { key: 'shape', label: 'Cake shape', setting: 'custom_shapes' },
  { key: 'flavour', label: 'Cake flavour', setting: 'custom_flavours' },
  { key: 'layers', label: 'Number of layers', setting: 'custom_layers' },
  { key: 'filling', label: 'Filling', setting: 'custom_fillings' },
  { key: 'icing', label: 'Icing / frosting', setting: 'custom_icings' },
  { key: 'decoration', label: 'Decoration style', setting: 'custom_decorations' },
  { key: 'topper', label: 'Cake topper', setting: 'custom_toppers' },
] as const

/** Free-text details. The cake message itself is the item's note. */
export const TEXT_FIELDS = [
  { key: 'colour', label: 'Icing colour', placeholder: 'e.g. Pink, white and gold', max: 120 },
  { key: 'extras', label: 'Decoration extras', placeholder: 'e.g. Pearls, flowers, butterflies', max: 200 },
  { key: 'occasion', label: 'Purpose / occasion', placeholder: 'Birthday, wedding, graduation…', max: 80 },
  { key: 'instructions', label: 'Special instructions', placeholder: 'Anything else we should know? Allergies?', max: 600 },
] as const

export type ChoiceKey = (typeof CHOICE_GROUPS)[number]['key']
export type TextKey = (typeof TEXT_FIELDS)[number]['key']
export type CakeCustom = Partial<Record<ChoiceKey | TextKey, string>>

/** "Label|price" lines → choices. A line without a price costs nothing extra. */
export function parseChoices(value: string | undefined): PricedChoice[] {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, price = '0'] = l.split('|')
      return { label: label.trim(), price: Math.max(0, Math.round(Number(price.replace(/[^\d.]/g, '')) || 0)) }
    })
    .filter((c) => c.label)
}

/** Extra cost of the chosen options, using the current prices. Unknown choices cost nothing. */
export function customExtra(custom: CakeCustom | null, settings: Record<string, string>) {
  if (!custom) return 0
  let extra = 0
  for (const g of CHOICE_GROUPS) {
    const picked = custom[g.key]
    if (!picked) continue
    extra += parseChoices(settings[g.setting]).find((c) => c.label === picked)?.price ?? 0
  }
  return extra
}

export function parseCustom(json: string | null | undefined): CakeCustom | null {
  if (!json) return null
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? (v as CakeCustom) : null
  } catch {
    return null
  }
}

/** Label/value pairs for showing a customised cake in the cart, orders and receipts. */
export function describeCustom(json: string | null | undefined): [string, string][] {
  const c = parseCustom(json)
  if (!c) return []
  const rows: [string, string][] = []
  for (const g of CHOICE_GROUPS) if (c[g.key]) rows.push([g.label.replace('Cake ', '').replace(/^\w/, (m) => m.toUpperCase()), c[g.key]!])
  for (const f of TEXT_FIELDS) if (c[f.key]) rows.push([f.label, c[f.key]!])
  return rows
}

/** One line, e.g. "Heart · Red velvet · 2 layers · Fondant". */
export function customOneLine(json: string | null | undefined) {
  const c = parseCustom(json)
  if (!c) return ''
  return CHOICE_GROUPS.map((g) => c[g.key])
    .filter(Boolean)
    .join(' · ')
}
