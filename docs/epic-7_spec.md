# Multi-language Support — Spec

## 1. Goal

Enable manuals to have content in multiple languages with a primary/source language, side-by-side translation editing, per-section translation status tracking, and completeness indicators. Lay the data model groundwork for Epic 8 (automated translations).

## 2. Dependencies

- **Epic 1** — Auth, roles, app shell
- **Epic 2** — Manual CRUD, Tiptap editor, publish flow, data model
- **Epic 5** — Version snapshots (must include all languages)

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language list | Fixed system list of ~30 languages, hardcoded | No admin management overhead, consistent across app |
| Translation storage | Per-section content stored in a `ManualTranslation` table | Normalized, queryable per section + language, supports per-section status |
| Translation status | 3-state enum: `NOT_TRANSLATED`, `IN_PROGRESS`, `TRANSLATED` | Granular tracking, auto-detect + explicit confirmation |
| Primary language editing | Single-pane (same as Epic 2) | No added complexity for source language |
| Translation editing (desktop) | Side-by-side: source read-only left, target editable right | Standard CAT-tool pattern, reduces context switching |
| Translation editing (mobile) | Single-pane + "Show source" bottom sheet | Avoids cramped side-by-side on small screens |
| Language deletion | Soft delete via `deletedAt` timestamp | Content preserved, recoverable |

## 4. Implementation Tasks

### 4.1 Language Constants

1. Create `apps/web/src/lib/constants/languages.ts`:
   ```typescript
   export const LANGUAGES = [
     { code: 'en', name: 'English' },
     { code: 'de', name: 'German' },
     { code: 'fr', name: 'French' },
     { code: 'es', name: 'Spanish' },
     { code: 'it', name: 'Italian' },
     { code: 'pt', name: 'Portuguese' },
     { code: 'nl', name: 'Dutch' },
     { code: 'pl', name: 'Polish' },
     { code: 'cs', name: 'Czech' },
     { code: 'sk', name: 'Slovak' },
     { code: 'hu', name: 'Hungarian' },
     { code: 'ro', name: 'Romanian' },
     { code: 'bg', name: 'Bulgarian' },
     { code: 'hr', name: 'Croatian' },
     { code: 'sl', name: 'Slovenian' },
     { code: 'sv', name: 'Swedish' },
     { code: 'da', name: 'Danish' },
     { code: 'fi', name: 'Finnish' },
     { code: 'nb', name: 'Norwegian' },
     { code: 'ja', name: 'Japanese' },
     { code: 'ko', name: 'Korean' },
     { code: 'zh', name: 'Chinese (Simplified)' },
     { code: 'zh-TW', name: 'Chinese (Traditional)' },
     { code: 'ar', name: 'Arabic' },
     { code: 'tr', name: 'Turkish' },
     { code: 'ru', name: 'Russian' },
     { code: 'uk', name: 'Ukrainian' },
     { code: 'th', name: 'Thai' },
     { code: 'vi', name: 'Vietnamese' },
     { code: 'id', name: 'Indonesian' },
   ] as const

   export type LanguageCode = (typeof LANGUAGES)[number]['code']
   ```

### 4.2 Prisma Schema Updates

1. Add `TranslationStatus` enum and `ManualTranslation` model to `packages/db/prisma/schema.prisma`:
   ```prisma
   enum TranslationStatus {
     NOT_TRANSLATED
     IN_PROGRESS
     TRANSLATED
   }

   model ManualTranslation {
     id              String            @id @default(cuid())
     manualId        String
     manual          Manual            @relation(fields: [manualId], references: [id], onDelete: Cascade)
     languageCode    String            // e.g. "de", "fr"
     section         String            // "overview" | "instruction:{id}" | "warning:{id}" | "productName"
     content         Json              // Tiptap JSON or plain string for productName
     status          TranslationStatus @default(NOT_TRANSLATED)
     isAutoTranslated Boolean          @default(false)  // For Epic 8
     autoTranslatedAt DateTime?                          // For Epic 8
     sourceHash       String?                            // For Epic 8 stale detection
     createdAt       DateTime          @default(now())
     updatedAt       DateTime          @updatedAt
     deletedAt       DateTime?         // Soft delete

     @@unique([manualId, languageCode, section])
     @@index([manualId, languageCode])
     @@index([manualId])
   }
   ```
2. Add fields to `Manual` model:
   ```prisma
   // In Manual model, add:
   primaryLanguage   String             @default("en")
   translations      ManualTranslation[]
   ```
3. Add `ManualLanguage` model for tracking which languages are added to a manual:
   ```prisma
   model ManualLanguage {
     id           String    @id @default(cuid())
     manualId     String
     manual       Manual    @relation(fields: [manualId], references: [id], onDelete: Cascade)
     languageCode String
     addedById    String
     addedBy      User      @relation(fields: [addedById], references: [id])
     deletedAt    DateTime? // Soft delete
     createdAt    DateTime  @default(now())

     @@unique([manualId, languageCode])
     @@index([manualId])
   }
   ```
4. Add `languages ManualLanguage[]` relation to `Manual` model.
5. Add `addedLanguages ManualLanguage[]` relation to `User` model.
6. Run `pnpm db:migrate:dev --name add-multi-language`.

### 4.3 Migration Script for Existing Manuals

1. Create `packages/db/prisma/migrations/scripts/migrate-primary-language.ts`:
   - Set `primaryLanguage = 'en'` on all existing manuals that have `primaryLanguage` as null.
   - Run as a one-time post-migration script.

### 4.4 Translation Service

1. Create `apps/web/src/lib/services/translation-service.ts`:
   ```typescript
   export async function addLanguage(manualId: string, languageCode: string, userId: string): Promise<ManualLanguage>
   export async function removeLanguage(manualId: string, languageCode: string): Promise<void> // soft delete
   export async function getManualLanguages(manualId: string): Promise<ManualLanguageWithCompleteness[]>
   export async function getTranslations(manualId: string, languageCode: string): Promise<ManualTranslation[]>
   export async function updateTranslation(manualId: string, languageCode: string, section: string, content: Json, status?: TranslationStatus): Promise<ManualTranslation>
   export async function markAsTranslated(translationId: string): Promise<ManualTranslation>
   export async function getCompleteness(manualId: string, languageCode: string): Promise<{ translated: number; total: number }>
   ```
2. `addLanguage`:
   - Create `ManualLanguage` row.
   - For each section in the manual (productName, overview, each instruction, each warning), create a `ManualTranslation` row pre-filled with source language content. Set `status: NOT_TRANSLATED`.
3. `removeLanguage`:
   - Set `deletedAt` on `ManualLanguage` row. Translation rows remain (soft delete).
4. `updateTranslation`:
   - Update content. If content differs from source and `status` is `NOT_TRANSLATED`, auto-set to `IN_PROGRESS`.
5. `getCompleteness`:
   - Count translations where `status = TRANSLATED` vs total sections for that language.

### 4.5 Translation API Routes

1. Create `apps/web/src/app/api/manuals/[id]/languages/route.ts`:
   - `GET` — list languages for a manual with completeness. Auth: any user with access.
   - `POST` — add a language. Auth: assigned editor or admin.
2. Create `apps/web/src/app/api/manuals/[id]/languages/[lang]/route.ts`:
   - `DELETE` — soft-delete a language. Auth: assigned editor or admin.
3. Create `apps/web/src/app/api/manuals/[id]/translations/[lang]/route.ts`:
   - `GET` — get all translations for a language. Auth: any user with access.
4. Create `apps/web/src/app/api/manuals/[id]/translations/[lang]/[section]/route.ts`:
   - `PATCH` — update translation content and/or status. Auth: assigned editor or admin.

### 4.6 Language Switcher Dropdown

1. Create `apps/web/src/components/manuals/language-switcher.tsx`:
   ```typescript
   type LanguageSwitcherProps = {
     manualId: string
     currentLanguage: string
     primaryLanguage: string
     languages: ManualLanguageWithCompleteness[]
     onLanguageChange: (code: string) => void
     onAddLanguage: (code: string) => void
   }
   ```
2. Render a `DropdownMenu` (shadcn/ui) with `data-testid="language-switcher"` in the sticky editor header, next to the publish button.
3. Each language entry shows:
   - Language name and code (e.g., "German (DE)").
   - Completeness badge with `data-testid="completeness-badge-{code}"` (e.g., "3/5 sections").
   - Primary language marked with a star/badge.
4. At the bottom of the dropdown: "+ Add language" item that opens a picker dialog.

### 4.7 Add Language Dialog

1. Create `apps/web/src/components/manuals/add-language-dialog.tsx`:
   - shadcn/ui `Dialog` with `data-testid="add-language-dialog"` and a searchable `Command` (combobox) listing available languages.
   - Filter out languages already added to the manual.
   - On select: call `POST /api/manuals/[id]/languages` -> close dialog -> switch to new language.

### 4.8 Side-by-Side Translation Editor (Desktop)

1. Create `apps/web/src/components/manuals/translation-editor.tsx`:
   ```typescript
   type TranslationEditorProps = {
     manualId: string
     sourceLanguage: string
     targetLanguage: string
     sections: ManualSection[]
     translations: ManualTranslation[]
   }
   ```
2. Two-column layout (desktop >= 1024px) with `data-testid="translation-editor-side-by-side"`:
   - Left column (`data-testid="source-column"`): Source language content, read-only (`contenteditable="false"` or `aria-readonly="true"`). Each section rendered as a disabled Tiptap editor or plain display.
   - Right column (`data-testid="target-column"`): Target language content, editable Tiptap editors per section.
3. Each section in the right column shows:
   - Translation status badge with `data-testid="status-badge-{section}"`: text content "Not translated" (red), "In progress" (yellow), or "Translated" (green).
   - "Mark as translated" button with `data-testid="mark-translated-{section}"` that calls `PATCH .../translations/[lang]/[section]` with `status: TRANSLATED`.
4. Auto-detect: when user edits a `NOT_TRANSLATED` section, auto-update status to `IN_PROGRESS`.
5. Sections are vertically aligned between left and right columns for easy reference.

### 4.9 Mobile Translation View

1. Create `apps/web/src/components/manuals/translation-editor-mobile.tsx`:
   - Single-pane view with `data-testid="translation-editor-mobile"` showing target language content (editable).
   - "Show source" button with `data-testid="show-source-button"` opens a `Sheet` (bottom sheet) with `data-testid="source-bottom-sheet"` containing source language content for the current section.
   - Same status badges and "Mark as translated" button as desktop.
2. Use `useMediaQuery` or Tailwind responsive breakpoints to switch between desktop and mobile views at the 1024px breakpoint.

### 4.10 Primary Language Editor Integration

1. Modify the manual editor page `apps/web/src/app/(dashboard)/manuals/[id]/page.tsx`:
   - Add `<LanguageSwitcher>` to the editor header.
   - When `currentLanguage === primaryLanguage`: render normal single-pane editor (existing behavior).
   - When `currentLanguage !== primaryLanguage`: render `<TranslationEditor>` (desktop) or `<TranslationEditorMobile>` (mobile).
   - Fetch translations for the selected language via `GET /api/manuals/[id]/translations/[lang]`.

### 4.11 Manual List Language Tags

1. Modify `apps/web/src/components/manuals/manual-list-item.tsx` (or equivalent list component):
   - Display language code badges (e.g., `EN`, `DE`, `FR`) as small tags with `data-testid="language-tag-{code}"` next to each manual entry.
   - Primary language badge uses a distinct visual style (e.g., filled background vs outline).
2. Add a language filter chip to the manual list filter bar:
   - Chip with `data-testid="language-filter"`.
   - Filters manuals that have the selected language added.
   - Server-side filtering via query param `?language=de`.

### 4.12 Publish with Incomplete Translations Warning

1. Modify the publish flow in `apps/web/src/app/(dashboard)/manuals/[id]/actions.ts`:
   - Before publishing, check translation completeness for all added languages.
   - If any language has incomplete translations, return a warning payload instead of publishing immediately.
2. Create `apps/web/src/components/manuals/publish-warning-dialog.tsx`:
   - shadcn/ui `AlertDialog` with `data-testid="publish-warning-dialog"`.
   - Title: "Incomplete Translations"
   - Body: list each incomplete language with count (e.g., "German — 2/5 sections translated").
   - Actions: "Cancel" button, "Publish Anyway" button with `data-testid="publish-anyway-button"`.
   - On "Publish Anyway": call publish action with `force: true` flag to bypass the check.

### 4.13 Update Primary Language Setting

1. Add a "Change primary language" option in manual settings (or editor header dropdown).
2. Create `apps/web/src/components/manuals/change-primary-language-dialog.tsx`:
   - Select dropdown with `data-testid="primary-language-select"` with current primary language preselected.
   - Confirmation dialog: "Changing the primary language affects how translations are displayed."
   - On confirm: `PATCH /api/manuals/[id]` with `{ primaryLanguage: newCode }`.

### 4.14 Version Snapshot Integration (Epic 5)

1. Modify `createVersion` in `apps/web/src/lib/services/version-service.ts`:
   - Include all translations in the version snapshot under a `translations` key:
     ```typescript
     {
       ...manualContent,
       translations: {
         de: { overview: {...}, instructions: [...], ... },
         fr: { overview: {...}, instructions: [...], ... }
       }
     }
     ```
2. Modify rollback to restore translations alongside primary content.

## 5. API Contracts

### GET /api/manuals/[id]/languages

**Auth:** Any user with access to the manual.

```typescript
// Response 200
type ManualLanguagesResponse = {
  primaryLanguage: string
  languages: {
    code: string
    name: string
    translated: number
    total: number
    addedBy: string
    createdAt: string
  }[]
}
```

### POST /api/manuals/[id]/languages

**Auth:** Assigned editor or admin.

```typescript
// Request
type AddLanguageRequest = {
  languageCode: string
}

// Response 201
type AddLanguageResponse = {
  code: string
  name: string
  translated: number
  total: number
}

// Response 400 — invalid language code
// Response 409 — language already added
```

### DELETE /api/manuals/[id]/languages/[lang]

**Auth:** Assigned editor or admin.

```typescript
// Response 200 — soft deleted
// Response 404 — language not found on this manual
```

### GET /api/manuals/[id]/translations/[lang]

**Auth:** Any user with access to the manual.

```typescript
// Response 200
type TranslationsResponse = {
  languageCode: string
  sections: {
    section: string   // "productName" | "overview" | "instruction:{id}" | "warning:{id}"
    content: object   // Tiptap JSON or string
    status: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED"
    updatedAt: string
  }[]
}
```

### PATCH /api/manuals/[id]/translations/[lang]/[section]

**Auth:** Assigned editor or admin.

```typescript
// Request
type UpdateTranslationRequest = {
  content?: object
  status?: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED"
}

// Response 200
type UpdateTranslationResponse = {
  section: string
  content: object
  status: "NOT_TRANSLATED" | "IN_PROGRESS" | "TRANSLATED"
  updatedAt: string
}
```

### GET /api/manuals (updated)

Add support for `?language=` query parameter to filter manuals by language.

## 6. Data Model

```prisma
enum TranslationStatus {
  NOT_TRANSLATED
  IN_PROGRESS
  TRANSLATED
}

model ManualLanguage {
  id           String    @id @default(cuid())
  manualId     String
  manual       Manual    @relation(fields: [manualId], references: [id], onDelete: Cascade)
  languageCode String
  addedById    String
  addedBy      User      @relation(fields: [addedById], references: [id])
  deletedAt    DateTime? // Soft delete
  createdAt    DateTime  @default(now())

  @@unique([manualId, languageCode])
  @@index([manualId])
}

model ManualTranslation {
  id               String            @id @default(cuid())
  manualId         String
  manual           Manual            @relation(fields: [manualId], references: [id], onDelete: Cascade)
  languageCode     String
  section          String            // "productName" | "overview" | "instruction:{id}" | "warning:{id}"
  content          Json
  status           TranslationStatus @default(NOT_TRANSLATED)
  isAutoTranslated Boolean           @default(false)  // For Epic 8
  autoTranslatedAt DateTime?                           // For Epic 8
  sourceHash       String?                             // For Epic 8 stale detection
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  deletedAt        DateTime?

  @@unique([manualId, languageCode, section])
  @@index([manualId, languageCode])
  @@index([manualId])
}
```

Relation additions:
```prisma
// In Manual model, add:
primaryLanguage  String              @default("en")
languages        ManualLanguage[]
translations     ManualTranslation[]

// In User model, add:
addedLanguages   ManualLanguage[]
```

## 7. Acceptance Criteria

All acceptance criteria follow the pattern: **Given** [state], **When** [action], **Then** [observable assertion]. Every criterion is automatable via Playwright E2E tests or Vitest integration/unit tests.

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | **Given** a user is on the create-manual page, **when** they create a new manual, **then** the manual's `primaryLanguage` field is `"en"` and the language switcher dropdown (`[data-testid="language-switcher"]`) displays "English" as the selected language. | e2e | `multi-lang.spec.ts` |
| AC-2 | **Given** a manual exists with `primaryLanguage = "en"`, **when** the user opens change-primary-language dialog (`[data-testid="primary-language-select"]`), selects "German", and confirms, **then** the API responds 200 to `PATCH /api/manuals/[id]` with `primaryLanguage: "de"`, and the language switcher shows "German" as primary. | e2e | `multi-lang.spec.ts` |
| AC-3 | **Given** a manual with only English, **when** the user clicks the language switcher, clicks "+ Add language", searches "German" in the add-language dialog (`[data-testid="add-language-dialog"]`), and selects it, **then** the API responds 201 to `POST /api/manuals/[id]/languages`, and the language dropdown now contains an item with text "German (DE)". | e2e | `multi-lang.spec.ts` |
| AC-4 | **Given** an editor user assigned to a manual, **when** they log in and navigate to the manual editor, click "+ Add language", and add French, **then** the API responds 201 and "French (FR)" appears in the language switcher dropdown. | e2e | `multi-lang.spec.ts` |
| AC-5 | **Given** a manual with EN (primary) and DE added, **when** the user clicks the language switcher and selects "German (DE)", **then** the URL updates to include `?lang=de` and the translation editor container (`[data-testid="translation-editor-side-by-side"]` on desktop or `[data-testid="translation-editor-mobile"]` on mobile) is visible in the DOM. | e2e | `multi-lang.spec.ts` |
| AC-6 | **Given** a manual with EN (primary) and DE added, and the user is currently viewing the DE translation (`?lang=de`), **when** the user opens the language switcher dropdown (`[data-testid="language-switcher"]`), **then** the dropdown contains an item with text "English" (the primary language) AND an item with text "German (DE)", so the user can switch back to the primary language. | e2e | `multi-lang.spec.ts` |
| AC-7 | **Given** a manual with EN (primary) and DE added, and the user is viewing the DE translation editor, **when** the user selects "English" from the language switcher, **then** the `[data-testid="translation-editor-side-by-side"]` element is not present in the DOM, and the standard single-pane Tiptap editor is rendered. | e2e | `multi-lang.spec.ts` |
| AC-8 | **Given** a desktop viewport (>=1024px) and a manual with DE added, **when** the user selects DE from the language switcher, **then** `[data-testid="translation-editor-side-by-side"]` is visible, `[data-testid="source-column"]` has `contenteditable="false"` or `aria-readonly="true"` on its editor elements, and `[data-testid="target-column"]` contains editable Tiptap editors. | e2e | `multi-lang.spec.ts` |
| AC-9 | **Given** a mobile viewport (375x812) and a manual with DE added, **when** the user selects DE, **then** `[data-testid="translation-editor-mobile"]` is visible and `[data-testid="translation-editor-side-by-side"]` is not present. **When** the user clicks `[data-testid="show-source-button"]`, **then** `[data-testid="source-bottom-sheet"]` becomes visible and contains the source language text. | e2e | `multi-lang.spec.ts` |
| AC-10 | **Given** a manual with 5 sections (productName, overview, 2 instructions, 1 warning), **when** `addLanguage("de")` is called, **then** 5 `ManualTranslation` rows are created with `languageCode="de"`, each having `status=NOT_TRANSLATED` and `content` matching the source language content. | integration | `translation-service.test.ts` |
| AC-11 | **Given** a DE translation section with `status=NOT_TRANSLATED` pre-filled with source text, **when** the user types new content into the target editor for that section, **then** `[data-testid="status-badge-{section}"]` text content changes from "Not translated" to "In progress". | e2e | `multi-lang.spec.ts` |
| AC-12 | **Given** a DE translation section with status "In progress", **when** the user clicks `[data-testid="mark-translated-{section}"]`, **then** the API responds 200 to `PATCH .../translations/de/{section}` with `status: "TRANSLATED"`, and `[data-testid="status-badge-{section}"]` text content changes to "Translated". | e2e | `multi-lang.spec.ts` |
| AC-13 | **Given** a manual with 5 sections and DE added, and the user has marked 3 sections as "Translated", **when** the user opens the language switcher dropdown, **then** `[data-testid="completeness-badge-de"]` contains the text "3/5". | e2e | `multi-lang.spec.ts` |
| AC-14 | **Given** 3 seeded manuals — Manual A (EN, DE), Manual B (EN, FR), Manual C (EN only), **when** the user navigates to `/manuals`, **then** Manual A's list item contains `[data-testid="language-tag-en"]` and `[data-testid="language-tag-de"]`, Manual B's contains `[data-testid="language-tag-en"]` and `[data-testid="language-tag-fr"]`, and Manual C's contains only `[data-testid="language-tag-en"]`. | e2e | `manual-list-lang.spec.ts` |
| AC-15 | **Given** the manual list page with 3 manuals (A has DE, B has FR, C is EN-only), **when** the user selects "DE" from `[data-testid="language-filter"]`, **then** only Manual A is visible in the list, and the URL includes `?language=de`. **When** the filter is cleared, **then** all 3 manuals are visible. | e2e | `manual-list-lang.spec.ts` |
| AC-16 | **Given** a manual with DE added and only 2 of 5 sections marked "Translated" in DE, **when** the user clicks the Publish button, **then** `[data-testid="publish-warning-dialog"]` becomes visible, its body text contains "German" and "2/5", and it shows "Cancel" and "Publish Anyway" buttons. **When** the user clicks `[data-testid="publish-anyway-button"]`, **then** the manual is published (success toast or status change visible). | e2e | `multi-lang.spec.ts` |
| AC-17 | **Given** a manual with DE added and translation rows in the DB, **when** `removeLanguage("de")` is called, **then** the `ManualLanguage` row has `deletedAt` set to a non-null timestamp, and all `ManualTranslation` rows for `languageCode="de"` still exist in the database (not hard-deleted). | integration | `translation-service.test.ts` |
| AC-18 | **Given** a manual with EN (primary) and DE translations, **when** `createVersion` is called, **then** the version snapshot JSON includes a `translations.de` key containing all DE section content. **When** the manual is subsequently edited and then rolled back to that version, **then** the DE translations in `ManualTranslation` match the snapshot content. | integration | `version-service.test.ts` |
| AC-19 | **Given** the Prisma schema, **when** the `ManualTranslation` model is inspected, **then** it contains fields `isAutoTranslated` (Boolean, default false), `autoTranslatedAt` (DateTime, nullable), and `sourceHash` (String, nullable). | unit | `schema.test.ts` |
| AC-20 | **Given** an editor user who is NOT assigned to a manual, **when** they call `POST /api/manuals/[id]/languages` with a valid language code, **then** the API responds with HTTP 403. | integration | `translation-service.test.ts` |
| AC-21 | **Given** a mobile viewport (375x812) with a manual that has DE translations, **when** the user navigates to the translation editor, **then** the page `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow), the language switcher is visible, and `[data-testid="mark-translated-{section}"]` buttons are visible within the viewport. | e2e | `multi-lang.spec.ts` |

## 8. TDD Approach

All tests must be written before the corresponding implementation code. Follow this sequence:

1. **Unit tests first** (`tests/unit/languages.test.ts`, `tests/unit/schema.test.ts`) — write tests asserting the language constants and schema fields exist. Run them; they should fail. Then implement the constants file and schema.
2. **Integration tests second** (`tests/integration/translation-service.test.ts`, `tests/integration/version-service.test.ts`) — write tests for `addLanguage`, `removeLanguage`, `updateTranslation`, `markAsTranslated`, `getCompleteness`, and version snapshot/rollback. Run them; they should fail. Then implement the service layer and API routes.
3. **E2E tests last** (`tests/e2e/multi-lang.spec.ts`, `tests/e2e/manual-list-lang.spec.ts`) — write Playwright tests for all e2e acceptance criteria using the `data-testid` selectors specified above. Run them; they should fail. Then implement the UI components.

Each implementation task in Section 4 should not be considered complete until its corresponding tests pass.

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/multi-lang.spec.ts`
**Setup:** Seed DB with admin, editor assigned to a manual with 5 sections (1 productName, 1 overview, 2 instructions, 1 warning).

- **Given** a newly created manual, **when** the editor page loads, **then** `[data-testid="language-switcher"]` shows "English" as the selected language (AC-1)
- **Given** the manual editor, **when** the user opens change-primary-language dialog and selects "German", **then** `[data-testid="language-switcher"]` shows "German" as primary (AC-2)
- **Given** the language switcher, **when** the user clicks "+ Add language", searches "German" in `[data-testid="add-language-dialog"]`, and selects it, **then** "German (DE)" appears in the dropdown (AC-3)
- **Given** a logged-in assigned editor, **when** they add French via the add-language dialog, **then** "French (FR)" appears in the language switcher dropdown (AC-4)
- **Given** DE is added, **when** the user selects DE from the dropdown, **then** URL contains `?lang=de` and `[data-testid="translation-editor-side-by-side"]` is visible (AC-5)
- **Given** a manual with EN and DE, **when** viewing DE translation and opening the language switcher, **then** both "English" and "German (DE)" are listed in the dropdown (AC-6)
- **Given** the user is viewing DE translation editor, **when** they select the primary language, **then** `[data-testid="translation-editor-side-by-side"]` is absent from the DOM (AC-7)
- **Given** a desktop viewport (1280x720), **when** the user selects DE, **then** `[data-testid="source-column"]` contains read-only editors and `[data-testid="target-column"]` contains editable editors (AC-8)
- **Given** a mobile viewport (375x812), **when** the user selects DE, **then** `[data-testid="translation-editor-mobile"]` is visible, and clicking `[data-testid="show-source-button"]` reveals `[data-testid="source-bottom-sheet"]` (AC-9)
- **Given** a pre-filled NOT_TRANSLATED section in DE, **when** the user types new text into the target editor, **then** `[data-testid="status-badge-overview"]` text changes to "In progress" (AC-11)
- **Given** an "In progress" section, **when** the user clicks `[data-testid="mark-translated-overview"]`, **then** `[data-testid="status-badge-overview"]` text changes to "Translated" (AC-12)
- **Given** 3 of 5 DE sections marked "Translated", **when** the user opens the language switcher, **then** `[data-testid="completeness-badge-de"]` contains "3/5" (AC-13)
- **Given** DE with 2/5 sections translated, **when** the user clicks Publish, **then** `[data-testid="publish-warning-dialog"]` is visible and contains "German" and "2/5". **When** they click `[data-testid="publish-anyway-button"]`, **then** the dialog closes and a success indicator appears (AC-16)
- **Given** a mobile viewport (375x812), **when** the translation editor loads, **then** `document.documentElement.scrollWidth === document.documentElement.clientWidth` and all `[data-testid^="mark-translated-"]` buttons are visible (AC-21)

#### `tests/e2e/manual-list-lang.spec.ts`
**Setup:** Seed DB with 3 manuals — Manual A (EN, DE), Manual B (EN, FR), Manual C (EN only).

- **Given** the manual list page at `/manuals`, **then** Manual A's row contains `[data-testid="language-tag-en"]` and `[data-testid="language-tag-de"]` (AC-14)
- **Given** the manual list page, **then** Manual B's row contains `[data-testid="language-tag-en"]` and `[data-testid="language-tag-fr"]` (AC-14)
- **Given** the manual list page, **then** Manual C's row contains `[data-testid="language-tag-en"]` only (AC-14)
- **Given** the manual list page, **when** the user selects "DE" from `[data-testid="language-filter"]`, **then** only Manual A is visible and the URL includes `?language=de` (AC-15)
- **Given** the language filter set to "FR", **then** only Manual B is visible (AC-15)
- **Given** a language filter is active, **when** the user clears the filter, **then** all 3 manuals are visible (AC-15)

### Unit Tests (Vitest)

#### `tests/unit/languages.test.ts`
- `LANGUAGES` constant contains at least 28 entries
- Each language has a unique `code` and non-empty `name`
- All expected codes are present: `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `ja`, `ko`, `zh`, `ru`

#### `tests/unit/schema.test.ts`
- ManualTranslation model includes `isAutoTranslated` (Boolean, default false), `autoTranslatedAt` (DateTime, nullable), `sourceHash` (String, nullable)

### Integration Tests (Vitest)

#### `tests/integration/translation-service.test.ts`
**Setup:** Test database with seeded manual (5 sections) and users (admin, assigned editor, unassigned editor).

- `addLanguage("de")` creates a `ManualLanguage` row with `languageCode="de"` and 5 `ManualTranslation` rows, each with `status=NOT_TRANSLATED` and content matching source (AC-10)
- `updateTranslation` with modified content on a `NOT_TRANSLATED` row sets status to `IN_PROGRESS` (AC-11)
- `markAsTranslated(translationId)` sets status to `TRANSLATED` (AC-12)
- `getCompleteness("de")` returns `{ translated: 3, total: 5 }` after marking 3 sections (AC-13)
- `removeLanguage("de")` sets `ManualLanguage.deletedAt` to non-null and does not delete `ManualTranslation` rows (AC-17)
- `addLanguage` called by unassigned editor throws/returns 403 (AC-20)

#### `tests/integration/version-service.test.ts` (addition to Epic 5 tests)
- `createVersion` snapshot JSON contains `translations.de` with all DE section content (AC-18)
- Rollback to a version restores `ManualTranslation` rows to match the snapshot (AC-18)

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-7_spec.md`

**Pages/routes to verify:**
- `/manuals/[id]` — editor with language switcher dropdown (`[data-testid="language-switcher"]`)
- `/manuals/[id]?lang=de` — translation editor (`[data-testid="translation-editor-side-by-side"]` on desktop, `[data-testid="translation-editor-mobile"]` on mobile)
- `/manuals` — manual list with language tags (`[data-testid="language-tag-{code}"]`) and filter (`[data-testid="language-filter"]`)
- Add language dialog (`[data-testid="add-language-dialog"]`)
- Publish warning dialog (`[data-testid="publish-warning-dialog"]`)

**Key UX checkpoints (all automatable):**
- `[data-testid="language-switcher"]` is a child of the sticky editor header element and is rendered adjacent to the publish button (both share the same parent container)
- `[data-testid="completeness-badge-de"]` text content matches the pattern `\d+/\d+ sections` (e.g., "3/5 sections")
- `[data-testid="source-column"]` and `[data-testid="target-column"]` both exist within `[data-testid="translation-editor-side-by-side"]` and each occupy approximately 50% of the container width (within 10% tolerance)
- `[data-testid="source-column"]` has a different background color CSS value than `[data-testid="target-column"]`
- Each `[data-testid^="status-badge-"]` element contains exactly one of these text values: "Not translated", "In progress", "Translated"
- `[data-testid="source-bottom-sheet"]` on mobile has `overflow-y: auto` or `overflow-y: scroll` and does not obscure `[data-testid="mark-translated-{section}"]` buttons when closed
- `[data-testid="publish-warning-dialog"]` body contains a list of incomplete languages with their counts
- All buttons and interactive elements within the translation editor have a `focus-visible` outline style (`:focus-visible` pseudo-class applies a visible `outline` or `box-shadow`)

**Expected E2E test coverage:** AC-1 through AC-9, AC-11 through AC-16, AC-21.

## 11. Out of Scope

- RTL (right-to-left) language support (deferred to future enhancement)
- Custom/user-defined languages beyond the system list
- Automated translation (Epic 8)
- Translation memory or glossary management
- Language-specific formatting rules (date, number formats)
- Per-language publishing (all languages publish together)
- Translation workflow roles (translator, reviewer)
- Import/export of translation files (XLIFF, PO)
- Inline translation suggestions
