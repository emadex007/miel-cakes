import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { addToCart, getMe } from '~/fns/shop'
import type { CakeCustom } from '~/lib/custom'

type Me = Awaited<ReturnType<typeof getMe>>

const ShopContext = createContext<{
  me: Me
  loaded: boolean
  refresh: () => Promise<void>
  setCartCount: (n: number) => void
}>({ me: null, loaded: false, refresh: async () => {}, setCartCount: () => {} })

export function ShopProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>(null)
  const [loaded, setLoaded] = useState(false)
  const refresh = useCallback(async () => {
    try {
      setMe(await getMe())
    } catch {
      setMe(null)
    } finally {
      setLoaded(true)
    }
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  const setCartCount = (n: number) => setMe((m) => (m ? { ...m, cartCount: n } : m))
  return <ShopContext.Provider value={{ me, loaded, refresh, setCartCount }}>{children}</ShopContext.Provider>
}

export const useShop = () => useContext(ShopContext)

// An item someone tried to add before signing in. We add it for them right after they sign in.
const PENDING_KEY = 'mc-pending-cart'
export interface PendingItem {
  product_id: number
  option_label: string
  qty: number
  note: string
  custom?: CakeCustom | null
}
export function savePendingItem(item: PendingItem) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(item))
  } catch {
    /* storage blocked: they'll just add it again */
  }
}
/** Adds a saved item to the cart after sign-in. Returns true if one was added. */
export async function addPendingItem() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return false
    sessionStorage.removeItem(PENDING_KEY)
    const item = JSON.parse(raw) as PendingItem
    const r = await addToCart({ data: item })
    return !r.needLogin
  } catch {
    return false
  }
}
