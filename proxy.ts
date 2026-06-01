// Next.js 16 renamed the `middleware` file convention to `proxy`.
// The exported function MUST be named `proxy`, and the `config` matcher
// MUST be defined in this file (re-exporting it breaks static analysis).
// We keep the implementation in `src/middleware.ts` per the project's
// source layout and re-export the function under the new name here.

export { middleware as proxy } from '@/middleware';

// Negative lookahead excludes Next internals, Vercel infra, API, favicon,
// and any file with an extension (.png, .css, .js, .map, .ico, etc.) so
// static assets ship straight through without the host parsing overhead.
export const config = {
  matcher: ['/((?!_next/|_vercel/|api/|favicon\\.ico|.*\\.[\\w]+$).*)'],
};
