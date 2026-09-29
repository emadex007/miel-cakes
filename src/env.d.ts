/// <reference types="@cloudflare/workers-types" />

// Bindings from wrangler.toml
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    MEDIA: R2Bucket
    SITE_ENV: string
    PAYSTACK_SECRET_KEY?: string
  }
}
