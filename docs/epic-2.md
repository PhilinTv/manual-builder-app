# Epic 2: Manual CRUD & Assignment

**Goal:** Users can create and edit manuals with all core fields. Admins can assign manuals to users.

**Depends on:** Epic 1

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 2.1 | Manual data model | Schema includes: product name, table of contents, product overview, feature instructions (ordered list), danger warnings (list) |
| 2.2 | Create / edit / delete manual | Authenticated user can perform full CRUD on manuals they have access to |
| 2.3 | Manual list view | Paginated list with search by product name; responsive on mobile |
| 2.4 | Manual detail editor | Rich form for editing all manual sections; auto-save or explicit save |
| 2.5 | Admin: assign manual to user | Admin can assign/unassign manuals to editors; editors see only assigned manuals |

**Done when:** Admin creates a manual, assigns it to an editor, editor edits all fields, changes persist.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product Management:**
- Only admins can create and delete manuals; editors can only edit assigned manuals
- All users see all manuals (read-only for unassigned); editors edit only what's assigned to them
- Auto-save drafts + explicit publish workflow; draft/published status tracked per manual
- Admin-only soft delete with 30-day recovery window
- Generic empty state CTA with illustration (admin-only "Create" button)

**UX Design:**
- Manual list: compact rows with text search + filter chips (Status, Assignee), 20 items/page
- Manual editor: single scrollable page with Tiptap WYSIWYG block editor
- Tiptap toolbar: bold, italic, underline, headings (H2-H4), bullet/ordered lists, links, blockquotes
- Draft/Publish: persistent status badge in editor header; "Publish" button appears when unpublished changes exist
- Assignment: "Manage Access" section within manual detail page (admin-only)
- TOC: auto-generated from section headings
- Action feedback: toast notifications for all actions (publish, delete, assign/unassign)

**Architecture:**
- Data model: structured blocks — instructions as ordered list of objects (title + body), warnings as list of objects (title + description + severity), product overview as rich text (Tiptap JSON)
- Auto-save with debounce to draft state; explicit publish creates the "official" version
- Soft delete via `deleted_at` timestamp; cleanup job after 30 days
- Pagination: offset-based, 20 items per page
- Filter chips: server-side filtering by status and assignee

### Expected Outcome

- **Manual list page:** Compact list rows (product name, status badge, assignee avatar(s), last updated date) with text search and filter chips (Status: Draft/Published, Assignee). Paginated at 20 items/page. All users see all manuals. "New Manual" button visible to admins only. Empty state shows illustration + "Create your first manual" CTA (admin sees create button; editors see CTA but button is admin-only).
- **Manual detail editor:** Single scrollable page with Tiptap WYSIWYG block editor. Sections top-to-bottom: product name (text input), product overview (rich text via Tiptap), feature instructions (ordered list of structured blocks — each with title + rich-text body, drag-to-reorder), danger warnings (list of structured blocks — title + description + severity selector). TOC auto-generated from section headings, displayed read-only.
- **Tiptap toolbar:** Bold, italic, underline, headings (H2-H4), bullet/ordered lists, links, blockquotes.
- **Auto-save + Publish:** Changes auto-save to draft state with debounce. Persistent status badge ("Draft" / "Published") in editor header. "Publish" button appears when there are unpublished draft changes. Publishing makes the current state official.
- **Create manual flow (admin only):** Admin clicks "New Manual" on list page → opens editor with empty fields → manual starts as Draft → admin edits and publishes.
- **Delete manual (admin only):** Admin clicks delete → confirmation dialog → soft delete (manual hidden from list, recoverable for 30 days).
- **Assignment flow (admin only):** "Manage Access" section within manual detail page. Admin can add/remove editors via user selector. Editors see only manuals assigned to them as editable.
- **Access control:** All users see all manuals in the list. Editors can open any manual read-only. Edit controls appear only for assigned manuals. Create/delete/assign are admin-only actions.
- **Action feedback:** Toast notifications for all actions — publish success, delete confirmation, assignment changes, auto-save indicator.

### Acceptance Criteria

1. Admin can create a new manual with all required fields (product name, overview, instructions, warnings); editors cannot create
2. Manual list displays compact rows with product name, status, assignee, and last updated date
3. Manual list supports text search by product name and filter chips (Status, Assignee), paginated at 20 items/page
4. Manual list is responsive on mobile web
5. All users see all manuals; editors can only edit assigned manuals (unassigned open read-only)
6. User can edit all sections using the Tiptap WYSIWYG editor with standard formatting (bold, italic, underline, headings H2-H4, lists, links, blockquotes)
7. Feature instructions are structured as ordered blocks (title + body) that can be reordered; danger warnings as structured blocks (title + description + severity)
8. Changes auto-save to draft state; user explicitly publishes via "Publish" button; status badge shows Draft/Published
9. Only admins can delete manuals; deletion is soft (recoverable for 30 days) with confirmation dialog
10. Admin can assign and unassign editors to a manual via "Manage Access" section in the manual detail page
11. TOC is auto-generated from section headings
12. Toast notifications confirm all user actions (publish, delete, assign/unassign)
13. Empty state shows illustration with "Create your first manual" CTA
14. Manual data model supports future epics (versioning, multi-language, danger warnings library, PDF export)

### Open Questions

None — all questions resolved.

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Data model structure | Structured blocks — instructions as ordered list of block objects (title + body), warnings as list of objects (title + description + severity) | 1 |
| 2 | Rich text editing approach | Block-based WYSIWYG editor (Tiptap/ProseMirror) | 1 |
| 3 | Save strategy | Auto-save drafts + explicit publish | 1 |
| 4 | List view search/filtering | Text search + filter chips | 1 |
| 5 | Assignment UX | From manual detail page only ("Manage Access" section) | 1 |
| 6 | Access control model | All users see all manuals read-only; editors can only edit assigned manuals | 1 |
| 7 | Table of Contents | Auto-generated from section headings | 1 |
| 8 | Editor layout | Single scrollable page | 1 |
| 9 | Tiptap toolbar formatting | Standard — bold, italic, underline, headings (H2-H4), bullet/ordered lists, links, blockquotes | 2 |
| 10 | Draft/Publish flow UX | Status badge + top bar — persistent badge in editor header, "Publish" button when unpublished changes exist | 2 |
| 11 | Filter chips | Status (Draft/Published) + Assignee | 2 |
| 12 | List layout | Compact list rows — product name, status, assignee, last updated date | 2 |
| 13 | Delete behavior | Admin-only, soft delete (recoverable for 30 days) | 2 |
| 14 | Empty state | Generic CTA — illustration + "Create your first manual" button for all users | 2 |
| 15 | Manual creation permissions | Admin only — editors can only edit assigned manuals, never create | 3 |
| 16 | Pagination page size | 20 items per page | 3 |
| 17 | Action feedback | Toast notifications for all actions (publish, delete, assign/unassign) | 3 |

### Discussion Log

#### Round 1

- **Questions asked:** Data model structure, rich text editing, save strategy, list view filtering, assignment UX, access control model, TOC approach, editor layout
- **Answers:** User selected: (1) Structured blocks, (2) Tiptap WYSIWYG, (3) Auto-save drafts + publish, (4) Filter chips (over sortable columns), (5) Manual detail page only (over both directions), (6) All read-only + edit assigned, (7) Auto-generated TOC, (8) Single scrollable page (over accordion)

#### Round 2

- **Questions asked:** Tiptap formatting options, draft/publish flow UX, specific filter chips, list layout (cards vs rows), delete behavior, empty state
- **Answers:** User selected: (9) Standard toolbar, (10) Status badge + top bar, (11) Status + Assignee, (12) Compact list rows, (13) Admin-only soft delete, (14) Generic CTA (over contextual by role)

#### Round 3

- **Questions asked:** Manual creation permissions, pagination page size, action feedback
- **Answers:** User selected: (15) Admin only for creation, (16) 20 items/page, (17) Toast notifications
- **Outcome:** All 17 questions resolved. Confidence reached 92%. Brainstorming complete.
