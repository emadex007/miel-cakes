import { createFileRoute } from '@tanstack/react-router'
import { media } from '~/server/db'

// Serves uploaded photos and videos from R2 at /media/<key>.
// Supports Range requests so videos play (and seek) on iPhones.
export const Route = createFileRoute('/media/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = decodeURIComponent(params._splat ?? '')
        if (!key.startsWith('uploads/')) return new Response('Not found', { status: 404 })

        const hasRange = request.headers.has('range')
        const object = await media().get(key, hasRange ? { range: request.headers } : undefined)
        if (!object) return new Response('Not found', { status: 404 })

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set('etag', object.httpEtag)
        headers.set('accept-ranges', 'bytes')
        if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=31536000, immutable')

        const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined
        if (hasRange && range) {
          const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0)
          const length = range.suffix !== undefined ? range.suffix : (range.length ?? object.size - offset)
          headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`)
          headers.set('content-length', String(length))
          return new Response(object.body, { status: 206, headers })
        }
        headers.set('content-length', String(object.size))
        return new Response(object.body, { headers })
      },
    },
  },
})
