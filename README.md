# User Manuals Builder

A full-stack application for creating, managing, and translating user manuals with WYSIWYG editing, version history, real-time collaboration notifications, and AI-powered translations.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Monorepo:** Turborepo + pnpm workspaces
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5 (credentials provider)
- **UI:** shadcn/ui (Radix + Tailwind CSS)
- **Editor:** Tiptap (ProseMirror)
- **Real-time:** Server-Sent Events (SSE)
- **Translations:** OpenAI GPT-4o-mini
- **Testing:** Vitest (unit/integration) + Playwright (E2E)

## Project Structure

```
wapp/
  apps/
    web/              # Next.js application
  packages/
    db/               # Prisma schema, migrations, seed script
  docs/               # Epic specifications
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9.15 (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- **Docker** >= 20.10 (with Docker Compose v2)

## Local Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The defaults work out of the box for local dev — no edits required unless you need AI translations.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/app?schema=public` | PostgreSQL connection string |
| `AUTH_SECRET` | `your-secret-key-here` | NextAuth session secret (change in production) |
| `OPENAI_API_KEY` | `your-openai-api-key-here` | Required only for automated translations |

### 3. Start PostgreSQL

```bash
pnpm docker:up
```

Starts a Postgres 16 container on port 5432 via Docker Compose.

### 4. Provision the database

```bash
pnpm setup
```

This copies `.env` to sub-packages, waits for Postgres readiness, generates the Prisma client, pushes the schema to create all tables, and seeds test data.

### 5. Start the dev server

```bash
pnpm dev
```

The app runs at **http://localhost:3000**.

### Reset everything

If you need a completely fresh database:

```bash
pnpm docker:reset && pnpm db:wait && pnpm db:generate && pnpm db:push && pnpm db:seed
```

## Seed Credentials

The seed script (`packages/db/prisma/seed.ts`) creates one admin user:

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `admin123` |
| **Role** | `ADMIN` |
| **Status** | `ACTIVE` |

After logging in as admin, you can create additional users via **Admin > User Management** (`/admin/users`).

### User Roles

| Role | Capabilities |
|------|-------------|
| **ADMIN** | Full access: manage users, create/edit/delete manuals, manage danger warnings library, assign manuals to editors |
| **EDITOR** | Edit assigned manuals, add translations, favorite manuals. Cannot access user management or warnings library admin |

### User Registration Flow

1. New users register at `/register` with status **PENDING**
2. An admin must **approve** the user at `/admin/users` (status changes to **ACTIVE**)
3. Users created directly by an admin via the "Create User" dialog are immediately **ACTIVE**

## Available Scripts

All scripts run from the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm setup` | Full local setup: Docker, migrations, seed (run once) |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run Vitest unit and integration tests |
| `pnpm test:e2e` | Run Playwright E2E tests (requires dev server + DB) |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:push` | Push Prisma schema to database (creates/updates all tables) |
| `pnpm db:migrate:dev` | Run Prisma migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm docker:up` | Start PostgreSQL container |
| `pnpm docker:down` | Stop PostgreSQL container (data preserved) |
| `pnpm docker:reset` | Destroy volume and restart (fresh database) |

### Database-specific scripts (from `packages/db`):

```bash
pnpm --filter @app/db db:studio    # Open Prisma Studio (visual DB browser)
```

## Running Tests

### Unit and integration tests

```bash
pnpm test
```

Unit tests run without a database. Integration tests that require PostgreSQL will skip automatically if the database is unreachable.

### E2E tests (Playwright)

```bash
# Install Playwright browsers (first time only)
pnpm --filter @app/web exec playwright install

# Run E2E tests (starts dev server automatically)
pnpm test:e2e
```

Playwright tests run against `http://localhost:3000` in Chromium (desktop) and mobile Chrome viewports. A running PostgreSQL with seeded data is required.

## Troubleshooting

### Port 5432 already in use

If you have a local PostgreSQL running on port 5432, either stop it before running `pnpm docker:up`:

```bash
# macOS (Homebrew)
brew services stop postgresql@16

# Linux
sudo systemctl stop postgresql
```

Or change the host port in `docker-compose.yml` (e.g., `5433:5432`) and update `DATABASE_URL` in `.env` accordingly.

## Feature Overview

| Feature | Description |
|---------|-------------|
| **Auth & RBAC** | Login, registration with admin approval, role-based access control |
| **Manual CRUD** | Create, edit, publish, soft-delete manuals with Tiptap WYSIWYG editor |
| **Danger Warnings Library** | Shared reusable warnings (admin-managed) with severity levels |
| **Favorites** | Star/unstar manuals, filter by favorites with localStorage persistence |
| **Versioning** | Immutable version snapshots on publish, diff view, rollback |
| **Real-time Notifications** | SSE-powered toasts for publish/assignment events, stale content banner |
| **Multi-language** | Side-by-side translation editor, per-section status tracking, completeness indicators |
| **Auto-translate** | OpenAI-powered streaming translation with approval workflow and stale detection |

## Database Schema

Key models: `User`, `Manual`, `ManualAssignment`, `ManualVersion`, `DangerWarning`, `ManualWarning`, `UserFavorite`, `ManualLanguage`, `ManualTranslation`.

Inspect the full schema at `packages/db/prisma/schema.prisma` or run Prisma Studio:

```bash
pnpm --filter @app/db db:studio
```
