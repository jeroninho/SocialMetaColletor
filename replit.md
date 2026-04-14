# SocialMetaCollector

## Overview

Fullstack application for collecting and analyzing social media metadata from YouTube, Instagram, and Facebook. Built on a pnpm monorepo with OpenAPI-first API contracts.

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
      routes/         # auth, oauth, users, youtube, instagram, facebook, dashboard, webhooks
      middleware/     # auth.ts — JWT bearer middleware (req.user)
      utils/          # crypto.ts (AES-256-GCM), jwt.ts (sign/verify)
      services/       # YouTubeProvider.ts, MetaProvider.ts, RedisClient.ts
      queues/         # metadataSyncQueue.ts (BullMQ)
  social-meta-collector/ # React + Vite frontend
    src/pages/        # Dashboard, YouTube, Instagram, Facebook, Reports, Login, Fetch
    src/components/   # layout.tsx (petroleum blue sidebar, Space Grotesk)
    src/context/      # theme.tsx (dark/light toggle)
    src/lib/          # chart-theme.ts
lib/
  api-spec/openapi.yaml  # OpenAPI spec
  api-client-react/      # Generated React Query hooks
  api-zod/               # Generated Zod schemas
  db/src/schema/         # tokens, metadata, fetch-history, users
```

## API Surface

- `GET /api/auth/status` — connection status for all platforms
- `GET /api/auth/config` — OAuth callback URIs and configuration status
- `GET /api/auth/{platform}/connect` — initiates OAuth 2.0 redirect flow (YouTube/Instagram/Facebook)
- `GET /api/auth/{platform}/callback` — OAuth callback (receives code, exchanges for token, stores encrypted)
- `POST /api/auth/{platform}/disconnect` — disconnect a platform
- `GET /api/youtube/channel` — channel metadata
- `GET /api/youtube/videos` — video list with metrics
- `GET /api/youtube/analytics` — channel analytics
- `GET /api/instagram/profile` — profile metadata
- `GET /api/instagram/media` — media list with metrics
- `GET /api/instagram/analytics` — profile analytics
- `GET /api/facebook/page` — page metadata
- `GET /api/facebook/posts` — post list with metrics
- `GET /api/facebook/analytics` — page analytics
- `GET /api/dashboard/summary` — cross-platform aggregate summary
- `GET /api/dashboard/recent-metadata` — recently collected entries
- `GET /api/dashboard/engagement-trends` — engagement trend data
- `POST /api/metadata/sync` — trigger metadata sync

## Database Schema

- `tokens` — OAuth tokens per platform (accessToken + refreshToken stored AES-256-GCM encrypted)
- `metadata` — Normalized collected metadata (platform, contentType, contentId, views, likes, comments, engagementRate)
- `fetch_history` — URL metadata fetch history
- `users` — User accounts (id uuid, email unique, nome, senhaHash via bcrypt)

## Security Notes

- Tokens encrypted with `encryptToken()`/`decryptToken()` from `src/utils/crypto.ts` before DB storage
- JWT signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default: 1h)
- `optionalAuth` middleware applied globally in routes/index.ts — enriches req.user if Bearer token present
- `authMiddleware` available for requiring auth on specific routes
- `ioredis` and `bullmq` externalized in esbuild (build.mjs) — they must be available at runtime via node_modules

See `references/server.md` for server patterns, `references/db.md` for Drizzle guidance, `references/openapi.md` for codegen rules.
