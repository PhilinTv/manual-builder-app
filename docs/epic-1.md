# Epic 1: Project Setup, Auth & User Management

**Goal:** Authenticated users can log in, admins can manage users. Sets up project infrastructure.

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 1.1 | Project scaffolding | Monorepo structure, dev/build/lint scripts, CI pipeline runs on push |
| 1.2 | Database & ORM setup | Schema migrations work, seed script creates initial admin |
| 1.3 | User registration & login | Users can register, log in, receive JWT/session; passwords are hashed |
| 1.4 | Role-based access (Admin / Editor) | Admin role can access user management; Editor role cannot |
| 1.5 | Admin: user CRUD | Admin can list, create, deactivate users and assign roles |
| 1.6 | Responsive app shell | Navigation, layout, and auth screens render correctly on desktop and mobile web |

**Done when:** An admin can log in, create an editor user, and that editor can log in. App shell is responsive.

---

## Brainstorming

**Confidence Level:** 95%

### Summary

**Product:**
- Open registration with admin approval — users sign up freely, admin approves/rejects before access is granted
- Two roles: Admin (full access + user management) and Editor (manual editing only)
- Seed script creates initial admin on first deployment

**UX:**
- Fixed sidebar + top header layout, collapsing to hamburger drawer on mobile
- Built with shadcn/ui (Radix + Tailwind) for accessible, customizable, "stunning" design
- Auth screens: login, registration, "pending approval" status, password reset — all responsive
- Admin user management: list users with status (active/pending/deactivated), approve/reject/deactivate actions

**Architecture:**
- Turborepo monorepo with pnpm workspaces
- Full-stack Next.js (App Router) — React frontend + API Routes backend
- Session-based auth via NextAuth.js (Auth.js v5) with credentials provider
- PostgreSQL with Prisma ORM for data layer
- Server Actions for form mutations, API Routes for complex/external endpoints
- CI pipeline with linting, type checking, and tests on push

### Expected Outcome

- **Auth screens:** Login, registration (or invite acceptance), password reset — all responsive and polished
- **Admin dashboard:** User management page where admin can list, create, deactivate users and assign roles (Admin/Editor)
- **App shell:** Fixed sidebar + top header, collapsible to hamburger drawer on mobile, responsive across desktop and mobile web, built with shadcn/ui + Tailwind
- **Registration flow:** Open registration form with "pending approval" status screen; admin sees pending users in user management and can approve/reject
- **Infrastructure:** Turborepo monorepo with full-stack Next.js app (API routes for backend), database with migrations, CI pipeline, seed script for initial admin

### Acceptance Criteria

1. Admin can log in with email and password via NextAuth.js session-based auth
2. Admin can create a new user with a specified role (Admin or Editor)
3. Admin can deactivate a user, preventing further login
4. Admin can approve or reject pending user registrations
5. New user can register; account is created in "pending" state until admin approves
6. Editor can log in and sees only Editor-level features (no user management)
7. Auth screens (login, register, pending status) render correctly on mobile web (≤ 768px) and desktop
8. App shell (sidebar + header) works on desktop; collapses to hamburger drawer on mobile
9. CI pipeline runs linting, type checking, and tests on every push
10. Database migrations (Prisma) can be run and rolled back cleanly
11. Seed script creates an initial admin user

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| #  | Question               | Decision                                                    | Round |
|----|------------------------|-------------------------------------------------------------|-------|
| 1  | Authentication strategy | Session-based auth (server-side sessions with cookies)     | 1     |
| 2  | User registration flow  | Open registration with admin approval (staged onboarding)  | 1     |
| 3  | Frontend framework      | Next.js (App Router) with React                            | 1     |
| 4  | Backend framework       | Next.js API Routes (full-stack Next.js)                    | 1     |
| 5  | Monorepo tooling        | Turborepo with pnpm workspaces                             | 1     |
| 6  | App shell layout        | Fixed sidebar + top header, collapsible hamburger on mobile | 1     |
| 7  | UI component library    | shadcn/ui (Radix + Tailwind)                               | 1     |
| 8  | Database choice         | PostgreSQL with Prisma ORM                                 | 2     |
| 9  | Auth library            | NextAuth.js (Auth.js v5)                                   | 2     |
| 10 | API pattern             | Server Actions + API Routes                                | 2     |

### Discussion Log

#### Round 1

- **Questions asked:** Authentication strategy, registration flow, frontend framework, backend framework, database, monorepo tooling, app shell layout, UI component library
- **Answers:** Session-based auth, open registration with admin approval, Next.js (App Router) for frontend, Next.js API Routes for backend (full-stack), Turborepo, fixed sidebar + top header, shadcn/ui

#### Round 2

- **Questions asked:** Database choice, auth library for Next.js, API pattern within Next.js
- **Answers:** PostgreSQL with Prisma, NextAuth.js (Auth.js v5), Server Actions + API Routes
