# Danger Warnings Library — Spec

## 1. Goal

Provide a shared, admin-managed library of reusable danger warnings (title, description, severity) that editors can search and attach to manuals via a combobox. Library warnings are linked by reference so edits propagate to all manuals. Editors can also add custom one-off warnings directly on a manual.

## 2. Dependencies

- **Epic 1** — auth, RBAC, sidebar, User model.
- **Epic 2** — Manual model, manual editor page, warning block component, Tiptap setup.

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Severity levels | DANGER / WARNING / CAUTION (enum) | ISO 3864 / ANSI Z535 standard, three levels |
| Reference model | Many-to-many join table (ManualWarning) | Edits to library warnings propagate to all linked manuals |
| Custom warnings | Stored on the manual's `warnings` JSON | Not added to library, scoped to single manual |
| Picker UX | Combobox with server-side search | Fast typeahead, handles large libraries |
| Library page | Top-level `/warnings` route in sidebar | Dedicated admin page, discoverable |
| Warning display | Colored cards with severity icon + badge | Quick visual distinction inline in editor |

## 4. Implementation Tasks

### 4.1 Prisma Schema — DangerWarning & ManualWarning Models

1. Add to `packages/db/prisma/schema.prisma`:

```prisma
enum Severity {
  DANGER
  WARNING
  CAUTION
}

model DangerWarning {
  id          String          @id @default(cuid())
  title       String
  description String
  severity    Severity
  manuals     ManualWarning[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([title])
  @@index([severity])
}

model ManualWarning {
  id              String        @id @default(cuid())
  manualId        String
  manual          Manual        @relation(fields: [manualId], references: [id], onDelete: Cascade)
  dangerWarningId String
  dangerWarning   DangerWarning @relation(fields: [dangerWarningId], references: [id], onDelete: Cascade)
  order           Int           @default(0)
  createdAt       DateTime      @default(now())

  @@unique([manualId, dangerWarningId])
  @@index([manualId])
  @@index([dangerWarningId])
}
```

2. Add reverse relation to `Manual` model:

```prisma
model Manual {
  // ... existing fields
  libraryWarnings ManualWarning[]
}
```

3. Run `pnpm --filter db migrate:dev --name add-danger-warnings-library`.

### 4.2 Warning Service Layer

Create `apps/web/src/lib/services/warning-service.ts`:

1. `listWarnings(params)` — list all library warnings, optional search by title, filter by severity. Returns `DangerWarning[]`.
2. `getWarningById(id)` — fetch single warning. Throw 404 if not found.
3. `createWarning(data)` — create library warning. Admin only.
4. `updateWarning(id, data)` — update title, description, or severity. Admin only.
5. `deleteWarning(id)` — hard delete. Cascades removal from ManualWarning join table. Admin only.
6. `searchWarnings(query)` — search by title (case-insensitive `contains`). Used by combobox API.
7. `addWarningToManual(manualId, dangerWarningId, order)` — create ManualWarning row.
8. `removeWarningFromManual(manualId, dangerWarningId)` — delete ManualWarning row.
9. `getManualLibraryWarnings(manualId)` — list all library warnings linked to a manual, ordered by `order`.

### 4.3 API Routes — Warning Library

#### `src/app/api/warnings/route.ts`

```typescript
// GET /api/warnings
// Query: ?search=&severity=DANGER|WARNING|CAUTION
// Auth: any authenticated user (editors need read access for combobox)
// Response: { warnings: DangerWarning[] }

// POST /api/warnings
// Auth: admin only
// Body: { title: string, description: string, severity: Severity }
// Response 201: { warning: DangerWarning }
```

#### `src/app/api/warnings/[id]/route.ts`

```typescript
// GET /api/warnings/[id]
// Auth: any authenticated user
// Response: { warning: DangerWarning }

// PATCH /api/warnings/[id]
// Auth: admin only
// Body: { title?: string, description?: string, severity?: Severity }
// Response: { warning: DangerWarning }

// DELETE /api/warnings/[id]
// Auth: admin only
// Response 204
```

#### `src/app/api/warnings/search/route.ts`

```typescript
// GET /api/warnings/search?q=electric
// Auth: any authenticated user
// Response: { warnings: { id: string, title: string, severity: Severity }[] }
// Used by combobox in manual editor
```

### 4.4 API Routes — Manual Library Warnings

#### `src/app/api/manuals/[id]/warnings/route.ts`

```typescript
// GET /api/manuals/[id]/warnings
// Auth: any authenticated user
// Response: { warnings: (DangerWarning & { order: number })[] }

// POST /api/manuals/[id]/warnings
// Auth: admin or assigned editor
// Body: { dangerWarningId: string, order?: number }
// Response 201: { manualWarning: ManualWarning }

// DELETE /api/manuals/[id]/warnings
// Auth: admin or assigned editor
// Body: { dangerWarningId: string }
// Response 204
```

### 4.5 Warning Library Page

Create `apps/web/src/app/(dashboard)/warnings/page.tsx`:

1. Server component — fetch warnings via `listWarnings()`.
2. Require admin role. Non-admins redirected to `/`.

Create `apps/web/src/components/warnings/warning-library.tsx` (client component):

1. **Search bar** — text input with `placeholder="Search warnings..."` and debounced search by title.
2. **Severity filter** — filter chips: All / Danger / Warning / Caution. Each chip uses `data-testid="filter-{severity}"` (e.g., `data-testid="filter-danger"`).
3. **Warning cards/rows** — each shows: severity badge (colored: red=DANGER, orange=WARNING, yellow=CAUTION), title, description (truncated). Each card uses `data-testid="warning-card"` and `data-severity="{DANGER|WARNING|CAUTION}"`.
4. **Create button** — text "Create Warning", opens create/edit dialog.
5. **Row actions** — Edit button (opens dialog), Delete button (confirmation dialog).
6. **Empty state** — element with `data-testid="empty-state"` containing text "Create your first warning".

### 4.6 Warning Create/Edit Dialog

Create `apps/web/src/components/warnings/warning-dialog.tsx`:

1. shadcn/ui `Dialog` with form fields: title (text input, `name="title"`), description (text area, `name="description"`), severity (select, `name="severity"`: Danger / Warning / Caution).
2. Mode: create (POST) or edit (PATCH) based on presence of existing warning data.
3. Validation: title required, description required, severity required. Validation errors shown inline below each field.
4. On success: close dialog, refresh list, show toast with message "Warning created" or "Warning updated".

### 4.7 Warning Delete Confirmation

Create `apps/web/src/components/warnings/delete-warning-dialog.tsx`:

1. shadcn/ui `AlertDialog` with text: "This warning will be permanently removed from all manuals using it."
2. Confirm button with text "Delete". Cancel button with text "Cancel".
3. On confirm: call `DELETE /api/warnings/[id]`.
4. On success: refresh list, show toast with message "Warning deleted".

### 4.8 Manual Editor — Library Warning Picker

Update `apps/web/src/components/manuals/manual-editor.tsx`:

1. In the Danger Warnings section, add two sub-sections:
   - **Library warnings** — list of linked library warnings (from ManualWarning join table).
   - **Custom warnings** — list of one-off warnings (from manual's `warnings` JSON, unchanged from Epic 2).

Create `apps/web/src/components/manuals/warning-picker.tsx`:

1. shadcn/ui `Combobox` (Popover + Command) component with `data-testid="warning-picker"`.
2. Fetches from `GET /api/warnings/search?q=` on input change (debounced 300 ms).
3. Dropdown shows matching library warnings with severity badge.
4. On select: calls `POST /api/manuals/[id]/warnings` to link warning. Shows toast "Warning added to manual".
5. Already-linked warnings are disabled/hidden in the dropdown.

### 4.9 Library Warning Card (Inline in Editor)

Create `apps/web/src/components/manuals/library-warning-card.tsx`:

1. Displays linked library warning as a colored card: severity icon (triangle for Danger, circle for Warning, diamond for Caution) + severity badge + title + description. Uses `data-testid="library-warning-card"` and `data-severity="{DANGER|WARNING|CAUTION}"`.
2. Color coding: red background for DANGER, orange for WARNING, yellow for CAUTION.
3. "Remove" button (`data-testid="remove-warning"`) to unlink from manual (calls `DELETE /api/manuals/[id]/warnings`). Shows toast "Warning removed from manual".
4. Read-only — content comes from the library, not editable inline. Shows "(Library)" label to distinguish from custom warnings.
5. Reorder handle for drag-to-reorder.

### 4.10 Sidebar Navigation Update

Update `apps/web/src/components/sidebar.tsx`:

1. Add "Warnings" link pointing to `/warnings` — visible only to admins.
2. Position after "Manuals" link.

### 4.11 Severity Badge Component

Create `apps/web/src/components/ui/severity-badge.tsx`:

1. Reusable badge component accepting `severity: Severity` prop.
2. Color mapping: `DANGER` → red, `WARNING` → orange, `CAUTION` → yellow.
3. Displays severity icon + text label. Uses `data-testid="severity-badge"` and `data-severity="{DANGER|WARNING|CAUTION}"`.
4. Used in both the library page and the manual editor.

## 5. API Contracts

### Types

```typescript
type Severity = "DANGER" | "WARNING" | "CAUTION"

type DangerWarning = {
  id: string
  title: string
  description: string
  severity: Severity
  createdAt: string
  updatedAt: string
}

type ManualWarning = {
  id: string
  manualId: string
  dangerWarningId: string
  order: number
  dangerWarning: DangerWarning
}

type CreateWarningRequest = {
  title: string
  description: string
  severity: Severity
}

type UpdateWarningRequest = {
  title?: string
  description?: string
  severity?: Severity
}

type AddManualWarningRequest = {
  dangerWarningId: string
  order?: number
}

type RemoveManualWarningRequest = {
  dangerWarningId: string
}
```

### Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/warnings` | Authenticated | List library warnings |
| POST | `/api/warnings` | Admin | Create library warning |
| GET | `/api/warnings/[id]` | Authenticated | Get single warning |
| PATCH | `/api/warnings/[id]` | Admin | Update warning |
| DELETE | `/api/warnings/[id]` | Admin | Delete warning (cascades) |
| GET | `/api/warnings/search` | Authenticated | Search warnings (combobox) |
| GET | `/api/manuals/[id]/warnings` | Authenticated | List manual's library warnings |
| POST | `/api/manuals/[id]/warnings` | Admin or assigned editor | Link library warning to manual |
| DELETE | `/api/manuals/[id]/warnings` | Admin or assigned editor | Unlink library warning from manual |

## 6. Data Model

```prisma
enum Severity {
  DANGER
  WARNING
  CAUTION
}

model DangerWarning {
  id          String          @id @default(cuid())
  title       String
  description String
  severity    Severity
  manuals     ManualWarning[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([title])
  @@index([severity])
}

model ManualWarning {
  id              String        @id @default(cuid())
  manualId        String
  manual          Manual        @relation(fields: [manualId], references: [id], onDelete: Cascade)
  dangerWarningId String
  dangerWarning   DangerWarning @relation(fields: [dangerWarningId], references: [id], onDelete: Cascade)
  order           Int           @default(0)
  createdAt       DateTime      @default(now())

  @@unique([manualId, dangerWarningId])
  @@index([manualId])
  @@index([dangerWarningId])
}
```

## 7. Acceptance Criteria

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Given an admin is logged in, when they navigate to `/warnings`, click "Create Warning", fill in title "Electric shock hazard", description "Risk of electrocution", select severity "Danger", and submit, then a warning card with title "Electric shock hazard" and `data-severity="DANGER"` appears in the list | e2e | `warning-library.spec.ts` |
| AC-2 | Given the warning library contains a warning titled "Electric shock hazard", when an admin clicks the Edit button on that warning, changes the title to "High voltage hazard", and saves, then the list displays a card with title "High voltage hazard" | e2e | `warning-library.spec.ts` |
| AC-3 | Given the warning library contains a warning titled "High voltage hazard", when an admin clicks Delete on that warning, then an AlertDialog appears containing text "permanently removed from all manuals"; when the admin clicks "Delete" to confirm, then the warning card with that title is no longer present in the list | e2e | `warning-library.spec.ts` |
| AC-4 | Given a library warning is linked to 2 manuals, when an admin updates the warning title, then `GET /api/manuals/[id]/warnings` for both manuals returns the updated title | integration | `warning-service.test.ts` |
| AC-5 | Given a library warning is linked to a manual, when an admin deletes the warning, then `GET /api/manuals/[id]/warnings` returns an empty array for that manual | integration | `warning-service.test.ts` |
| AC-6 | Given an editor is logged in and viewing an assigned manual at `/manuals/[id]`, when they click the warning picker (`data-testid="warning-picker"`), type "Electric" into the search input, and select "Electric shock hazard" from the dropdown, then a library warning card (`data-testid="library-warning-card"`) with title "Electric shock hazard" appears in the manual editor | e2e | `manual-warnings.spec.ts` |
| AC-7 | Given a library warning "Electric shock hazard" is linked to a manual, when the editor clicks the Remove button (`data-testid="remove-warning"`) on that card, then the card with title "Electric shock hazard" is no longer visible in the manual editor | e2e | `manual-warnings.spec.ts` |
| AC-8 | Given an editor is viewing an assigned manual, when they click "Add custom warning", fill in title "Fragile parts", description "Handle with care", select severity "Caution", and submit, then a custom warning card with title "Fragile parts" appears in the custom warnings section without a "(Library)" label | e2e | `manual-warnings.spec.ts` |
| AC-9 | Given a manual has a linked library warning with severity DANGER, when the editor views the manual, then the library warning card (`data-testid="library-warning-card"`) has attribute `data-severity="DANGER"` and contains a severity badge (`data-testid="severity-badge"`) with text "Danger" | e2e | `manual-warnings.spec.ts` |
| AC-10 | Given an editor is logged in, when they navigate to `/warnings`, then the URL changes to `/` (redirect) and the `/warnings` page content is not visible | e2e | `warning-library.spec.ts` |
| AC-11 | Given an editor is logged in, when they view the sidebar navigation, then no link with text "Warnings" is present in the sidebar | e2e | `warning-library.spec.ts` |
| AC-12 | Given the warning library contains warnings titled "Electric shock hazard" and "Chemical burn risk", when an admin types "Electric" into the search input (`placeholder="Search warnings..."`), then only the card with title "Electric shock hazard" is visible and the card with title "Chemical burn risk" is not visible | e2e | `warning-library.spec.ts` |
| AC-13 | Given the warning library contains warnings of mixed severities, when an admin clicks the "Danger" filter chip (`data-testid="filter-danger"`), then only warning cards with `data-severity="DANGER"` are visible | e2e | `warning-library.spec.ts` |
| AC-14 | Given an admin is logged in, when the viewport is set to 375x667 (mobile) and they navigate to `/warnings`, then all warning cards (`data-testid="warning-card"`) are visible within the viewport width (no element exceeds `document.documentElement.clientWidth`), and the "Create Warning" button is visible | e2e | `warning-library.spec.ts` |
| AC-15 | Given the warning library has no entries, when an admin navigates to `/warnings`, then an element with `data-testid="empty-state"` is visible containing the text "Create your first warning" | e2e | `warning-library.spec.ts` |
| AC-16 | Given an admin creates a warning, then a toast notification with text "Warning created" is visible; given an admin edits a warning, then a toast with text "Warning updated" is visible; given an admin deletes a warning, then a toast with text "Warning deleted" is visible; given an editor links a warning to a manual, then a toast with text "Warning added to manual" is visible; given an editor removes a warning from a manual, then a toast with text "Warning removed from manual" is visible | e2e | `warning-library.spec.ts`, `manual-warnings.spec.ts` |
| AC-17 | Given a library warning "Electric shock hazard" is already linked to a manual, when the editor opens the warning picker combobox and types "Electric", then "Electric shock hazard" does not appear as a selectable option in the dropdown | e2e | `manual-warnings.spec.ts` |
| AC-18 | Given a manual has both a linked library warning and a custom warning, when the editor views the manual, then the library warning card contains the text "(Library)" and the custom warning card does not contain the text "(Library)" | e2e | `manual-warnings.spec.ts` |
| AC-19 | Given a library warning with title "Electric shock", when `searchWarnings("ELECTRIC")` is called, then the result array contains that warning | unit | `warning-service.test.ts` |
| AC-20 | Given `createWarning` is called with an empty title, then it throws a validation error | unit | `warning-service.test.ts` |
| AC-21 | Given a manual has a custom warning titled "Fragile parts" with severity "Caution" and a linked library warning titled "Electric shock hazard", when the manual data is fetched via `GET /api/manuals/[id]`, then the response JSON contains both the custom warning in the `warnings` array and the library warning in the `libraryWarnings` array with their respective titles and severities | integration | `manual-service.test.ts` |

## 8. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/warning-library.spec.ts`
**Setup:** Seed database with admin, editor, 5 library warnings (mix of severities including at least 2 DANGER, 1 WARNING, 1 CAUTION, plus "Electric shock hazard" DANGER and "Chemical burn risk" WARNING).

- Given admin logged in, when creating a new warning with all fields, then it appears in the list (AC-1)
- Given a warning exists, when admin edits its title, then the updated title is shown (AC-2)
- Given a warning exists, when admin deletes it with confirmation, then it is removed from the list (AC-3)
- Given editor logged in, when navigating to `/warnings`, then redirected to `/` (AC-10)
- Given editor logged in, when viewing sidebar, then "Warnings" link is absent (AC-11)
- Given warnings exist, when admin types a search term, then only matching warnings appear (AC-12)
- Given warnings of mixed severity exist, when admin clicks "Danger" filter, then only DANGER warnings are shown (AC-13)
- Given admin on mobile viewport (375x667), when viewing `/warnings`, then all cards and "Create Warning" button are visible within viewport (AC-14)
- Given no warnings exist, when admin navigates to `/warnings`, then empty state with "Create your first warning" text is shown (AC-15)
- Given admin performs create/edit/delete actions, then corresponding toast messages appear (AC-16)

#### `tests/e2e/manual-warnings.spec.ts`
**Setup:** Seed database with admin, editor, 1 manual assigned to editor, 3 library warnings (including "Electric shock hazard" DANGER).

- Given editor on assigned manual page, when searching and selecting a library warning via combobox, then library warning card appears (AC-6)
- Given a library warning is linked, when editor clicks Remove, then the card is removed (AC-7)
- Given editor on manual page, when adding a custom warning with title/description/severity, then custom warning card appears without "(Library)" label (AC-8)
- Given a DANGER library warning is linked, when editor views the card, then it has `data-severity="DANGER"` and severity badge text "Danger" (AC-9)
- Given editor links/removes a warning, then corresponding toast messages appear (AC-16)
- Given a warning is already linked, when editor opens combobox and searches, then that warning is not selectable (AC-17)
- Given both library and custom warnings exist on a manual, then library cards show "(Library)" label and custom cards do not (AC-18)

### Integration Tests (Vitest)

#### `tests/integration/warning-service.test.ts`
**Setup:** Test database with seeded warnings and manuals.

- Given a warning linked to 2 manuals, when updated, then both manuals reflect the new data (AC-4)
- Given a warning linked to a manual, when deleted, then the manual's library warnings list is empty (AC-5)
- Given a manual with both library and custom warnings, when fetched via API, then both types are present in the response (AC-21)

### Unit Tests (Vitest)

#### `tests/unit/warning-service.test.ts`

- Given a warning titled "Electric shock", when searching "ELECTRIC", then the result includes it (AC-19)
- Given empty title input, when calling `createWarning`, then a validation error is thrown (AC-20)

## 9. UX Verification

**Verification command:** `/playwright-test docs/epic-3_spec.md`

**Pages/routes to verify:**
- `/warnings` — warning library management page (admin only)
- `/manuals/[id]` — manual editor with library warning picker

**Key UX checkpoints:**
- Warning cards use `data-severity` attribute and distinct severity colors (red=DANGER, orange=WARNING, yellow=CAUTION)
- Severity icons are recognizable (triangle, circle, diamond)
- Create/edit dialog has clear field labels and validation messages shown inline
- Delete confirmation dialog contains text "permanently removed from all manuals"
- Combobox opens on focus, filters on type, closes on select
- Combobox dropdown shows severity badge next to each warning name
- Library warning cards in editor are visually distinct from custom warnings
- "(Library)" label text is present on linked warning cards
- Empty state element (`data-testid="empty-state"`) contains "Create your first warning"
- All interactive elements have visible focus states for keyboard navigation
- Mobile (375x667): warning cards stack vertically, all content within viewport width

**Expected E2E test coverage:** AC-1 through AC-3, AC-6 through AC-18 (all e2e-type criteria).

## 10. TDD Approach

Write tests before implementing each task. Follow this order:

1. **Unit tests first** (AC-19, AC-20): Write `warning-service.test.ts` unit tests for `searchWarnings` and `createWarning` validation before implementing the service layer (Task 4.2).
2. **Integration tests second** (AC-4, AC-5): Write `warning-service.test.ts` integration tests for reference propagation and cascade deletion before wiring up the API routes (Tasks 4.3, 4.4).
3. **E2E tests last** (AC-1 through AC-3, AC-6 through AC-18): Write Playwright test stubs for `warning-library.spec.ts` and `manual-warnings.spec.ts` with the exact assertions from the AC table before building the UI components (Tasks 4.5 through 4.11). Each test should initially fail (red), then pass after the corresponding component is implemented (green).

For each implementation task:
- Write the failing test that asserts the expected behavior from the AC table.
- Implement the minimum code to make the test pass.
- Refactor while keeping tests green.

## 11. Out of Scope

- Bulk import/export of library warnings
- Warning categories or tags beyond severity
- Warning usage analytics (which manuals use which warning)
- Rich text in warning descriptions (plain text only)
- Warning versioning or change history
- Archiving warnings (only create/edit/delete)
- Reordering library warnings on the library page (order only matters within a manual)
- Custom warning promotion to library (manual process — admin re-creates it)
