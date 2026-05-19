# Threat Model

## Project Overview

SocialMetaCollector is a monorepo application with a React frontend and an Express API that lets users register, connect social-platform accounts, fetch social post metadata, and view analytics across YouTube, Instagram, Facebook, TikTok, and X/Twitter. In production, the main exposed surface is `artifacts/api-server`, with bearer-JWT authentication for some routes and server-side calls to external provider APIs, PostgreSQL, Redis/BullMQ, and optional inbound Meta webhooks.

This scan assumes a future production deployment even though the project is not currently deployed. TLS is handled by the platform. `artifacts/mockup-sandbox` is dev-only and out of scope unless production reachability is shown.

## Assets

- **User accounts and JWTs** — user IDs, emails, names, password hashes, and signed bearer tokens. Compromise allows impersonation and access to protected features.
- **Connected social-platform tokens** — OAuth access/refresh tokens for YouTube, Instagram, Facebook, TikTok, and X/Twitter stored in the `tokens` table. Compromise enables access to users’ social analytics and third-party accounts.
- **OAuth application credentials** — client IDs and client secrets stored in `oauth_credentials` or environment variables. Compromise or unauthorized modification can reroute or break platform integrations.
- **Collected analytics and metadata** — dashboard metrics, recent metadata rows, fetch history, alert rules, and sync schedules. These may reveal business-sensitive engagement data and user activity.
- **Application secrets** — `JWT_SECRET`, `TOKEN_SECRET`, provider client secrets, API keys, webhook secrets, database credentials, and Redis connection settings.

## Trust Boundaries

- **Browser to API** — every route under `/api` crosses from an untrusted client into the server. Protected behavior must be enforced server-side; the React router does not provide security.
- **API to PostgreSQL** — the API reads and writes user accounts, OAuth tokens, stored credentials, and analytics records. Missing tenant scoping here becomes cross-user exposure.
- **API to external platforms** — OAuth callbacks and analytics fetches trust third-party responses from Google, Meta, TikTok, Twitter, and other fetched URLs.
- **Public to authenticated boundary** — some routes are protected with `authMiddleware`, but many others only see `optionalAuth` or no auth at all. This is the highest-risk boundary in the repo.
- **API to arbitrary outbound URLs** — `fetch-metadata` and alert test flows trigger server-side HTTP requests based on user input, creating SSRF and abuse risk.
- **Webhook sender to API** — `/api/webhooks/meta` accepts inbound traffic that must be authenticated cryptographically when enabled.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`
- Highest-risk areas: `routes/auth.ts`, `routes/oauth.ts`, `routes/fetch-metadata.ts`, `routes/dashboard.ts`, platform analytics routes, `routes/oauth-credentials.ts`, `middleware/auth.ts`
- Public surfaces: health, webhooks, OAuth connect/callback flows, platform analytics/data routes, dashboard summary/trends, metadata fetch routes, and some connect/disconnect routes unless explicitly protected
- Authenticated surfaces: alerts, scheduler, comparator, OAuth credential management, `/auth/me`
- Dev-only areas usually skipped: `artifacts/mockup-sandbox`, slide deck artifacts, generated dist output unless needed to confirm runtime behavior

## Threat Categories

### Spoofing

The API relies on bearer JWTs signed with `JWT_SECRET`. All routes that expose user-specific data or mutate integration state must require a valid token and must not trust frontend route guards. OAuth callbacks and webhooks must verify their authenticity before changing stored state.

### Tampering

Users can connect platforms, store OAuth app credentials, create alert rules, and trigger metadata syncs. The system must ensure one user cannot overwrite or disconnect another user’s integrations, alter globally shared credentials, or trigger privileged background actions without authorization.

### Information Disclosure

The application stores social tokens, fetched metadata, analytics, and credential status. Responses must be scoped to the correct authenticated user, and public endpoints must not reveal whether a platform is connected, which account is attached, or any real analytics fetched from another user’s social accounts.

### Denial of Service

Public endpoints can trigger expensive work such as outbound fetches, OAuth flows, analytics refreshes, and metadata synchronization. The system must bound request cost, restrict server-side URL fetching, and prevent unauthenticated callers from repeatedly forcing background or upstream API work.

### Elevation of Privilege

The main privilege-escalation risks are broken access control and missing tenant isolation rather than classic role-based admin bypass. Database rows holding tokens, fetched history, and stored credentials must be scoped so that one authenticated user — or an unauthenticated caller on a public route — cannot read, replace, or delete another user’s connected integrations or derived analytics.