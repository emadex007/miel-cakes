import { createFileRoute } from '@tanstack/react-router'
import { adminFromSessionId, sessionIdFromRequest } from '~/server/auth'
import { db, media } from '~/server/db'

const MAX_IMAGE = 15 * 1024 * 1024 // 15 MB
const MAX_VIDEO = 90 * 1024 * 1024 // 90 MB (Workers free plan accepts up to 100 MB per request)
const ALLOWED = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await adminFromSessionId(sessionIdFromRequest(request))
        if (!admin) return json({ error: 'Please sign in to the admin dashboard again.' }, 401)

        const form = await request.formData()
        const file = form.get('file')
        if (!file || typeof file === 'string') return json({ error: 'Choose a file to upload.' }, 400)
        if (!ALLOWED.test(file.type)) {
          return json({ error: 'Upload a photo (JPG, PNG, WebP) or a video (MP4, WebM, MOV).' }, 400)
        }
        const isVideo = file.type.startsWith('video/')
        if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
          return json({ error: isVideo ? 'Videos must be under 90 MB.' : 'Photos must be under 15 MB.' }, 400)
        }

        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-60) || 'file'
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')
        const key = `uploads/${Date.now()}-${rand}-${safeName}`

        await media().put(key, file.stream(), {
          httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
        })
        await db()
          .prepare('INSERT INTO media (key, filename, content_type, size) VALUES (?, ?, ?, ?)')
          .bind(key, file.name.slice(0, 200), file.type, file.size)
          .run()

        return json({ url: `/media/${key}`, key })
      },
    },
  },
})
