# Epic 1: Project Setup, Auth & User Management — Spec

## 1. Goal

Stand up the full-stack monorepo, authentication system, role-based access control, and responsive app shell so that an admin can log in, manage users (create, approve, reject, deactivate, reactivate), and an editor can log in and see their scoped view.

## 2. Dependencies

None — this is the foundation epic. All other epics depend on this.

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo | Turborepo + pnpm workspaces | Fast builds, native workspace support |
| Frontend + Backend | Next.js 14+ (App Router) | Full-stack in one framework, RSC support |
| Auth | NextAuth.js (Auth.js v5) with credentials provider | Session-based auth with cookies, built-in CSRF |
| Database | PostgreSQL + Prisma ORM | Type-safe queries, declarative migrations |
| UI | shadcn/ui (Radix + Tailwind CSS) | Accessible, customizable, copy-paste components |
| API pattern | Server Actions for mutations, API Routes for complex endpoints | Collocated mutations, dedicated routes where needed |
| CI | GitHub Actions | Lint + typecheck + test on every push |

## 4. Implementation Tasks

### 4.1 Monorepo Scaffolding

1. Initialize repo with `pnpm init` and create `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```
2. Add `turbo.json` with pipelines for `build`, `dev`, `lint`, `typecheck`, `test`.
3. Create directory structure:
   ```
   apps/
     web/          # Next.js app
   packages/
     db/           # Prisma schema + client
     ui/           # Shared UI components (optional, can start in apps/web)
   ```
4. Add root `package.json` scripts: `dev`, `build`, `lint`, `typecheck`, `test`.
5. Add shared configs: `tsconfig.base.json`, `.eslintrc.js`, `.prettierrc`.

### 4.2 Next.js App Setup

1. Scaffold `apps/web` with `create-next-app` (App Router, TypeScript, Tailwind CSS, `src/` directory).
2. Install and initialize shadcn/ui:
   ```bash
   pnpm dlx shadcn@latest init
   ```
3. Configure `tailwind.config.ts` with shadcn/ui theme and content paths.
4. Create base layout at `src/app/layout.tsx` with font, theme provider, and Toaster.

### 4.3 PostgreSQL + Prisma Setup

1. Create `packages/db/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   generator client {
     provider = "prisma-client-js"
   }

   enum Role {
     ADMIN
     EDITOR
   }

   enum UserStatus {
     PENDING
     ACTIVE
     DEACTIVATED
   }

   model User {
     id             String     @id @default(cuid())
     email          String     @unique
     name           String
     passwordHash   String
     role           Role       @default(EDITOR)
     status         UserStatus @default(PENDING)
     createdAt      DateTime   @default(now())
     updatedAt      DateTime   @updatedAt

     @@index([email])
     @@index([status])
   }
   ```
2. Add `packages/db/package.json` with scripts: `generate`, `migrate:dev`, `migrate:deploy`, `studio`.
3. Export typed Prisma client from `packages/db/src/index.ts`.
4. Add `.env` to `.gitignore`; create `.env.example` with `DATABASE_URL` placeholder.

### 4.4 Seed Script

1. Create `packages/db/prisma/seed.ts`:
   - Hash default admin password using `bcryptjs`.
   - Upsert admin user: `admin@example.com`, role `ADMIN`, status `ACTIVE`.
2. Configure `prisma.seed` in `packages/db/package.json`:
   ```json
   "prisma": { "seed": "tsx prisma/seed.ts" }
   ```

### 4.5 NextAuth.js v5 Integration

1. Install `next-auth@5` and `@auth/prisma-adapter` in `apps/web`.
2. Create `src/lib/auth.ts`:
   - Configure credentials provider: validate email + password against `User` table using `bcryptjs.compare`.
   - Reject login if `user.status !== "ACTIVE"` (return error: "Account not active").
   - Session callback: include `user.id`, `user.role`, `user.status` in the session.
3. Create `src/app/api/auth/[...nextauth]/route.ts` exporting handlers.
4. Create `src/lib/auth-utils.ts`:
   - `getRequiredSession()` — returns session or redirects to `/login`.
   - `requireRole(role: Role)` — throws 403 if session user doesn't have the required role.
5. Add `AUTH_SECRET` to `.env.example`.

### 4.6 Auth Pages

All pages under `src/app/(auth)/` layout (centered card, no sidebar).

1. **Login** — `src/app/(auth)/login/page.tsx`
   - Email + password form. Server Action calls `signIn("credentials", ...)`.
   - Error states: invalid credentials, account pending, account deactivated.
   - Link to registration page.

2. **Register** — `src/app/(auth)/register/page.tsx`
   - Name, email, password, confirm password form.
   - Server Action: validate inputs, hash password, create User with `status: PENDING`.
   - On success, redirect to `/pending`.

3. **Pending Approval** — `src/app/(auth)/pending/page.tsx`
   - Static page: "Your account is pending admin approval."
   - If user is already `ACTIVE`, redirect to `/`.

### 4.7 App Shell

Layout at `src/app/(dashboard)/layout.tsx` — requires authenticated session.

1. **Sidebar** (`src/components/sidebar.tsx`):
   - Fixed left sidebar (w-64) on desktop (>= 1024px).
   - Navigation links: Dashboard (home), Manuals (placeholder), User Management (admin only).
   - User info at bottom: name, role, sign-out button.

2. **Header** (`src/components/header.tsx`):
   - Top header bar with hamburger button (visible on mobile < 1024px).
   - Page title slot.

3. **Mobile Drawer** (`src/components/mobile-drawer.tsx`):
   - Sheet component (shadcn/ui) slides in from left on hamburger click.
   - Same navigation items as sidebar.
   - Closes on link click or outside click.

4. **Dashboard page** — `src/app/(dashboard)/page.tsx`:
   - Welcome message with user name. Placeholder content for now.

### 4.8 Admin User Management

Page at `src/app/(dashboard)/admin/users/page.tsx` — requires `ADMIN` role.

1. **User list table** with columns: Name, Email, Role, Status, Actions.
   - Filterable by status (All / Pending / Active / Deactivated).
   - Sortable by name or created date.

2. **Actions per user:**
   - Pending users: Approve (-> `ACTIVE`), Reject (-> `DEACTIVATED`).
   - Active users: Deactivate (-> `DEACTIVATED`), Change role (toggle Admin/Editor).
   - Deactivated users: Reactivate (-> `ACTIVE`).

3. **Create user dialog:**
   - Form: name, email, password, role select.
   - Creates user with `status: ACTIVE` (admin-created users skip approval).

4. **API Routes** at `src/app/api/users/`:
   - `GET /api/users` — list users (admin only), supports `?status=` filter.
   - `POST /api/users` — create user (admin only).
   - `PATCH /api/users/[id]` — update user status/role (admin only).

### 4.9 Role-Based Route Protection

1. **Middleware** (`src/middleware.ts`):
   - Redirect unauthenticated users to `/login` for all `/(dashboard)` routes.
   - Redirect non-admin users away from `/admin/*` routes to `/`.
   - Allow `/(auth)/*` routes for unauthenticated users; redirect authenticated users to `/`.

2. **Server-side checks:**
   - Each admin API route calls `requireRole("ADMIN")` before processing.
   - Dashboard layout calls `getRequiredSession()`.

### 4.10 CI Pipeline

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

### 4.11 Test Setup

1. **Vitest** — install in `apps/web`, configure `vitest.config.ts` with path aliases.
2. **Playwright** — install in `apps/web`, configure `playwright.config.ts`:
   - Base URL: `http://localhost:3000`.
   - Projects: chromium, mobile chrome (viewport 375x667).
   - `webServer` config to start dev server before tests.
3. Add test scripts to `apps/web/package.json`: `test` (vitest), `test:e2e` (playwright).
4. Create test helpers:
   - `tests/e2e/helpers/auth.ts` — login helper function for Playwright tests.
   - `tests/e2e/helpers/seed.ts` — seed test database with known users before E2E runs.

## 5. API Contracts

### POST /api/auth/callback/credentials (NextAuth)

Handled by NextAuth. Request via `signIn("credentials", { email, password })`.

### GET /api/users

**Auth:** Admin only.

Query params: `?status=PENDING|ACTIVE|DEACTIVATED`

```typescript
// Response 200
type UsersResponse = {
  users: {
    id: string
    email: string
    name: string
    role: "ADMIN" | "EDITOR"
    status: "PENDING" | "ACTIVE" | "DEACTIVATED"
    createdAt: string
  }[]
}
```

### POST /api/users

**Auth:** Admin only.

```typescript
// Request
type CreateUserRequest = {
  email: string
  name: string
  password: string
  role: "ADMIN" | "EDITOR"
}

// Response 201
type CreateUserResponse = {
  user: { id: string; email: string; name: string; role: string; status: "ACTIVE" }
}

// Response 409 — email already exists
// Response 400 — validation error
```

### PATCH /api/users/[id]

**Auth:** Admin only.

```typescript
// Request (all fields optional)
type UpdateUserRequest = {
  status?: "ACTIVE" | "DEACTIVATED"
  role?: "ADMIN" | "EDITOR"
}

// Response 200
type UpdateUserResponse = {
  user: { id: string; email: string; name: string; role: string; status: string }
}

// Response 404 — user not found
```

## 6. Data Model

```prisma
enum Role {
  ADMIN
  EDITOR
}

enum UserStatus {
  PENDING
  ACTIVE
  DEACTIVATED
}

model User {
  id             String     @id @default(cuid())
  email          String     @unique
  name           String
  passwordHash   String
  role           Role       @default(EDITOR)
  status         UserStatus @default(PENDING)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([email])
  @@index([status])
}
```

## 7. Acceptance Criteria

All E2E criteria follow the pattern: **Given** [state], **When** [action], **Then** [observable assertion].

### Authentication

| # | Criterion | Type |
|---|-----------|------|
| AC-1 | Given a seeded admin user (status ACTIVE), when the user fills in email and password on `/login` and clicks the submit button, then the browser navigates to `/` and a heading containing the admin's name is visible on the page. | e2e |
| AC-2 | Given a seeded admin user, when the user fills in the correct email but an incorrect password on `/login` and submits, then the page remains at `/login` and an element with `[role="alert"]` containing the text "Invalid credentials" is visible. | e2e |
| AC-3 | Given a seeded user with status PENDING, when the user fills in their email and password on `/login` and submits, then the page remains at `/login` and an element with `[role="alert"]` containing the text "Account not active" is visible. | e2e |
| AC-4 | Given a seeded user with status DEACTIVATED, when the user fills in their email and password on `/login` and submits, then the page remains at `/login` and an element with `[role="alert"]` containing the text "Account not active" is visible. | e2e |
| AC-5 | Given the `/register` page, when the user fills in name, email, password, and confirm password and clicks the submit button, then the browser navigates to `/pending` and the text "Your account is pending admin approval" is visible. | e2e |
| AC-6 | Given a seeded user with email `existing@example.com`, when a new user tries to register on `/register` with the same email, then the page remains at `/register` and an element with `[role="alert"]` containing the text "already exists" is visible. | e2e |
| AC-7 | Given a seeded user with status PENDING who is logged in, when they attempt to navigate to `/`, then the browser redirects to `/pending` and the text "pending admin approval" is visible. | e2e |
| AC-8 | Given an unauthenticated browser, when the user navigates to `/`, then the browser redirects to `/login` and the URL path is `/login`. | e2e |

### Admin User Management

| # | Criterion | Type |
|---|-----------|------|
| AC-9 | Given an admin is logged in, when they navigate to `/admin/users`, then a `<table>` element is visible containing rows for each seeded user, and each row displays the user's name, email, role, and status. | e2e |
| AC-10 | Given an admin is on `/admin/users` and a status filter dropdown is present, when the admin selects "Pending", then only rows where the status cell contains "Pending" are visible in the table. | e2e |
| AC-11 | Given an admin is on `/admin/users` and a user with status "Pending" exists, when the admin clicks the "Approve" button in that user's row, then the status cell for that user changes to "Active". | e2e |
| AC-12 | Given an admin is on `/admin/users` and a user with status "Pending" exists, when the admin clicks the "Reject" button in that user's row, then the status cell for that user changes to "Deactivated". | e2e |
| AC-13 | Given an admin is on `/admin/users` and a user with status "Active" exists, when the admin clicks the "Deactivate" button in that user's row, then the status cell for that user changes to "Deactivated". | e2e |
| AC-14 | Given an admin is on `/admin/users` and a user with status "Deactivated" exists, when the admin clicks the "Reactivate" button in that user's row, then the status cell for that user changes to "Active". | e2e |
| AC-15 | Given an admin is on `/admin/users`, when they click a "Create User" button, then a dialog/modal appears with fields for name, email, password, and role. When the admin fills the form and submits, the dialog closes and a new row with the created user's name, email, role, and status "Active" appears in the table. | e2e |
| AC-16 | Given an admin is on `/admin/users` and an active editor user exists, when the admin changes that user's role to "Admin" via the role control in the row, then the role cell for that user displays "Admin". | e2e |

### Role-Based Access Control

| # | Criterion | Type |
|---|-----------|------|
| AC-17 | Given an editor user is logged in, when they navigate to `/admin/users`, then the browser redirects to `/` and the URL path is `/`. | e2e |
| AC-18 | Given an editor user is logged in and the sidebar is visible, then the sidebar does not contain any element with the text "User Management". | e2e |

### Responsive App Shell

| # | Criterion | Type |
|---|-----------|------|
| AC-19 | Given an authenticated user on a desktop viewport (1280x720), when the dashboard page loads, then a `<nav>` sidebar element with a width of at least 200px is visible on the left side of the page. | e2e |
| AC-20 | Given an authenticated user on a mobile viewport (375x667), when the dashboard page loads, then the sidebar `<nav>` element is not visible and a `<button>` with an accessible name containing "menu" (the hamburger button) is visible. | e2e |
| AC-21 | Given an authenticated user on a mobile viewport (375x667), when the user clicks the hamburger menu button, then a drawer/sheet element containing navigation links (including "Dashboard" and "Manuals") becomes visible. When the user clicks a navigation link inside the drawer, the drawer closes and the page navigates to the link's target. | e2e |
| AC-22 | Given the `/login` page on a mobile viewport (375x667), when the page loads, then the login form (email input, password input, submit button) is fully visible within the viewport without horizontal scrolling. | e2e |
| AC-23 | Given the `/register` page on a mobile viewport (375x667), when the page loads, then the registration form (name, email, password, confirm password inputs, submit button) is fully visible within the viewport without horizontal scrolling. | e2e |

### Infrastructure (Non-E2E)

| # | Criterion | Type |
|---|-----------|------|
| AC-24 | `hashPassword()` hashes a password and `verifyPassword()` returns true for the correct input and false for an incorrect input. | unit |
| AC-25 | Seed script creates an initial admin user with email `admin@example.com`, role `ADMIN`, status `ACTIVE`. Running the seed script twice does not create duplicate users. | integration |
| AC-26 | Prisma migrations apply successfully to an empty database (all tables from the schema are created). | integration |
| AC-27 | `.github/workflows/ci.yml` exists and defines a job that runs `pnpm lint`, `pnpm typecheck`, and `pnpm test`. | structural |

## 8. TDD Approach

All tests should be written **before** the corresponding implementation code. Follow this order:

1. **Write E2E test skeletons first.** Create the Playwright spec files (`auth.spec.ts`, `admin-users.spec.ts`, `rbac.spec.ts`, `shell.spec.ts`) with all test cases described in section 8.1 below. Each test should be fully written with selectors, actions, and assertions -- they will fail until the feature is implemented.
2. **Write unit tests before utility functions.** Write `auth.test.ts` (AC-24) before implementing `hashPassword`/`verifyPassword`.
3. **Write integration tests before seed/migration work.** Write `seed.test.ts` (AC-25) and `migration.test.ts` (AC-26) before finalizing the seed script and schema.
4. **Implement the feature** to make the failing tests pass.
5. **Verify** all tests pass before considering a story complete.

Each story (1.1 through 1.6) is considered done only when all its associated acceptance criteria tests pass.

## 9. Test Plan

### 9.1 E2E Tests (Playwright)

#### `tests/e2e/auth.spec.ts`
**Setup:** Seed database with admin (active), editor (active), pending user, deactivated user, user with email `existing@example.com`.

- Login with valid admin credentials -> redirected to `/`, heading with admin name visible (AC-1)
- Login with invalid password -> `[role="alert"]` with "Invalid credentials" visible (AC-2)
- Login with pending account -> `[role="alert"]` with "Account not active" visible (AC-3)
- Login with deactivated account -> `[role="alert"]` with "Account not active" visible (AC-4)
- Register new user -> redirected to `/pending`, "pending admin approval" text visible (AC-5)
- Register with existing email -> `[role="alert"]` with "already exists" visible (AC-6)
- Pending user cannot access dashboard -> redirected to `/pending` (AC-7)
- Unauthenticated visit to `/` -> redirected to `/login` (AC-8)
- Login page fully visible on mobile viewport 375x667, no horizontal overflow (AC-22)
- Register page fully visible on mobile viewport 375x667, no horizontal overflow (AC-23)

#### `tests/e2e/admin-users.spec.ts`
**Setup:** Seed database with admin, 2 active editors, 1 pending user, 1 deactivated user. Login as admin.

- User list table displays all users with Name, Email, Role, Status columns (AC-9)
- Filter by "Pending" shows only pending users (AC-10)
- Approve pending user -> status cell changes to "Active" (AC-11)
- Reject pending user -> status cell changes to "Deactivated" (AC-12)
- Deactivate active user -> status cell changes to "Deactivated" (AC-13)
- Reactivate deactivated user -> status cell changes to "Active" (AC-14)
- Create new user via dialog -> new row appears in table with status "Active" (AC-15)
- Change user role from Editor to Admin -> role cell updates (AC-16)

#### `tests/e2e/rbac.spec.ts`
**Setup:** Seed database with admin and editor. Login as editor.

- Navigate to `/admin/users` -> redirected to `/` (AC-17)
- Sidebar does not contain "User Management" text (AC-18)

#### `tests/e2e/shell.spec.ts`
**Setup:** Login as any authenticated user.

- Desktop viewport (1280x720): sidebar `<nav>` is visible with width >= 200px (AC-19)
- Mobile viewport (375x667): sidebar hidden, hamburger button with accessible name "menu" is visible (AC-20)
- Mobile: click hamburger -> drawer with navigation links appears; click link -> drawer closes and navigates (AC-21)

### 9.2 Unit Tests (Vitest)

#### `tests/unit/auth.test.ts`
- `hashPassword()` returns a bcrypt hash (AC-24)
- `verifyPassword()` returns true for correct password (AC-24)
- `verifyPassword()` returns false for incorrect password (AC-24)

### 9.3 Integration Tests (Vitest)

#### `tests/integration/seed.test.ts`
**Setup:** Test database.

- Seed script creates admin user with email `admin@example.com`, role `ADMIN`, status `ACTIVE` (AC-25)
- Seed script is idempotent -- running twice does not create duplicates (AC-25)

#### `tests/integration/migration.test.ts`
- Prisma migrations apply successfully to empty database (AC-26)

## 10. Out of Scope

- Email notifications (explicit project exclusion)
- Password reset flow (deferred to a future iteration)
- OAuth / social login providers (credentials only for now)
- Two-factor authentication
- User profile editing (users editing their own profile)
- User avatars / profile pictures
- Invite-based registration (using open registration with approval)
- Rate limiting on auth endpoints (can be added later)
- Audit logging of admin actions
