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
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Build**: esbuild (CJS bundle for backend)

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
  api-server/            # Express backend
    src/routes/          # auth, youtube, instagram, facebook, dashboard
  social-meta-collector/ # React + Vite frontend
    src/pages/           # Dashboard, YouTube, Instagram, Facebook, Reports, Login
lib/
  api-spec/openapi.yaml  # OpenAPI spec (single source of truth)
  api-client-react/      # Generated React Query hooks
  api-zod/               # Generated Zod schemas
  db/src/schema/         # Drizzle schemas: tokens, metadata
```

## API Surface

- `GET /api/auth/status` — connection status for all platforms
- `POST /api/auth/{platform}/connect` — connect YouTube / Instagram / Facebook
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

- `tokens` — OAuth tokens per platform (platform, accountName, accessToken, connected, connectedAt, expiresAt)
- `metadata` — Normalized collected metadata (platform, contentType, contentId, title, views, likes, comments, shares, engagementRate, collectedAt)

See `references/server.md` for server patterns, `references/db.md` for Drizzle guidance, `references/openapi.md` for codegen rules.
