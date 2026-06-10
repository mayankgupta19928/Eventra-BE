# Eventra backend (NestJS + PostgreSQL)

Modular API aligned with `eventra.plan`: **tenants**, **users**, **auth (JWT)**, **events + seats**, **bookings** (pessimistic lock + idempotency + audit log), **health**.

## Prerequisites

- **Node.js 24+** (matches `@types/node` ^24 and the `Dockerfile`; see `engines` in `package.json`)
- PostgreSQL 14+ (with `pgcrypto` for `gen_random_uuid()` — enabled by the first migration)

## Environment

Copy `.env.example` to `.env` and adjust values.

## Database migrations

Migrations live in `src/migrations/` as separate files:

| File | Purpose |
|------|---------|
| `1740000000000-create-initial-schema.ts` | Initial tables: tenants, users, events, seats, bookings, booking_seats, booking_audit_logs |
| `1740000000001-add-event-cover-image-url.ts` | Schema change: `events.cover_image_url` (optional hero / CDN URL) |

Run migrations (uses `src/database/data-source.ts`):

```bash
npm run migration:run
npm run migration:show
npm run migration:revert   # rolls back the last migration
```

## Local PostgreSQL (Docker)

**Postgres only** (DB on `localhost:5432` for `npm run start:dev` / migrations on the host):

```bash
docker compose up -d postgres
```

**Postgres + API** (API must not use `DB_HOST=localhost` inside Docker—that points at the API container itself, not Postgres):

```bash
docker compose up --build -d
```

The `api` service gets `DB_HOST=postgres` (the Compose service name). If you run the API image with plain `docker run`, pass `-e DB_HOST=host.docker.internal` (Docker Desktop) or attach the container to the same network as Postgres and set `DB_HOST` to that service name.

Then create the database if needed (`eventra` user/password match `.env.example`).

## Seed demo data

After migrations:

```bash
npm run seed
```

Creates demo tenant, users (`admin@demo.local`, `owner@demo.local`, `customer@demo.local` — password `password123`), events matching the frontend mock slugs, and seat grids.

## API

Base path: **`/api/v1`**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness |
| POST | `/auth/register` | No | Register customer or owner (admin blocked) |
| POST | `/auth/login` | No | JWT access token |
| GET | `/events` | No | List events (`q`, `category`, `skip`, `take`) |
| GET | `/events/:slug` | No | Event detail + `seatsAvailable` |
| GET | `/events/:slug/seats` | No | Seat map |
| POST | `/bookings/locks` | Bearer JWT | Lock seats; requires header **`Idempotency-Key`** |

Default port **9001** (override with `PORT`). CORS: set `CORS_ORIGINS` to a comma-separated allowlist (e.g. `http://localhost:3000`) or leave unset to reflect the requesting origin in development.

## Docker image (API only)

The root **`Dockerfile`** uses **Node 24** (`node:24-bookworm-slim`), multi-stage build, non-root user, default **`PORT=9001`**, healthcheck on `/api/v1/health`, and **`node dist/main.js`** (same as `npm run start:prod`).

```bash
docker build -t eventra-be .
docker run --rm -p 9001:9001 -e DB_HOST=host.docker.internal -e DB_USER=eventra -e DB_PASSWORD=eventra -e DB_NAME=eventra -e JWT_SECRET=dev-only-change-me-min-32-characters-long eventra-be
```

## Scripts

```bash
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e   # requires PostgreSQL (same .env as the app)
```
