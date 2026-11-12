// Web Push (phone and computer notifications) with nothing but WebCrypto.
// - VAPID (RFC 8292): a signed token that proves the message comes from us.
// - Message encryption (RFC 8291, "aes128gcm"): only the subscribed browser can read it.

export interface PushSubscriptionKeys {
  endpoint: string
  p256dh: string // browser's public key, base64url
  auth: string // browser's auth secret, base64url
}
export interface VapidKeys {
  publicKey: string // base64url, 65-byte uncompressed P-256 point
  privateKey: string // base64url, 32-byte private value
}

const enc = new TextEncoder()
/** A plain ArrayBuffer copy of some bytes (what WebCrypto's types want). */
const ab = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Makes a new key pair for VAPID. Store it once and reuse it forever. */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const raw = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  return { publicKey: b64url(raw), privateKey: jwk.d! }
}

function jwkFor(publicRaw: Uint8Array, d?: string): JsonWebKey {
  return { kty: 'EC', crv: 'P-256', x: b64url(publicRaw.slice(1, 33)), y: b64url(publicRaw.slice(33, 65)), ...(d ? { d } : {}), ext: true }
}

/** The VAPID Authorization header for one push service (e.g. https://fcm.googleapis.com). */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string) {
  const aud = new URL(endpoint).origin
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })))
  const key = await crypto.subtle.importKey('jwk', jwkFor(fromB64url(keys.publicKey), keys.privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, ab(enc.encode(`${header}.${claims}`)))
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${keys.publicKey}`
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey('raw', ab(ikm), 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: ab(salt), info: ab(info) }, key, length * 8))
}

/**
 * Encrypts a message for one browser (RFC 8291). `test` lets the RFC's
 * example keys be used to check the result; normal sends leave it out.
 */
export async function encryptPayload(
  payload: Uint8Array,
  sub: { p256dh: string; auth: string },
  test?: { asPublic: Uint8Array; asPrivateD: string; salt: Uint8Array },
) {
  const uaPublic = fromB64url(sub.p256dh)
  const authSecret = fromB64url(sub.auth)
  let asPublic: Uint8Array
  let asPrivate: CryptoKey
  if (test) {
    asPublic = test.asPublic
    asPrivate = await crypto.subtle.importKey('jwk', jwkFor(asPublic, test.asPrivateD), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
  } else {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)
    asPrivate = pair.privateKey
  }
  const uaKey = await crypto.subtle.importKey('raw', ab(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as EcdhKeyDeriveParams, asPrivate, 256))
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = test?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const aes = await crypto.subtle.importKey('raw', ab(cek), 'AES-GCM', false, ['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ab(nonce) }, aes, ab(concat(payload, new Uint8Array([2])))))
  const rs = new Uint8Array([0, 0, 16, 0]) // record size 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher)
}

/** Sends one notification. Returns 'gone' when the browser has unsubscribed (delete it). */
export async function sendPush(sub: PushSubscriptionKeys, message: unknown, keys: VapidKeys, subject: string): Promise<'ok' | 'gone' | 'error'> {
  try {
    const body = await encryptPayload(enc.encode(JSON.stringify(message)), sub)
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthorization(sub.endpoint, keys, subject),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body: ab(body),
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 404 || res.status === 410) return 'gone'
    return res.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
