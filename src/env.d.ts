/// <reference types="@cloudflare/workers-types" />

// Bindings from wrangler.toml
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    MEDIA: R2Bucket
    SITE_ENV: string
    PAYSTACK_SECRET_KEY?: string
    /** Resend (resend.com) API key, for emails. Set with: npx wrangler secret put RESEND_API_KEY */
    RESEND_API_KEY?: string
    CANONICAL_HOST?: string
  }
}
