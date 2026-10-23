# Deep Links (route registry) — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `deeplinks`, evidence Live→Prototype) on
> 2026-10-23.

## What it is

A client-side list of deep link route patterns (for example `app://projects/{id}`), saved in the visitor's browser.

## Who it is for

A portfolio visitor, or a developer jotting down which app routes should be addressable.

## What works today

1. Two sample routes on first visit; add a route with a name, a URL pattern and a state (Draft, Active, Done).
   Empty names or URLs are refused; surrounding spaces are trimmed.
2. Search filters by name, URL or state (case-insensitive).
3. Copy a route's URL to the clipboard, or remove it.
4. The list is saved in `localStorage` and restored on reload; corrupt saved data is ignored and the samples are used.
5. `/api/mcp` answers JSON-RPC with `get_seed_routes`, `get_by_id` and `search` over the sample routes. It is
   stateless and cannot see a visitor's saved routes.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No platform templates (iOS/Android/web), no QR code generation, no URL format validation.
- Nothing opens, resolves or redirects a link; the network drawing is decoration ("not a live app router").
- The "LINK MAP 07" badge is decorative, not a count. No accounts, sync or analytics beyond Vercel Analytics and Speed
  Insights on this page itself.

## Live URL and deploy state

- Live: https://deeplinks.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-deeplinks-frontend` is deployed only by CLI. Last production deployment:
  2026-10-23 (CLI, commit 3cd3630, the Next 16.4.2 CVE patch). Its Git link names the old repository
  (`bookchaowalit/bookchaowalit-deeplinks-frontend`), so a push to `main` does not deploy: the live site lags `main`
  (no Sentry, old template MCP route) until the owner reconnects Vercel Git to this repository (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `marketing-deeplinks-web`, org
  `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
