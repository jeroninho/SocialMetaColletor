# SocialMetaCollector

A fullstack application for collecting and analyzing metadata from YouTube, Instagram, and Facebook.

## Overview

SocialMetaCollector lets you connect your social media accounts and view unified analytics — total followers, engagement rates, top content, trends over time — all in one dashboard.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express |
| Database | PostgreSQL + Drizzle ORM |
| API Codegen | Orval (OpenAPI → React Query hooks + Zod) |
| Package Manager | pnpm (monorepo) |

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express backend
│   │   └── src/
│   │       ├── routes/      # REST API routes (auth, youtube, instagram, facebook, dashboard)
│   │       └── app.ts       # Express app setup
│   └── social-meta-collector/ # React + Vite frontend
│       └── src/
│           └── pages/       # Dashboard, Login, YouTube, Instagram, Facebook, Reports
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     # OpenAPI spec (source of truth for all API contracts)
│   ├── api-client-react/    # Generated React Query hooks (from Orval)
│   ├── api-zod/             # Generated Zod schemas (from Orval)
│   └── db/
│       └── src/schema/      # Drizzle ORM schemas (tokens, metadata)
└── pnpm-workspace.yaml
```

## API Endpoints

### Auth
- `GET /api/auth/status` — Connection status for all platforms
- `POST /api/auth/youtube/connect` — Connect YouTube account
- `POST /api/auth/instagram/connect` — Connect Instagram account
- `POST /api/auth/facebook/connect` — Connect Facebook account
- `POST /api/auth/:platform/disconnect` — Disconnect a platform

### YouTube
- `GET /api/youtube/channel` — Channel metadata (subscribers, views, video count)
- `GET /api/youtube/videos` — List videos with metrics (views, likes, comments)
- `GET /api/youtube/videos/:videoId` — Single video metadata
- `GET /api/youtube/analytics` — Aggregated channel analytics

### Instagram
- `GET /api/instagram/profile` — Profile metadata (followers, media count)
- `GET /api/instagram/media` — List media (likes, comments, reach, impressions)
- `GET /api/instagram/analytics` — Aggregated profile analytics

### Facebook
- `GET /api/facebook/page` — Page metadata (fans, followers)
- `GET /api/facebook/posts` — List posts (likes, comments, shares)
- `GET /api/facebook/analytics` — Aggregated page analytics

### Dashboard
- `GET /api/dashboard/summary` — Cross-platform aggregate summary
- `GET /api/dashboard/recent-metadata` — Recently collected metadata entries
- `GET /api/dashboard/engagement-trends` — Engagement trends over time
- `POST /api/metadata/sync` — Trigger metadata sync for all platforms

## Database Schema

### `tokens`
Stores OAuth tokens for each connected platform.
| Column | Type | Description |
|---|---|---|
| id | serial | Primary key |
| platform | text | youtube / instagram / facebook |
| account_name | text | Connected account name |
| access_token | text | OAuth2 access token |
| connected | boolean | Connection status |
| connected_at | timestamp | When connected |
| expires_at | timestamp | Token expiry |

### `metadata`
Normalized metadata collected from all platforms.
| Column | Type | Description |
|---|---|---|
| id | serial | Primary key |
| platform | text | Source platform |
| content_type | text | video / media / post |
| content_id | text | Platform-specific content ID |
| title | text | Content title/caption |
| views | integer | View / impression count |
| likes | integer | Like count |
| comments | integer | Comment count |
| shares | integer | Share count |
| engagement_rate | real | Computed engagement rate |
| collected_at | timestamp | When metadata was collected |

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL database (set `DATABASE_URL` env var)

### Setup

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Regenerate API types from OpenAPI spec (after any spec changes)
pnpm --filter @workspace/api-spec run codegen
```

### Development

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend (in a separate terminal)
pnpm --filter @workspace/social-meta-collector run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (set automatically) |
| `BASE_PATH` | Frontend base path (set automatically) |
| `SESSION_SECRET` | Secret for session management |

## Docker (optional)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

A `docker-compose.yml` can be added to spin up PostgreSQL and Redis alongside the application.

## Running Tests

```bash
# Run Jest unit tests
pnpm test
```

## Code Quality

- ESLint + Prettier configured at the workspace level
- TypeScript strict mode enabled
- Zod validation on all API inputs and outputs

## API Code Generation

After modifying `lib/api-spec/openapi.yaml`, regenerate the client hooks and Zod schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- `lib/api-client-react/src/generated/` — React Query hooks for the frontend
- `lib/api-zod/src/generated/` — Zod validation schemas for the backend

## Adding a New Platform

1. Add endpoints to `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Create a new route file in `artifacts/api-server/src/routes/`
4. Register the router in `artifacts/api-server/src/routes/index.ts`
5. Use the generated hooks in the frontend pages
