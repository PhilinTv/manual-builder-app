# Epic 3: Danger Warnings Library

**Goal:** Reusable library of danger warnings that can be selected when editing a manual.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 3.1 | Warning library CRUD | Admin can create, edit, delete shared danger warnings (title + description + severity) |
| 3.2 | Select warnings for a manual | In manual editor, user can pick from the library instead of typing warnings from scratch |
| 3.3 | Custom warnings | User can still add a one-off warning not in the library |

**Done when:** Admin populates warning library; editor selects library warnings in a manual and adds a custom one.

---

## Brainstorming

**Confidence Level:** 95%

### Summary

**Product:**
- Admin-only warning library — admins manage shared warnings (title, description, severity), editors consume them
- Reference model — manuals link to library warnings; edits propagate to all manuals using that warning
- Editors can also create custom one-off warnings directly in a manual without polluting the shared library
- Three severity levels: Danger / Warning / Caution (ISO 3864 / ANSI Z535 standard)

**UX:**
- Dedicated top-level "/warnings" page in the sidebar for library management (CRUD, search, filter by severity)
- Dropdown/combobox search in the manual editor to quickly pick library warnings by name
- Warnings displayed as colored cards with severity icon + badge inline in the editor (red Danger, orange Warning, yellow Caution)
- Empty library state shows a clear prompt to create the first warning

**Architecture:**
- `DangerWarning` model: id, title, description, severity (enum: DANGER/WARNING/CAUTION), createdAt, updatedAt
- Many-to-many relation between manuals and library warnings (reference model via join table)
- Custom warnings stored as separate entries on the manual (not in the shared library)
- Server Actions for warning CRUD; combobox fetches via API route with search query

### Expected Outcome

- **Warning library page (/warnings):** Admin-only page in sidebar nav. Lists all shared warnings as cards/rows with severity badge, title, and description. Supports create, edit, delete. Empty state prompts admin to create the first warning. Responsive on mobile.
- **Manual editor integration:** Danger warnings section in the manual editor shows a combobox/typeahead to search and add library warnings. Added warnings appear as colored inline cards with severity icon. User can reorder warnings.
- **Custom warnings:** "Add custom warning" button lets editors create a one-off warning with title, description, and severity — stored on the manual only, not added to library.
- **Reference behavior:** Library warnings added to manuals are linked references. If an admin edits a library warning, the change reflects in all manuals using it.

### Acceptance Criteria

1. Admin can create a new library warning with title, description, and severity (Danger/Warning/Caution)
2. Admin can edit and delete existing library warnings
3. Editing a library warning updates it across all manuals referencing it
4. Editor can search and add library warnings to a manual via combobox
5. Editor can add a custom one-off warning not from the library
6. Warnings display as colored cards with severity icon and badge in the manual editor
7. Warning library page is accessible only to admins (editors see 403 or hidden nav)
8. Warning library page is responsive on mobile web
9. Empty library state shows a clear call-to-action to create the first warning

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question                        | Decision                                                              | Round |
|---|---------------------------------|-----------------------------------------------------------------------|-------|
| 1 | Warning library UI location     | Dedicated top-level page ("/warnings") in sidebar nav                | 1     |
| 2 | Picker UX in manual editor      | Dropdown/combobox search (typeahead)                                 | 1     |
| 3 | Severity levels                 | Three levels: Danger / Warning / Caution (ISO 3864 / ANSI Z535)      | 1     |
| 4 | Reference vs copy model         | Reference model — edits propagate to all manuals                     | 1     |
| 5 | Warning display in editor       | Colored cards with severity icon + badge, inline                     | 1     |
| 6 | Permission model                | Admin-only library management; editors select or add custom one-offs | 1     |

### Discussion Log

#### Round 1

- **Questions asked:** Warning library UI location, picker UX in editor, severity levels, reference vs copy model, warning display style, permission model
- **Answers:** Dedicated top-level page, dropdown/combobox search, 3 levels (Danger/Warning/Caution), reference model, colored cards with icon+badge, admin-only
