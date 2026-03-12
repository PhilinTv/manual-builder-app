# Manual CRUD & Assignment — Spec

## 1. Goal

Enable admins to create, edit, soft-delete, and assign manuals to editors. Editors can edit all sections of assigned manuals using a Tiptap WYSIWYG editor with auto-save drafts and explicit publish. All users can browse and search the paginated manual list.

## 2. Dependencies

- **Epic 1** — auth, RBAC, app shell, User model, Prisma setup.

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rich text editor | Tiptap (ProseMirror) | Block-based WYSIWYG, stores JSON, extensible, React bindings |
| Save strategy | Auto-save draft (debounced 1 s) + explicit publish | Prevents data loss, clear publish boundary |
| Content storage | Tiptap JSON in `jsonb` columns | Preserves structure, enables future transforms (PDF, etc.) |
| Pagination | Offset-based, 20 items/page | Simple, adequate for expected volume |
| Soft delete | `deletedAt` timestamp, 30-day retention | Recoverable, no schema changes on delete |
| Drag-and-drop reorder | `@tiptap/extension-ordered-list` + manual array index | Native Tiptap ordering for instructions/warnings |
| API pattern | Server Actions for mutations, API routes for list/search | Consistent with Epic 1 pattern |

## 4. TDD Approach

All work in this epic follows a test-driven development workflow:

1. **Write a failing E2E test first** for the acceptance criterion being implemented (from Section 7 / Section 8).
2. **Implement the minimum code** to make the test pass — API route, service method, or UI component.
3. **Refactor** while keeping all tests green.
4. **Integration/unit tests** for service-layer logic should also be written before the implementation of that service method.

Playwright tests live in `tests/e2e/` and use helpers from `tests/e2e/helpers/` (auth, seed). Vitest integration and unit tests live in `tests/integration/` and `tests/unit/` respectively.

## 5. Implementation Tasks

### 5.1 Prisma Schema — Manual & Assignment Models

1. Add to `packages/db/prisma/schema.prisma`:

```prisma
enum ManualStatus {
  DRAFT
  PUBLISHED
}

model Manual {
  id              String       @id @default(cuid())
  productName     String
  overview        Json?        // Tiptap JSON
  instructions    Json?        // Array of { title: string, body: TiptapJSON }
  warnings        Json?        // Array of { title: string, description: string, severity: string }
  status          ManualStatus @default(DRAFT)
  createdById     String
  createdBy       User         @relation("CreatedManuals", fields: [createdById], references: [id])
  assignments     ManualAssignment[]
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  @@index([productName])
  @@index([status])
  @@index([deletedAt])
  @@index([createdById])
}

model ManualAssignment {
  id        String   @id @default(cuid())
  manualId  String
  manual    Manual   @relation(fields: [manualId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([manualId, userId])
  @@index([userId])
  @@index([manualId])
}
```

2. Add reverse relations to the `User` model in `schema.prisma`:

```prisma
model User {
  // ... existing fields
  createdManuals  Manual[]           @relation("CreatedManuals")
  assignments     ManualAssignment[]
}
```

3. Run `pnpm --filter db migrate:dev --name add-manual-models`.

### 5.2 Manual Service Layer

Create `apps/web/src/lib/services/manual-service.ts`:

1. `listManuals(params)` — paginated list with search, status/assignee filters. Excludes soft-deleted (`deletedAt IS NULL`). Returns `{ manuals, total, page, pageSize }`.
2. `getManualById(id)` — fetch single manual with assignments. Throw 404 if not found or soft-deleted.
3. `createManual(data, userId)` — create manual with `status: DRAFT`, set `createdById`.
4. `updateManual(id, data)` — update manual fields. Set `updatedAt`.
5. `publishManual(id)` — set `status: PUBLISHED`, update `updatedAt`.
6. `softDeleteManual(id)` — set `deletedAt = now()`.
7. `assignUser(manualId, userId)` — create `ManualAssignment` row.
8. `unassignUser(manualId, userId)` — delete `ManualAssignment` row.
9. `getAssignees(manualId)` — list assigned users for a manual.
10. `canUserEdit(manualId, userId, role)` — returns `true` if user is admin or assigned editor.

### 5.3 API Routes

#### `src/app/api/manuals/route.ts`

```typescript
// GET /api/manuals
// Query: ?page=1&pageSize=20&search=&status=DRAFT|PUBLISHED&assigneeId=
// Auth: any authenticated user
// Response: { manuals: ManualListItem[], total: number, page: number, pageSize: number }

// POST /api/manuals
// Auth: admin only
// Body: { productName: string }
// Response 201: { manual: { id, productName, status } }
```

#### `src/app/api/manuals/[id]/route.ts`

```typescript
// GET /api/manuals/[id]
// Auth: any authenticated user
// Response: { manual: ManualDetail, canEdit: boolean }

// PATCH /api/manuals/[id]
// Auth: admin or assigned editor
// Body: { productName?, overview?, instructions?, warnings? }
// Response: { manual: ManualDetail }

// DELETE /api/manuals/[id]
// Auth: admin only
// Response 204
```

#### `src/app/api/manuals/[id]/publish/route.ts`

```typescript
// POST /api/manuals/[id]/publish
// Auth: admin or assigned editor
// Response: { manual: { id, status: "PUBLISHED" } }
```

#### `src/app/api/manuals/[id]/assignments/route.ts`

```typescript
// GET /api/manuals/[id]/assignments
// Auth: admin only
// Response: { assignees: { id, name, email }[] }

// POST /api/manuals/[id]/assignments
// Auth: admin only
// Body: { userId: string }
// Response 201: { assignment: { id, userId, manualId } }

// DELETE /api/manuals/[id]/assignments
// Auth: admin only
// Body: { userId: string }
// Response 204
```

### 5.4 Install Tiptap

```bash
cd apps/web
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-heading @tiptap/extension-blockquote @tiptap/extension-bullet-list @tiptap/extension-ordered-list @tiptap/extension-placeholder
```

### 5.5 Tiptap Editor Component

Create `apps/web/src/components/editor/tiptap-editor.tsx`:

1. Accept props: `content: JSONContent | null`, `onChange: (json: JSONContent) => void`, `editable: boolean`, `placeholder?: string`.
2. Configure extensions: StarterKit, Underline, Link, Heading (levels 2-4), Blockquote, BulletList, OrderedList, Placeholder.
3. Emit `onChange` on every `onUpdate`.

Create `apps/web/src/components/editor/tiptap-toolbar.tsx`:

1. Toolbar buttons: Bold, Italic, Underline, H2, H3, H4, Bullet List, Ordered List, Link, Blockquote.
2. Active state highlighting for each button.
3. Use shadcn/ui `Toggle` and `ToggleGroup` components.

### 5.6 Manual List Page

Create `apps/web/src/app/(dashboard)/manuals/page.tsx`:

1. Server component — fetch initial page from `listManuals()`.
2. Render `ManualListClient` client component.

Create `apps/web/src/components/manuals/manual-list.tsx` (client component):

1. **Search bar** — text input with debounced (300 ms) search by product name.
2. **Filter chips** — Status (All / Draft / Published), Assignee (dropdown of users). Use shadcn/ui `Badge` as chip.
3. **Manual rows** — compact rows displaying: product name, status badge (Draft=yellow, Published=green), assignee avatar(s), last updated date.
4. **Pagination controls** — Previous / Next buttons, page indicator. 20 items/page.
5. **"New Manual" button** — visible only to admins. Calls `POST /api/manuals` then navigates to `/manuals/[id]`.
6. **Empty state** — illustration + "Create your first manual" CTA (admin sees button, editor sees text only).

### 5.7 Manual Detail / Editor Page

Create `apps/web/src/app/(dashboard)/manuals/[id]/page.tsx`:

1. Server component — fetch manual via `getManualById()`, check `canUserEdit()`.
2. Pass data + `canEdit` flag to `ManualEditorClient`.

Create `apps/web/src/components/manuals/manual-editor.tsx` (client component):

1. **Header bar**: product name (editable text input), status badge (Draft / Published), "Publish" button (shown when status is DRAFT or content changed since last publish), "Delete" button (admin only, opens confirmation dialog).
2. **Auto-save**: debounce all field changes by 1 second, call `PATCH /api/manuals/[id]`. Show subtle "Saving..." / "Saved" indicator.
3. **Sections** (top to bottom):
   - **Product Name** — text input.
   - **Product Overview** — Tiptap editor instance.
   - **Feature Instructions** — ordered list of structured blocks. Each block: title (text input) + body (Tiptap editor). Add/remove/reorder buttons.
   - **Danger Warnings** — list of structured blocks. Each block: title (text input) + description (text area) + severity select (Danger/Warning/Caution). Add/remove/reorder buttons.
4. **Table of Contents** — auto-generated from section headings, rendered read-only in a sidebar or sticky panel.
5. **Read-only mode**: when `canEdit` is false, disable all inputs and editors. Hide Publish/Delete buttons.

### 5.8 Structured Block Components

Create `apps/web/src/components/manuals/instruction-block.tsx`:

1. Props: `index`, `title`, `body` (Tiptap JSON), `onChange`, `onRemove`, `onMoveUp`, `onMoveDown`, `editable`.
2. Numbered label ("Step {index + 1}").
3. Title text input + Tiptap editor for body.
4. Up/down/delete icon buttons.

Create `apps/web/src/components/manuals/warning-block.tsx`:

1. Props: `index`, `title`, `description`, `severity`, `onChange`, `onRemove`, `editable`.
2. Severity select (Danger / Warning / Caution) with colored indicator.
3. Title text input + description text area.
4. Delete icon button.

### 5.9 Manage Access Section (Admin Only)

Add to manual editor page, below the main content sections:

Create `apps/web/src/components/manuals/manage-access.tsx`:

1. Visible only when user is admin.
2. List of currently assigned editors with "Remove" button.
3. User selector (combobox) to search and add editors. Fetches from `GET /api/users?status=ACTIVE&role=EDITOR`.
4. Toast notification on assign/unassign success.

### 5.10 Delete Confirmation Dialog

Create `apps/web/src/components/manuals/delete-manual-dialog.tsx`:

1. shadcn/ui `AlertDialog` with warning text: "This manual will be deleted. It can be recovered within 30 days."
2. Confirm button calls `DELETE /api/manuals/[id]`.
3. On success, toast notification + redirect to `/manuals`.

### 5.11 Sidebar Navigation Update

Update `apps/web/src/components/sidebar.tsx`:

1. Add "Manuals" link pointing to `/manuals` — visible to all roles.
2. Position after "Dashboard" link.

### 5.12 Toast Setup

Ensure shadcn/ui `Toaster` is mounted in root layout (should exist from Epic 1). Use `toast()` from `sonner` for all action feedback.

## 6. API Contracts

### Types

```typescript
type ManualStatus = "DRAFT" | "PUBLISHED"

type ManualListItem = {
  id: string
  productName: string
  status: ManualStatus
  assignees: { id: string; name: string }[]
  updatedAt: string
  createdAt: string
}

type ManualDetail = {
  id: string
  productName: string
  overview: JSONContent | null
  instructions: InstructionBlock[]
  warnings: WarningBlock[]
  status: ManualStatus
  createdBy: { id: string; name: string }
  assignees: { id: string; name: string; email: string }[]
  updatedAt: string
  createdAt: string
  deletedAt: string | null
}

type InstructionBlock = {
  id: string
  title: string
  body: JSONContent
  order: number
}

type WarningBlock = {
  id: string
  title: string
  description: string
  severity: "DANGER" | "WARNING" | "CAUTION"
  order: number
}

type ManualListParams = {
  page?: number        // default 1
  pageSize?: number    // default 20
  search?: string
  status?: ManualStatus
  assigneeId?: string
}

type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
```

### Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/manuals` | Authenticated | List manuals (paginated, filterable) |
| POST | `/api/manuals` | Admin | Create manual |
| GET | `/api/manuals/[id]` | Authenticated | Get manual detail |
| PATCH | `/api/manuals/[id]` | Admin or assigned editor | Update manual fields |
| DELETE | `/api/manuals/[id]` | Admin | Soft delete manual |
| POST | `/api/manuals/[id]/publish` | Admin or assigned editor | Publish manual |
| GET | `/api/manuals/[id]/assignments` | Admin | List assignees |
| POST | `/api/manuals/[id]/assignments` | Admin | Assign user |
| DELETE | `/api/manuals/[id]/assignments` | Admin | Unassign user |

## 7. Data Model

```prisma
enum ManualStatus {
  DRAFT
  PUBLISHED
}

model Manual {
  id              String             @id @default(cuid())
  productName     String
  overview        Json?
  instructions    Json?
  warnings        Json?
  status          ManualStatus       @default(DRAFT)
  createdById     String
  createdBy       User               @relation("CreatedManuals", fields: [createdById], references: [id])
  assignments     ManualAssignment[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  deletedAt       DateTime?

  @@index([productName])
  @@index([status])
  @@index([deletedAt])
  @@index([createdById])
}

model ManualAssignment {
  id        String   @id @default(cuid())
  manualId  String
  manual    Manual   @relation(fields: [manualId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([manualId, userId])
  @@index([userId])
  @@index([manualId])
}
```

## 8. Acceptance Criteria

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Given an admin is logged in and on `/manuals`, when they click the "New Manual" button, then a new manual is created and the browser navigates to `/manuals/[id]` where the editor page loads with empty fields and status badge showing "Draft" | e2e | `manual-crud.spec.ts` |
| AC-2 | Given an editor is logged in, when they navigate to `/manuals`, then no element with text "New Manual" is visible on the page | e2e | `manual-crud.spec.ts` |
| AC-3 | Given manuals exist in the database, when any authenticated user navigates to `/manuals`, then each manual row displays the product name, a status badge (text "Draft" or "Published"), assignee name(s), and a last-updated date | e2e | `manual-list.spec.ts` |
| AC-4 | Given 3 manuals exist ("Alpha Widget", "Beta Gadget", "Gamma Widget"), when a user types "Widget" into the search input on `/manuals`, then only "Alpha Widget" and "Gamma Widget" rows are visible and "Beta Gadget" is not visible | e2e | `manual-list.spec.ts` |
| AC-5 | Given manuals exist with mixed Draft and Published statuses, when a user clicks the "Draft" filter chip on `/manuals`, then only manuals with the "Draft" status badge are shown; clicking "Published" chip shows only Published manuals | e2e | `manual-list.spec.ts` |
| AC-6 | Given manuals are assigned to different editors, when a user selects a specific editor in the Assignee filter dropdown, then only manuals assigned to that editor are displayed | e2e | `manual-list.spec.ts` |
| AC-7 | Given 25 manuals exist, when a user navigates to `/manuals`, then exactly 20 manual rows are visible; when the user clicks the "Next" button, then 5 manual rows are visible; the "Previous" button on page 2 navigates back to 20 rows | e2e | `manual-list.spec.ts` |
| AC-8 | Given a user is on `/manuals`, when the viewport is set to 375px width, then the manual list renders without horizontal scrollbar and all rows remain readable | e2e | `manual-list.spec.ts` |
| AC-9 | Given an editor is assigned to a manual, when they open `/manuals/[id]` and edit the product name input, type into the overview Tiptap editor, then reload the page, then the edited product name and overview text are still present | e2e | `manual-editor.spec.ts` |
| AC-10 | Given a user is editing a manual, when they click "Add Instruction", fill in the title input and body editor for two instruction blocks, then click the move-down button on the first block, then the first block moves to position 2 and the second block moves to position 1; clicking the remove button on a block removes it from the list | e2e | `manual-editor.spec.ts` |
| AC-11 | Given a user is editing a manual, when they click "Add Warning", then a warning block appears with a title input, description textarea, and a severity select with options "Danger", "Warning", "Caution"; selecting "Danger" displays a red severity indicator | e2e | `manual-editor.spec.ts` |
| AC-12 | Given a user has text selected in the Tiptap editor, when they click the Bold toolbar button, then the selected text is wrapped in a `<strong>` tag; the same pattern applies for Italic (`<em>`), Underline (`<u>`), H2 (`<h2>`), H3 (`<h3>`), H4 (`<h4>`), Bullet List (`<ul>`), Ordered List (`<ol>`), and Blockquote (`<blockquote>`) | e2e | `manual-editor.spec.ts` |
| AC-13 | Given a user edits a field in the manual editor, when 1 second elapses after the last keystroke, then a "Saving..." text indicator appears; after the PATCH request completes, the indicator changes to "Saved" | e2e | `manual-editor.spec.ts` |
| AC-14 | Given a manual has status "Draft", when the user clicks the "Publish" button, then the status badge text changes from "Draft" to "Published" and a toast notification with text containing "published" appears | e2e | `manual-editor.spec.ts` |
| AC-15 | Given an admin is viewing a manual at `/manuals/[id]`, when they click the "Delete" button, then a confirmation dialog appears with text "This manual will be deleted"; when they confirm, then a toast notification appears, the browser navigates to `/manuals`, and the deleted manual no longer appears in the list. Given an editor is viewing the same manual, the "Delete" button is not visible | e2e | `manual-crud.spec.ts` |
| AC-16 | Given an admin is viewing a manual at `/manuals/[id]`, when they scroll to the "Manage Access" section and select an editor from the user combobox and confirm, then the editor's name appears in the assignee list and a toast notification with text containing "assigned" appears | e2e | `manual-assignment.spec.ts` |
| AC-17 | Given an admin is viewing a manual with an assigned editor, when they click the "Remove" button next to that editor's name in the Manage Access section, then the editor is removed from the assignee list and a toast notification with text containing "unassigned" appears | e2e | `manual-assignment.spec.ts` |
| AC-18 | Given an editor is logged in and not assigned to a manual, when they navigate to `/manuals/[id]` for that manual, then all input fields and Tiptap editors have the `disabled` or `contenteditable="false"` attribute, and the "Publish" and "Delete" buttons are not visible | e2e | `manual-assignment.spec.ts` |
| AC-19 | Given a manual has sections with headings (Product Overview, Feature Instructions, Danger Warnings), when the editor page loads, then a read-only Table of Contents element is visible containing text matching the section heading names | e2e | `manual-editor.spec.ts` |
| AC-20 | Given a user performs a publish, delete, assign, or unassign action, when the action completes, then a toast notification element (role="status" or `[data-sonner-toast]`) appears with a descriptive message and auto-dismisses | e2e | `manual-editor.spec.ts`, `manual-crud.spec.ts`, `manual-assignment.spec.ts` |
| AC-21 | Given no manuals exist in the database, when an admin navigates to `/manuals`, then an empty state is visible containing the text "Create your first manual" and a "New Manual" button; when an editor navigates to `/manuals`, the text is visible but no "New Manual" button is shown | e2e | `manual-list.spec.ts` |
| AC-22 | Given manuals exist with various assignments, when an editor navigates to `/manuals`, then all manuals (both assigned and unassigned) are visible in the list | e2e | `manual-list.spec.ts` |
| AC-23 | Given seeded manuals in the database, when `listManuals` is called with `status: "DRAFT"`, then only drafts are returned; when called with `search: "Widget"`, then only manuals whose product name contains "Widget" are returned; when called with `assigneeId`, then only manuals assigned to that user are returned | integration | `manual-service.test.ts` |
| AC-24 | Given a manual exists, when `softDeleteManual(id)` is called, then the manual's `deletedAt` field is set to a non-null timestamp; when `listManuals` is subsequently called, the soft-deleted manual is not included in results | integration | `manual-service.test.ts` |
| AC-25 | Given a manual and users with different roles and assignments, when `canUserEdit` is called with an admin user, then it returns `true` regardless of assignment; when called with an assigned editor, it returns `true`; when called with an unassigned editor, it returns `false` | unit | `manual-service.test.ts` |

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/manual-list.spec.ts`
**Setup:** Seed database with admin, 2 editors, 25 manuals (mix of DRAFT/PUBLISHED, various assignees, product names including "Alpha Widget", "Beta Gadget", "Gamma Widget").

- Given manuals are seeded, when user navigates to `/manuals`, then rows show product name, status badge, assignees, and updated date (AC-3)
- Given manuals are seeded, when user types "Widget" in search input, then only matching manuals are listed (AC-4)
- Given manuals have mixed statuses, when user clicks "Draft" filter chip, then only Draft manuals are shown (AC-5)
- Given manuals have different assignees, when user selects an assignee filter, then only that user's manuals appear (AC-6)
- Given 25 manuals exist, when user loads page 1, then 20 rows render; clicking "Next" shows 5 rows (AC-7)
- Given user is on `/manuals` with viewport 375px, then no horizontal scrollbar appears (AC-8)
- Given editor is logged in, when they navigate to `/manuals`, then all 25 manuals are visible across pages (AC-22)
- Given no manuals exist, when admin navigates to `/manuals`, then "Create your first manual" text and "New Manual" button are visible; when editor navigates, button is not visible (AC-21)

#### `tests/e2e/manual-crud.spec.ts`
**Setup:** Seed database with admin and editor, plus 1 existing manual.

- Given admin is on `/manuals`, when they click "New Manual", then URL changes to `/manuals/[id]` and empty editor loads with "Draft" badge (AC-1)
- Given editor is on `/manuals`, then no "New Manual" button is in the DOM (AC-2)
- Given admin is on `/manuals/[id]`, when they click "Delete" then confirm dialog, then manual is removed from `/manuals` list and toast appears (AC-15)
- Given editor is on `/manuals/[id]`, then no "Delete" button is visible (AC-15)
- Given actions complete, then toast notifications appear (AC-20)

#### `tests/e2e/manual-editor.spec.ts`
**Setup:** Seed database with admin, editor, 1 manual assigned to editor. Login as editor.

- Given editor opens assigned manual, when they edit product name and overview then reload, then changes persist (AC-9)
- Given editor is in manual editor, when they add two instruction blocks, fill them, and reorder, then order updates; removing a block removes it (AC-10)
- Given editor clicks "Add Warning", then block with title, description, severity select (Danger/Warning/Caution) appears; selecting Danger shows red indicator (AC-11)
- Given text is selected in Tiptap, when toolbar buttons are clicked, then corresponding HTML tags are applied (AC-12)
- Given editor types in a field, when 1s elapses, then "Saving..." text appears, then "Saved" text appears after request completes (AC-13)
- Given manual is Draft, when editor clicks "Publish", then badge changes to "Published" and toast appears (AC-14)
- Given manual has sections, then TOC element is visible with section heading text (AC-19)
- Given actions complete, then toast notifications appear (AC-20)

#### `tests/e2e/manual-assignment.spec.ts`
**Setup:** Seed database with admin, 2 editors, 1 manual. Login as admin.

- Given admin is on manual page, when they add editor via Manage Access combobox, then editor name appears in assignee list and toast with "assigned" appears (AC-16)
- Given editor is assigned, when admin clicks "Remove" next to their name, then editor is removed from list and toast with "unassigned" appears (AC-17)
- Given editor is not assigned to a manual, when they open that manual, then all fields are disabled/non-editable and Publish/Delete buttons are hidden (AC-18)
- Given actions complete, then toast notifications appear (AC-20)

### Integration Tests (Vitest)

#### `tests/integration/manual-service.test.ts`
**Setup:** Test database with seeded manuals and users.

- Given manuals with mixed statuses, when `listManuals({ status: "DRAFT" })`, then only drafts returned (AC-23)
- Given manuals with varied product names, when `listManuals({ search: "Widget" })`, then only matching manuals returned (AC-23)
- Given manuals with different assignments, when `listManuals({ assigneeId: editorId })`, then only assigned manuals returned (AC-23)
- Given a manual, when `softDeleteManual(id)`, then `deletedAt` is non-null and `listManuals` excludes it (AC-24)

### Unit Tests (Vitest)

#### `tests/unit/manual-service.test.ts`

- Given an admin user, when `canUserEdit` is called, then it returns `true` regardless of assignment (AC-25)
- Given an editor assigned to a manual, when `canUserEdit` is called, then it returns `true` (AC-25)
- Given an editor not assigned to a manual, when `canUserEdit` is called, then it returns `false` (AC-25)

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-2_spec.md`

**Pages/routes to verify:**
- `/manuals` — manual list page
- `/manuals/[id]` — manual editor/detail page

**Key UX checkpoints:**
- Manual list rows are compact with clear status badges (Draft=yellow, Published=green)
- Search input has visible placeholder and clears correctly
- Filter chips have active state and can be dismissed
- Pagination controls are disabled appropriately (no Previous on page 1, no Next on last page)
- Tiptap editor loads without flicker, toolbar is sticky during scroll
- Auto-save indicator is subtle and non-intrusive (not a modal or alert)
- Instruction blocks have clear numbering and visible reorder handles
- Warning blocks show severity with color coding (red=Danger, orange=Warning, yellow=Caution)
- Manage Access combobox is searchable and shows user names
- Delete confirmation dialog has clear destructive action styling
- Read-only mode is visually distinct (grayed inputs, no toolbar)
- Empty state illustration is centered with clear CTA
- All interactive elements have visible focus states

**Expected E2E test coverage:** AC-1 through AC-22 (all e2e-type criteria).

## 11. Out of Scope

- Version history / change tracking (deferred to Epic 5)
- Multi-language support (deferred to Epic 7)
- PDF export (deferred to Epic 9)
- Danger warnings library integration (deferred to Epic 3)
- Image/media uploads in Tiptap editor
- Collaborative real-time editing
- Manual templates / cloning
- Bulk operations (bulk delete, bulk assign)
- 30-day cleanup job for soft-deleted manuals (ops task, not app feature)
