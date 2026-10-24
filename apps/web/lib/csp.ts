/**
 * The Content-Security-Policy header (next.config.ts). Plain data, so a test can read it. The dev server needs
 * http://localhost and ws://localhost (the API, hot reload) and 'unsafe-eval'; a production build gets neither.
 * script-src keeps 'unsafe-inline' for now: a nonce policy is its own task.
 */
export function contentSecurityPolicy({ development, apiOrigin }: { development: boolean; apiOrigin: string }): string {
  const connect = [
    "'self'",
    apiOrigin,
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://hcaptcha.com",
    "https://*.hcaptcha.com",
    ...(development ? ["http://localhost:*", "ws://localhost:*"] : []),
  ].filter(Boolean);
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval': WebAssembly may compile, JavaScript eval may not (the WASM WebP encoder of Thêm bài, which a WebKit coach's browser loads)
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${development ? "'unsafe-eval' " : ""}https://hcaptcha.com https://*.hcaptcha.com`,
    "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // A form can only post to this site
    "form-action 'self'",
  ].join("; ");
}
