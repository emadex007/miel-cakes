// Browser side of phone alerts: register the service worker and subscribe.
import { fromB64urlBrowser } from './b64'

export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function deviceLabel() {
  const ua = navigator.userAgent
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua) || isIos()) return 'iPad'
  if (/android/i.test(ua)) return 'Android phone'
  if (/mac/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows computer'
  return 'Computer'
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function pushState(): Promise<{ state: PushState; endpoint: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iPhones only allow alerts for websites added to the Home Screen
    return { state: isIos() && !isStandalone() ? 'needs-install' : 'unsupported', endpoint: '' }
  }
  if (Notification.permission === 'denied') return { state: 'blocked', endpoint: '' }
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return sub ? { state: 'on', endpoint: sub.endpoint } : { state: 'off', endpoint: '' }
}

export async function subscribePush(publicKey: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications were not allowed. Allow them for this website in your browser settings, then try again.')
  const reg = await registration()
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64urlBrowser(publicKey) }))
  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } }
  return { endpoint: json.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
}

export async function unsubscribePush() {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  const endpoint = sub?.endpoint ?? ''
  await sub?.unsubscribe()
  return endpoint
}
