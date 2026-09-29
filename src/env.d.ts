/// <reference types="@cloudflare/workers-types" />

// Bindings from wrangler.jsonc
declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    MEDIA: R2Bucket
    PAYSTACK_SECRET_KEY?: string
  }
}
