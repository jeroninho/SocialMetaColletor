# SocialMetaCollector

## Overview

Fullstack application for collecting and analyzing social media metadata from YouTube, Instagram, Facebook, TikTok, and X/Twitter. Built on a pnpm monorepo with OpenAPI-first API contracts.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/social-meta-collector)
- **Backend**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod v3 (api-server uses `zod` directly; lib/db uses `zod/v4` subpath)
- **Auth**: JWT (jsonwebtoken) + bcrypt (password hashing)
- **Token security**: AES-256-GCM via `src/utils/crypto.ts` (TOKEN_SECRET env var)
- **Cache/Queue**: Redis (ioredis) + BullMQ — graceful fallback if Redis not available
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **PDF Export**: jsPDF + jspdf-autotable
- **Build**: esbuild — `ioredis` and `bullmq` are marked external in `build.mjs`
- **Design**: Space Grotesk (headings) + Inter (body), petroleum blue (#1E2A38) + deep purple (#6C63FF)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/social-meta-collector run dev` — run frontend locally

## Architecture

```
artifacts/
  api-server/
    src/
      routes/         # auth, oauth, users, youtube, instagram, facebook, tiktok, twitter, dashboard, comparator, alerts, scheduler, webhooks
      middleware/     # auth.ts — JWT bearer middleware (req.user)
      utils/          # crypto.ts (AES-256-GCM), jwt.ts (sign/verify)
      services/       # YouTubeProvider.ts, MetaProvider.ts, RedisClient.ts
      queues/         # metadataSyncQueue.ts (BullMQ)
  social-meta-collector/ # React + Vite frontend
    src/pages/        # Dashboard, YouTube, Instagram, Facebook, TikTok, Twitter, Reports, Comparator, Alerts, Scheduler, Login, Fetch
    src/pages/knowledge/ # Knowledge Hub: articles, videos, guide, glossary
    src/data/         # Static content: articles.ts, videos.ts, glossary.ts, guide-steps.ts
    src/components/   # layout.tsx (petroleum blue sidebar, Space Grotesk)
    src/context/      # theme.tsx (dark/light toggle)
    src/lib/          # chart-theme.ts, api-url.ts
lib/
  api-spec/openapi.yaml  # OpenAPI spec
  api-client-react/      # Generated React Query hooks
  api-zod/               # Generated Zod schemas
  db/src/schema/         # tokens, metadata, fetch-history, users, alert-rules, alert-history, sync-schedules
```

## API Surface

- `GET /api/auth/status` — connection status for all platforms
- `GET /api/auth/config` — OAuth callback URIs and configuration status
- `GET /api/auth/{platform}/connect` — initiates OAuth 2.0 redirect flow (YouTube/Instagram/Facebook/TikTok/Twitter)
- `GET /api/auth/{platform}/callback` — OAuth callback (receives code, exchanges for token, stores encrypted)
- `POST /api/auth/{platform}/disconnect` — disconnect a platform
- `GET /api/oauth-credentials` — list per-platform OAuth app credential status (source: db | env | none)
- `PUT /api/oauth-credentials/{platform}` — save user-supplied OAuth app clientId/clientSecret (encrypted)
- `DELETE /api/oauth-credentials/{platform}` — clear user-supplied credentials (falls back to env)
- `GET /api/youtube/channel` — channel metadata
- `GET /api/youtube/videos` — video list with metrics
- `GET /api/youtube/analytics` — channel analytics
- `GET /api/instagram/profile` — profile metadata
- `GET /api/instagram/media` — media list with metrics
- `GET /api/instagram/analytics` — profile analytics
- `GET /api/facebook/page` — page metadata
- `GET /api/facebook/posts` — post list with metrics
- `GET /api/facebook/analytics` — page analytics
- `GET /api/tiktok/profile` — TikTok profile metadata
- `GET /api/tiktok/videos` — TikTok video list with metrics
- `GET /api/tiktok/analytics` — TikTok analytics
- `GET /api/twitter/profile` — X/Twitter profile metadata
- `GET /api/twitter/tweets` — tweet list with metrics
- `GET /api/twitter/analytics` — Twitter analytics
- `GET /api/dashboard/summary` — cross-platform aggregate summary (5 platforms)
- `GET /api/dashboard/recent-metadata` — recently collected entries
- `GET /api/dashboard/engagement-trends` — engagement trend data (5 platforms)
- `POST /api/metadata/sync` — trigger metadata sync
- `GET /api/comparator` — compare metrics between platforms and periods (params: platforms, startDate, endDate)
- `GET /api/alerts/rules` — list alert rules
- `POST /api/alerts/rules` — create alert rule
- `PATCH /api/alerts/rules/:id/toggle` — toggle alert rule on/off
- `DELETE /api/alerts/rules/:id` — delete alert rule
- `GET /api/alerts/history` — alert notification history
- `POST /api/alerts/test` — send test notification (Slack webhook or email)
- `GET /api/scheduler/schedules` — list sync schedules
- `POST /api/scheduler/schedules` — create sync schedule
- `PATCH /api/scheduler/schedules/:id/toggle` — toggle schedule on/off
- `DELETE /api/scheduler/schedules/:id` — delete schedule

## Database Schema

- `tokens` — OAuth tokens per platform (accessToken + refreshToken stored AES-256-GCM encrypted)
- `oauth_credentials` — Per-platform OAuth app credentials (clientId + clientSecret stored AES-256-GCM encrypted); read by oauth.ts `getCreds()` with fallback to env vars. **Single-tenant model**: one row per platform shared by all authenticated users (matches `tokens` table model). If a future requirement is multi-tenant, add a `userId` FK and a composite unique `(userId, platform)` index, and scope `getCreds`/list/PUT/DELETE by `req.user.sub`.
- `metadata` — Normalized collected metadata (platform, contentType, contentId, views, likes, comments, engagementRate)
- `fetch_history` — URL metadata fetch history
- `users` — User accounts (id uuid, email unique, nome, senhaHash via bcrypt)
- `alert_rules` — Alert rules (name, platform, metric, condition, threshold, channel, webhookUrl, email, enabled)
- `alert_history` — Alert notification history (ruleId, ruleName, platform, metric, currentValue, threshold, channel, status, sentAt)
- `sync_schedules` — Auto-sync schedules (platforms, intervalMinutes, enabled, lastRunAt)

## Features

1. **5-Platform Integration**: YouTube, Instagram, Facebook, TikTok, X/Twitter — each with profile, content list, and analytics endpoints
2. **OAuth 2.0**: Full server-side OAuth flow for all 5 platforms
3. **Export Reports**: PDF and CSV export from the Reports page using jsPDF and jspdf-autotable
4. **Campaign Comparator**: Compare metrics between platforms and date ranges with visual charts
5. **Smart Alerts**: Configure alert rules based on engagement thresholds, notify via Slack webhook or email
6. **Auto-Sync Scheduling**: Schedule automatic metadata synchronization at configurable intervals
7. **Dashboard**: Aggregate metrics across all 5 platforms with charts and platform breakdown

## Security Notes

- Tokens encrypted with `encryptToken()`/`decryptToken()` from `src/utils/crypto.ts` before DB storage
- JWT signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default: 1h)
- `optionalAuth` middleware applied globally in routes/index.ts — enriches req.user if Bearer token present
- `authMiddleware` available for requiring auth on specific routes
- `ioredis` and `bullmq` externalized in esbuild (build.mjs) — they must be available at runtime via node_modules

See `references/server.md` for server patterns, `references/db.md` for Drizzle guidance, `references/openapi.md` for codegen rules.
