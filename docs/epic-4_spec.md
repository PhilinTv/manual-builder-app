# Favorite Manuals — Spec

## 1. Goal

Allow users to star/unstar manuals as favorites from both the list and detail views, filter the manual list to show only favorites via a filter chip, and persist the filter preference across browser sessions using localStorage.

## 2. Dependencies

- **Epic 1** — auth, User model.
- **Epic 2** — Manual model, manual list page, manual editor page, filter chip pattern.

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Favorite toggle icon | Star (filled/outlined) | Universal favorite metaphor (Gmail, GitHub) |
| Data model | `UserFavorite` join table (userId + manualId) | Relational, queryable, indexable |
| Toggle placement | Both list view and detail view | Supports browse-and-star and deep-read-and-star workflows |
| Filter UX | Filter chip in existing filter bar | Consistent with Epic 2's status/assignee chips |
| Filter persistence | localStorage | Simple, no backend changes, per-browser |
| Optimistic UI | Optimistic toggle with rollback on error | Instant feedback for low-risk action |

## 4. Implementation Tasks

### 4.1 Prisma Schema — UserFavorite Model

1. Add to `packages/db/prisma/schema.prisma`:

```prisma
model UserFavorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  manualId  String
  manual    Manual   @relation(fields: [manualId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, manualId])
  @@index([userId])
  @@index([manualId])
}
```

2. Add reverse relations to existing models:

```prisma
model User {
  // ... existing fields
  favorites UserFavorite[]
}

model Manual {
  // ... existing fields
  favoritedBy UserFavorite[]
}
```

3. Run `pnpm --filter db migrate:dev --name add-user-favorites`.

### 4.2 Favorite Service Layer

Create `apps/web/src/lib/services/favorite-service.ts`:

1. `toggleFavorite(userId, manualId)` — if favorite exists, delete it and return `{ favorited: false }`. If not, create it and return `{ favorited: true }`. Uses a single transaction.
2. `getUserFavorites(userId)` — return array of `manualId` strings for the given user.
3. `isFavorited(userId, manualId)` — return boolean.

### 4.3 API Route — Toggle Favorite

Create `apps/web/src/app/api/manuals/[id]/favorite/route.ts`:

```typescript
// POST /api/manuals/[id]/favorite
// Auth: any authenticated user
// Body: none
// Response 200: { favorited: boolean }
// Toggles the favorite state for the current user on the given manual.
```

### 4.4 API Route — User Favorites List

Create `apps/web/src/app/api/favorites/route.ts`:

```typescript
// GET /api/favorites
// Auth: any authenticated user
// Response 200: { manualIds: string[] }
// Returns all manual IDs favorited by the current user.
```

### 4.5 Star Toggle Component

Create `apps/web/src/components/manuals/favorite-toggle.tsx`:

1. Props: `manualId: string`, `initialFavorited: boolean`, `className?: string`.
2. Renders a star icon button: `Star` (outlined) when not favorited, `StarFilled` (filled, yellow) when favorited.
3. `aria-label`: "Add to favorites" / "Remove from favorites".
4. Button element has `data-favorited="true"` or `data-favorited="false"` attribute.
5. On click:
   - Optimistically toggle local state and `data-favorited` attribute.
   - Call `POST /api/manuals/[id]/favorite`.
   - On error: rollback state, show error toast.
6. Prevent event propagation (so clicking star in a list row doesn't navigate to the manual).

### 4.6 Integrate Star in Manual List

Update `apps/web/src/components/manuals/manual-list.tsx`:

1. Fetch user's favorites on mount via `GET /api/favorites`.
2. Add `FavoriteToggle` component to each manual row, positioned before the product name.
3. Pass `initialFavorited` based on whether `manualId` is in the favorites set.

### 4.7 Integrate Star in Manual Editor Header

Update `apps/web/src/components/manuals/manual-editor.tsx`:

1. Add `FavoriteToggle` component in the header bar, next to the product name.
2. Fetch initial favorite state from `GET /api/favorites` or derive from manual detail response.

### 4.8 Favorites Filter Chip

Update `apps/web/src/components/manuals/manual-list.tsx`:

1. Add "Favorites" chip to the existing filter bar, alongside Status and Assignee chips.
2. When active: filter displayed manuals to only those in the user's favorites set.
3. Filtering is client-side (favorites set is already loaded).
4. Active chip is visually highlighted (filled background) and dismissable (click to toggle off).

### 4.9 Filter Persistence via localStorage

Create `apps/web/src/lib/hooks/use-persisted-filter.ts`:

1. Custom hook: `usePersistedFilter(key: string, defaultValue: boolean)`.
2. On mount: read from `localStorage.getItem(key)`, parse as boolean, set state.
3. On change: write to `localStorage.setItem(key, JSON.stringify(value))`.
4. Return `[value, setValue]`.

Update `apps/web/src/components/manuals/manual-list.tsx`:

1. Use `usePersistedFilter("favorites-filter", false)` for the Favorites chip state.
2. On page load, restore filter state from localStorage.

### 4.10 Favorites Empty State

Update `apps/web/src/components/manuals/manual-list.tsx`:

1. When "Favorites" filter is active and filtered results are empty, render an empty state:
   - Illustration (star icon or generic empty illustration).
   - Text: "No favorites yet".
   - CTA button: "Browse all manuals" — clears the Favorites filter.
2. This empty state is distinct from the "no manuals exist" empty state (Epic 2).

## 5. API Contracts

### Types

```typescript
type ToggleFavoriteResponse = {
  favorited: boolean
}

type UserFavoritesResponse = {
  manualIds: string[]
}
```

### Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/manuals/[id]/favorite` | Authenticated | Toggle favorite on/off |
| GET | `/api/favorites` | Authenticated | List current user's favorited manual IDs |

## 6. Data Model

```prisma
model UserFavorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  manualId  String
  manual    Manual   @relation(fields: [manualId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, manualId])
  @@index([userId])
  @@index([manualId])
}
```

## 7. Acceptance Criteria

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Given a user is on `/manuals`, when they click the star icon on an unfavorited manual row, then the star button's `data-favorited` attribute changes to `"true"` and the icon becomes filled | e2e | `favorites.spec.ts` |
| AC-2 | Given a user is on `/manuals` with a favorited manual, when they click the filled star icon, then the star button's `data-favorited` attribute changes to `"false"` and the icon becomes outlined | e2e | `favorites.spec.ts` |
| AC-3 | Given a user is on `/manuals/[id]`, when they click the star icon in the editor header, then the star button's `data-favorited` attribute changes to `"true"` | e2e | `favorites.spec.ts` |
| AC-4 | Given a user is on `/manuals/[id]` with the manual favorited, when they click the filled star icon in the header, then the star button's `data-favorited` attribute changes to `"false"` | e2e | `favorites.spec.ts` |
| AC-5 | Given the toggle API route is intercepted with a 3-second delay via `page.route()`, when the user clicks an unfavorited star, then `data-favorited` changes to `"true"` immediately before the API response resolves | e2e | `favorites.spec.ts` |
| AC-6 | Given the toggle API route is intercepted to return HTTP 500 via `page.route()`, when the user clicks a star, then `data-favorited` initially flips but reverts to its original value after the error, and a toast element with role `"status"` or class containing `"toast"` becomes visible | e2e | `favorites.spec.ts` |
| AC-7 | Given a user is on `/manuals`, then a chip/button with text "Favorites" is visible inside the filter bar area | e2e | `favorites.spec.ts` |
| AC-8 | Given a user has favorited 2 out of 5 manuals and is on `/manuals`, when they click the "Favorites" chip, then exactly 2 manual rows are visible in the list | e2e | `favorites.spec.ts` |
| AC-9 | Given the "Favorites" chip is active, when the user clicks the "Favorites" chip again, then all 5 manual rows are visible in the list | e2e | `favorites.spec.ts` |
| AC-10 | Given the user activates the "Favorites" chip on `/manuals` and then reloads the page, then after reload the "Favorites" chip is still in its active state and only favorited manuals are shown | e2e | `favorites.spec.ts` |
| AC-11 | Given the "Favorites" filter is active and the user has no favorited manuals, then the page displays the text "No favorites yet" and a button with text "Browse all manuals" | e2e | `favorites.spec.ts` |
| AC-12 | Given the empty state is shown with the "Browse all manuals" button, when the user clicks that button, then the "Favorites" chip becomes inactive and all manuals are displayed | e2e | `favorites.spec.ts` |
| AC-13 | Given user A favorites a manual, when user B logs in and navigates to `/manuals`, then user B's star for that manual has `data-favorited="false"` | integration | `favorite-service.test.ts` |
| AC-14 | Given a mobile viewport (375px width), when a user is on `/manuals`, then star icon buttons are visible and the "Favorites" chip is visible within the filter bar | e2e | `favorites.spec.ts` |
| AC-15 | Given a user is on `/manuals` and clicks a star icon inside a manual row, then `page.url()` remains `/manuals` (no navigation occurs) | e2e | `favorites.spec.ts` |
| AC-16 | Given no favorite exists for a user+manual pair, when `toggleFavorite(userId, manualId)` is called, then a `UserFavorite` row is created and `{ favorited: true }` is returned; calling it again deletes the row and returns `{ favorited: false }` | unit | `favorite-service.test.ts` |
| AC-17 | Given two users each with different favorites, when `getUserFavorites(userAId)` is called, then only user A's favorited manual IDs are returned | unit | `favorite-service.test.ts` |
| AC-18 | `POST /api/manuals/[id]/favorite` returns HTTP 401 when called without authentication | integration | `favorite-api.test.ts` |

## 8. TDD Approach

Tests should be written before implementation for each task:

1. **Unit tests first (task 4.2):** Write tests for `toggleFavorite`, `getUserFavorites`, and `isFavorited` in `tests/unit/favorite-service.test.ts` before implementing the service layer. Tests define expected behavior: toggle creates/deletes rows, getUserFavorites returns correct IDs per user.
2. **Integration tests next (tasks 4.3-4.4):** Write API route tests in `tests/integration/favorite-api.test.ts` that call the endpoints and assert response shape (`{ favorited: boolean }`, `{ manualIds: string[] }`) and HTTP status codes (200, 401). Implement routes to make tests pass.
3. **E2E tests last (tasks 4.5-4.10):** Write Playwright tests in `tests/e2e/favorites.spec.ts` covering all e2e acceptance criteria. Each test defines the expected DOM state (selectors, attributes, text content, visible element counts). Implement UI components to make tests pass.

Each failing test is committed before writing implementation code. This ensures all acceptance criteria are verifiable from the start.

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/favorites.spec.ts`
**Setup:** Seed database with admin, editor, 5 manuals (assigned to editor). Login as editor.

- Given user on `/manuals`, click star on unfavorited manual -> `data-favorited="true"` (AC-1)
- Given user on `/manuals` with favorited manual, click filled star -> `data-favorited="false"` (AC-2)
- Given user on `/manuals/[id]`, click star in header -> `data-favorited="true"` (AC-3)
- Given user on `/manuals/[id]` with favorited manual, click filled star in header -> `data-favorited="false"` (AC-4)
- Intercept toggle API with 3s delay, click star -> attribute flips immediately (AC-5)
- Intercept toggle API with 500 response, click star -> attribute reverts, toast visible (AC-6)
- Navigate to `/manuals` -> "Favorites" chip visible in filter bar (AC-7)
- Favorite 2 of 5 manuals, click "Favorites" chip -> 2 rows shown (AC-8)
- With filter active, click "Favorites" chip again -> all 5 rows shown (AC-9)
- Activate filter, reload page -> filter still active, only favorited manuals shown (AC-10)
- Activate filter with no favorites -> "No favorites yet" text and "Browse all manuals" button visible (AC-11)
- Click "Browse all manuals" -> filter deactivated, all manuals shown (AC-12)
- Mobile viewport (375px): star icons and "Favorites" chip visible (AC-14)
- Click star in list row -> `page.url()` stays `/manuals` (AC-15)

### Integration Tests (Vitest)

#### `tests/integration/favorite-service.test.ts`
**Setup:** Test database with 2 users and 3 manuals.

- User A favorites manual, user B's favorites do not include it (AC-13)

#### `tests/integration/favorite-api.test.ts`
**Setup:** Test database with user and manual.

- `POST /api/manuals/[id]/favorite` without auth returns 401 (AC-18)
- `POST /api/manuals/[id]/favorite` with auth returns `{ favorited: true }` then `{ favorited: false }` on second call
- `GET /api/favorites` with auth returns `{ manualIds: [...] }` matching user's favorites

### Unit Tests (Vitest)

#### `tests/unit/favorite-service.test.ts`

- `toggleFavorite` creates favorite when not exists, returns `{ favorited: true }` (AC-16)
- `toggleFavorite` deletes favorite when exists, returns `{ favorited: false }` (AC-16)
- `getUserFavorites` returns correct manual IDs per user (AC-17)

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-4_spec.md`

**Pages/routes to verify:**
- `/manuals` — manual list with star icons and Favorites filter chip
- `/manuals/[id]` — manual detail header with star icon

**Key UX checkpoints (automatable assertions):**
- Star icon buttons have `data-favorited` attribute reflecting current state
- Filled star has a visually distinct class or style (check via computed color or CSS class)
- Star button has `aria-label` of "Add to favorites" or "Remove from favorites"
- Clicking star in list row does not change `page.url()`
- "Favorites" chip in filter bar is a visible, clickable element with text "Favorites"
- Active "Favorites" chip has a distinct CSS class indicating active state
- Empty state contains exact text "No favorites yet" and a button with text "Browse all manuals"
- Mobile viewport (375px): all star buttons and the "Favorites" chip are visible (not hidden or overflowing)
- Error toast appears as a visible element after API failure rollback

**Expected E2E test coverage:** AC-1 through AC-12, AC-14, AC-15 (all e2e-type criteria).

## 11. Out of Scope

- Favorites count or "most favorited" ranking
- Shared/team favorites
- Favoriting from keyboard shortcuts (standard focus + Enter is sufficient)
- Favorites export or sync across devices
- Favorites in sidebar navigation (favorites live in the list filter only)
- Sorting by "favorited first" in the manual list
- Notifications when a favorited manual is updated
- Server-side filter persistence (localStorage only)
