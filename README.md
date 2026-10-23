# Deep Links (route registry)

A local list of app deep link routes: two sample routes, a form to add one (name, URL, state Draft/Active/Done), a
search over name, URL and state, copy-to-clipboard and remove. The list is kept in this browser's `localStorage`.
It is a notebook for route patterns, not a link router.

Live: https://deeplinks.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- Does not open, resolve, redirect or test any link; the map drawing is decoration ("not a live app router").
- No platform templates, QR codes or URL format validation (any non-empty text is accepted).
- No account, sync or sharing. Clearing site data resets the list.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: registry logic, local store, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/deeplinks.ts`: sample routes plus `filterRoutes`, `addRoute` (trims, refuses empty), `removeRoute` and
  `parseRoutes` (validates saved state).
- `lib/local-store.ts`: `localStorage` store read through `useSyncExternalStore` (no setState in an effect; falls back
  to memory when storage is blocked). This repository owns its copy.
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `get_seed_routes`, `get_by_id` and `search` over the sample
  routes.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
