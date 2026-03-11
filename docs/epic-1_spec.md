# Epic 1: Project Setup, Auth & User Management — Spec

## 1. Goal

Stand up the full-stack monorepo, authentication system, role-based access control, and responsive app shell so that an admin can log in, manage users (create, approve, deactivate), and an editor can log in and see their scoped view.

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
   - Fixed left sidebar (w-64) on desktop (≥ 1024px).
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
   - Pending users: Approve (→ `ACTIVE`), Reject (→ `DEACTIVATED`).
   - Active users: Deactivate (→ `DEACTIVATED`), Change role (toggle Admin/Editor).
   - Deactivated users: Reactivate (→ `ACTIVE`).

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
   - Projects: chromium, mobile chrome (viewport 375×667).
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

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Admin can log in with valid email and password and is redirected to dashboard | e2e | `auth.spec.ts`: fill login form → assert URL is `/` and welcome message visible |
| AC-2 | Login with invalid credentials shows an error message | e2e | `auth.spec.ts`: fill wrong password → assert error text visible |
| AC-3 | Login with a pending account shows "account not active" error | e2e | `auth.spec.ts`: login as pending user → assert error message |
| AC-4 | Login with a deactivated account shows "account not active" error | e2e | `auth.spec.ts`: login as deactivated user → assert error message |
| AC-5 | New user can register with name, email, and password | e2e | `auth.spec.ts`: fill registration form → assert redirect to `/pending` |
| AC-6 | Registration with an existing email shows a validation error | e2e | `auth.spec.ts`: register with taken email → assert error message |
| AC-7 | Registered user sees "pending approval" page and cannot access dashboard | e2e | `auth.spec.ts`: login as pending user → assert `/pending` page shown, navigation to `/` redirects back |
| AC-8 | Admin can view a list of all users with name, email, role, and status | e2e | `admin-users.spec.ts`: login as admin → navigate to `/admin/users` → assert table with user rows |
| AC-9 | Admin can filter user list by status (Pending, Active, Deactivated) | e2e | `admin-users.spec.ts`: select "Pending" filter → assert only pending users shown |
| AC-10 | Admin can approve a pending user, changing their status to Active | e2e | `admin-users.spec.ts`: click Approve on pending user → assert status changes to Active |
| AC-11 | Admin can deactivate an active user | e2e | `admin-users.spec.ts`: click Deactivate on active user → assert status changes to Deactivated |
| AC-12 | Admin can create a new user with a specified role | e2e | `admin-users.spec.ts`: open create dialog → fill form → submit → assert new user appears in list |
| AC-13 | Admin can change a user's role between Admin and Editor | e2e | `admin-users.spec.ts`: change role dropdown → assert role updated |
| AC-14 | Editor cannot access `/admin/users` — redirected to dashboard | e2e | `rbac.spec.ts`: login as editor → navigate to `/admin/users` → assert redirect to `/` |
| AC-15 | Editor does not see "User Management" link in sidebar navigation | e2e | `rbac.spec.ts`: login as editor → assert sidebar does not contain "User Management" |
| AC-16 | App shell sidebar is visible on desktop (≥ 1024px) | e2e | `shell.spec.ts`: desktop viewport → assert sidebar visible |
| AC-17 | App shell sidebar collapses to hamburger drawer on mobile (< 1024px) | e2e | `shell.spec.ts`: mobile viewport → assert sidebar hidden, hamburger visible → click hamburger → assert drawer opens |
| AC-18 | Auth pages (login, register) render correctly on mobile viewport | e2e | `auth.spec.ts`: mobile viewport → assert login form is usable and not overflowing |
| AC-19 | `hashPassword()` hashes a password and `verifyPassword()` returns true for correct input | unit | `auth.test.ts`: hash then verify → assert true; verify wrong password → assert false |
| AC-20 | Seed script creates an initial admin user with ACTIVE status | integration | `seed.test.ts`: run seed → query DB → assert admin user exists with correct role and status |
| AC-21 | Prisma migrations apply and roll back cleanly | integration | `migration.test.ts`: run `migrate deploy` → assert tables exist; run `migrate reset` → assert clean state |
| AC-22 | CI pipeline runs lint, typecheck, and tests on push | e2e | Verify GitHub Actions workflow file exists and passes on a test push |
| AC-23 | Unauthenticated user accessing `/` is redirected to `/login` | e2e | `auth.spec.ts`: visit `/` without session → assert redirect to `/login` |

## 8. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/auth.spec.ts`
**Setup:** Seed database with admin (active), editor (active), pending user, deactivated user.

- Login with valid admin credentials → redirected to dashboard (AC-1)
- Login with invalid password → error message shown (AC-2)
- Login with pending account → "not active" error (AC-3)
- Login with deactivated account → "not active" error (AC-4)
- Register new user → redirected to `/pending` (AC-5)
- Register with existing email → validation error (AC-6)
- Pending user cannot access dashboard → stays on `/pending` (AC-7)
- Unauthenticated visit to `/` → redirect to `/login` (AC-23)
- Login page renders correctly on mobile viewport (375×667) (AC-18)
- Register page renders correctly on mobile viewport (AC-18)

#### `tests/e2e/admin-users.spec.ts`
**Setup:** Seed database with admin, 2 active editors, 1 pending user, 1 deactivated user. Login as admin.

- User list displays all users with correct columns (AC-8)
- Filter by "Pending" shows only pending users (AC-9)
- Approve pending user → status becomes Active (AC-10)
- Deactivate active user → status becomes Deactivated (AC-11)
- Create new user via dialog → user appears in list (AC-12)
- Change user role from Editor to Admin (AC-13)

#### `tests/e2e/rbac.spec.ts`
**Setup:** Seed database with admin and editor. Login as editor.

- Navigate to `/admin/users` → redirected to `/` (AC-14)
- Sidebar does not contain "User Management" link (AC-15)

#### `tests/e2e/shell.spec.ts`
**Setup:** Login as any authenticated user.

- Desktop viewport: sidebar visible with navigation links (AC-16)
- Mobile viewport: sidebar hidden, hamburger button visible (AC-17)
- Mobile: click hamburger → drawer opens with navigation (AC-17)
- Mobile: click nav link in drawer → drawer closes and navigates (AC-17)

### Unit Tests (Vitest)

#### `tests/unit/auth.test.ts`
- `hashPassword()` returns a bcrypt hash (AC-19)
- `verifyPassword()` returns true for correct password (AC-19)
- `verifyPassword()` returns false for incorrect password (AC-19)

### Integration Tests (Vitest)

#### `tests/integration/seed.test.ts`
**Setup:** Test database.

- Seed script creates admin user with email `admin@example.com`, role `ADMIN`, status `ACTIVE` (AC-20)
- Seed script is idempotent — running twice doesn't create duplicates (AC-20)

#### `tests/integration/migration.test.ts`
- Prisma migrations apply successfully to empty database (AC-21)

## 9. UX Verification

**Verification command:** `/verify-ux "Auth pages, admin user management, and app shell"`

**Pages/routes to verify:**
- `/login` — login form
- `/register` — registration form
- `/pending` — pending approval status
- `/` — dashboard (app shell)
- `/admin/users` — admin user management

**Key UX checkpoints:**
- Login and register forms are centered, readable, and usable on both desktop and mobile
- Error messages are visible and descriptive (not generic "something went wrong")
- Sidebar is fixed on desktop with clear navigation hierarchy
- Mobile drawer opens/closes smoothly with animation
- User management table is readable with clear action buttons
- Status badges use distinct colors (e.g., green=active, yellow=pending, red=deactivated)
- Create user dialog is a modal with proper focus trap
- All interactive elements have visible focus states (keyboard accessibility)

**Expected E2E test coverage:** AC-1 through AC-18, AC-23 (all e2e-type criteria).

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
