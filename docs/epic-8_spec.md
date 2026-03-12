# Automated Translations — Spec

## 1. Goal

Enable users to auto-translate manual content into target languages using OpenAI GPT-4o-mini, with streaming output, per-section approval workflow, and stale detection when source content changes.

## 2. Dependencies

- **Epic 7** — Multi-language support (language model, side-by-side editor, translation status tracking)
- **Epic 2** — Manual CRUD (manual data model, Tiptap editor)
- **Epic 1** — Auth & user management (session, roles)

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Translation provider | OpenAI API (GPT-4o-mini) | Good quality at low cost (~$0.15/1M input tokens), streaming support |
| Streaming delivery | Server-Sent Events (SSE) via API route | Native browser support, unidirectional stream fits translation output |
| Token estimation | `tiktoken` (js) or character-based heuristic | Pre-confirmation cost estimate without API call |
| Service abstraction | `TranslationService` interface | Future provider flexibility (swap OpenAI for another LLM) |
| Translatable fields | Content fields only (overview, instructions, warnings) | Product name stays in source language to prevent brand errors |
| API pattern | API Route for SSE streaming, Server Actions for approval/status mutations | SSE requires raw Response; mutations use Server Actions |

## 4. TDD Approach

All features in this epic follow a test-driven development workflow:

1. **Write failing tests first.** Before implementing any feature, write the corresponding E2E (Playwright), integration, or unit test that captures the acceptance criterion. The test must fail (red).
2. **Implement the minimum code** to make the test pass (green).
3. **Refactor** while keeping all tests passing.

Suggested implementation order for TDD cycles:

1. Unit tests for `TranslationProvider` interface and `estimateTokens()` (AC-11, AC-12).
2. Unit tests for `extractGlossary()` (AC-10).
3. Integration tests for stale detection (AC-7) and translation field scoping (AC-8).
4. E2E tests for single-section translation (AC-1, AC-3, AC-5, AC-6).
5. E2E tests for full-manual translation (AC-2, AC-9).
6. E2E tests for stale indicator UI (AC-14) and cancel (AC-15).
7. E2E tests for side-by-side editor integration (AC-13).

Mock the OpenAI API in all test environments using a deterministic mock provider that implements `TranslationProvider` and returns predefined translated text. For streaming tests, the mock emits chunks with short delays.

## 5. Implementation Tasks

### 5.1 OpenAI SDK Setup

1. Install `openai` package in `apps/web`:
   ```bash
   pnpm --filter web add openai
   ```
2. Add `OPENAI_API_KEY` to `.env.example`.
3. Create `src/lib/openai.ts`:
   ```typescript
   import OpenAI from "openai"

   export const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
   })
   ```

### 5.2 Translation Service Layer

1. Create `src/services/translation/types.ts`:
   ```typescript
   export interface TranslationRequest {
     text: string
     sourceLanguage: string
     targetLanguage: string
     glossary?: GlossaryEntry[]
     context?: string // section type: overview | instruction | warning
   }

   export interface GlossaryEntry {
     source: string
     target: string
   }

   export interface TranslationProvider {
     translate(request: TranslationRequest): AsyncIterable<string>
     estimateTokens(text: string): number
   }
   ```
2. Create `src/services/translation/openai-provider.ts`:
   - Implement `TranslationProvider` using `openai.chat.completions.create({ stream: true })`.
   - System prompt: instruct model to translate only, preserve formatting, use glossary terms.
   - `estimateTokens()`: use character-based heuristic (chars / 4) or `tiktoken`.
3. Create `src/services/translation/index.ts`:
   - Export factory function `getTranslationProvider()` returning the OpenAI provider.

### 5.3 Prisma Schema Updates

1. Add translation tracking fields to the section translation model in `packages/db/prisma/schema.prisma`:
   ```prisma
   model SectionTranslation {
     id              String    @id @default(cuid())
     sectionId       String
     languageCode    String
     content         Json
     autoTranslated  Boolean   @default(false)
     approved        Boolean   @default(false)
     stale           Boolean   @default(false)
     sourceHash      String?   // hash of source content at translation time
     translatedAt    DateTime?
     approvedAt      DateTime?
     approvedBy      String?
     createdAt       DateTime  @default(now())
     updatedAt       DateTime  @updatedAt

     section         Section   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
     approver        User?     @relation(fields: [approvedBy], references: [id])

     @@unique([sectionId, languageCode])
     @@index([sectionId])
     @@index([languageCode])
     @@index([autoTranslated, approved])
   }
   ```
2. Run `pnpm --filter db migrate:dev --name add-translation-tracking`.

### 5.4 Glossary Extraction

1. Create `src/services/translation/glossary.ts`:
   ```typescript
   export async function extractGlossary(
     manualId: string,
     targetLanguage: string
   ): Promise<GlossaryEntry[]>
   ```
   - Query approved translations for the same manual and target language.
   - Extract key terms (product-specific nouns, technical terms) from approved section pairs.
   - Return as `{ source, target }[]` (limit to ~50 entries to stay within context window).

### 5.5 Token Estimation Endpoint

1. Create `src/app/api/manuals/[manualId]/translate/estimate/route.ts`:
   - `POST` — accepts `{ sectionIds: string[], targetLanguage: string }`.
   - Calculates total input tokens for all sections + system prompt + glossary.
   - Returns `{ estimatedInputTokens, estimatedOutputTokens, estimatedCost }`.

### 5.6 Streaming Translation API Route

1. Create `src/app/api/manuals/[manualId]/translate/route.ts`:
   - `POST` — accepts `{ sectionId: string, targetLanguage: string }`.
   - Auth: require session with edit access to the manual.
   - Load source content, glossary, build prompt.
   - Stream response as SSE:
     ```typescript
     export async function POST(req: Request, { params }: { params: { manualId: string } }) {
       // ... auth, validation, load data ...
       const provider = getTranslationProvider()
       const stream = provider.translate({ text, sourceLanguage, targetLanguage, glossary })

       const encoder = new TextEncoder()
       const readable = new ReadableStream({
         async start(controller) {
           for await (const chunk of stream) {
             controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
           }
           controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
           controller.close()
         },
       })

       return new Response(readable, {
         headers: {
           "Content-Type": "text/event-stream",
           "Cache-Control": "no-cache",
           Connection: "keep-alive",
         },
       })
     }
     ```
   - On completion, save translated content with `autoTranslated: true`, `approved: false`, compute and store `sourceHash`.

### 5.7 Full-Manual Translation Orchestration

1. Create `src/app/api/manuals/[manualId]/translate/all/route.ts`:
   - `POST` — accepts `{ targetLanguage: string }`.
   - Returns SSE stream that translates sections sequentially.
   - Each section emits: `{ sectionId, status: "start" | "chunk" | "done" | "error", text? }`.
   - On per-section error, log error, emit error event, continue with next section (partial success).

### 5.8 Approval & Status Server Actions

1. Create `src/app/(dashboard)/manuals/[manualId]/actions/translation.ts`:
   ```typescript
   "use server"

   export async function approveTranslation(sectionId: string, languageCode: string): Promise<void>
   export async function unapproveTranslation(sectionId: string, languageCode: string): Promise<void>
   ```
   - `approveTranslation`: set `approved: true`, `approvedAt: now()`, `approvedBy: session.user.id`.
   - `unapproveTranslation`: set `approved: false`, clear `approvedAt`/`approvedBy`.

### 5.9 Stale Detection

1. Create `src/services/translation/stale-detection.ts`:
   ```typescript
   export function computeContentHash(content: Json): string
   export async function markStaleTranslations(sectionId: string): Promise<void>
   ```
   - `computeContentHash`: SHA-256 of JSON-stringified content.
   - `markStaleTranslations`: called when source content is saved; compares current `sourceHash` to new hash; sets `stale: true` if different.
2. Hook into the manual save flow (auto-save Server Action from Epic 2):
   - After saving source content, call `markStaleTranslations(sectionId)` for all non-source languages.

### 5.10 Translation UI Components

1. Create `src/components/translation/translate-button.tsx`:
   - "Auto-translate" button with `data-testid="translate-button"` shown in the translation editor toolbar.
   - Dropdown with `data-testid="translate-section-option"` and `data-testid="translate-all-option"`.
2. Create `src/components/translation/confirm-dialog.tsx`:
   - Dialog with `data-testid="translate-confirm-dialog"`.
   - Shows estimated token count in an element with `data-testid="token-estimate"` and cost in `data-testid="cost-estimate"`.
   - Confirm button with `data-testid="translate-confirm-button"`, Cancel button with `data-testid="translate-cancel-button"`.
3. Create `src/components/translation/auto-translated-badge.tsx`:
   - Badge with `data-testid="auto-translated-badge"` and text content "Auto-translated" shown on sections with `autoTranslated: true && approved: false`.
   - Approve button with `data-testid="approve-translation-button"` adjacent to badge.
4. Create `src/components/translation/stale-indicator.tsx`:
   - Warning element with `data-testid="stale-indicator"` and text containing "Source changed".
   - Re-translate button with `data-testid="retranslate-button"`.

### 5.11 Streaming Client Hook

1. Create `src/hooks/use-translation-stream.ts`:
   ```typescript
   export function useTranslationStream() {
     return {
       translateSection: (manualId: string, sectionId: string, targetLanguage: string) => void
       translateAll: (manualId: string, targetLanguage: string) => void
       streaming: boolean
       currentSectionId: string | null
       error: string | null
       cancel: () => void
     }
   }
   ```
   - Uses `EventSource` or `fetch` with `ReadableStream` to consume SSE.
   - Updates the Tiptap editor content in real-time as tokens arrive (typewriter effect).
   - On completion, triggers a revalidation of section translation status.

### 5.12 Integration with Side-by-Side Editor

1. Modify `src/app/(dashboard)/manuals/[manualId]/editor/translation-pane.tsx`:
   - Add translate button to the target pane header.
   - Show auto-translated badge per section.
   - Show stale indicator per section.
   - Approval button per section (clears badge).
   - While streaming, show a cancel button with `data-testid="cancel-translation-button"` and disable editing on the target field.

## 6. API Contracts

### POST /api/manuals/[manualId]/translate/estimate

**Auth:** Session with edit access to manual.

```typescript
// Request
type EstimateRequest = {
  sectionIds: string[] // empty = all translatable sections
  targetLanguage: string
}

// Response 200
type EstimateResponse = {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedCost: number // USD
  sectionCount: number
}
```

### POST /api/manuals/[manualId]/translate

**Auth:** Session with edit access to manual.

```typescript
// Request
type TranslateSectionRequest = {
  sectionId: string
  targetLanguage: string
}

// Response: SSE stream
// Events:
// data: { "text": "translated chunk" }
// data: { "done": true, "translationId": "cuid" }
// data: { "error": "message" }
```

### POST /api/manuals/[manualId]/translate/all

**Auth:** Session with edit access to manual.

```typescript
// Request
type TranslateAllRequest = {
  targetLanguage: string
}

// Response: SSE stream
// Events:
// data: { "sectionId": "id", "status": "start" }
// data: { "sectionId": "id", "status": "chunk", "text": "translated chunk" }
// data: { "sectionId": "id", "status": "done" }
// data: { "sectionId": "id", "status": "error", "error": "message" }
// data: { "done": true, "translated": 4, "failed": 1 }
```

### Server Actions

```typescript
// src/app/(dashboard)/manuals/[manualId]/actions/translation.ts
"use server"
async function approveTranslation(sectionId: string, languageCode: string): Promise<{ success: boolean }>
async function unapproveTranslation(sectionId: string, languageCode: string): Promise<{ success: boolean }>
```

## 7. Data Model

```prisma
model SectionTranslation {
  id              String    @id @default(cuid())
  sectionId       String
  languageCode    String
  content         Json
  autoTranslated  Boolean   @default(false)
  approved        Boolean   @default(false)
  stale           Boolean   @default(false)
  sourceHash      String?
  translatedAt    DateTime?
  approvedAt      DateTime?
  approvedBy      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  section         Section   @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  approver        User?     @relation(fields: [approvedBy], references: [id])

  @@unique([sectionId, languageCode])
  @@index([sectionId])
  @@index([languageCode])
  @@index([autoTranslated, approved])
}
```

## 8. Acceptance Criteria

| # | Criterion | Given / When / Then | Type | Test File |
|---|-----------|---------------------|------|-----------|
| AC-1 | Single-section auto-translation | Given a manual with English source and German target language added, when the user clicks the button `[data-testid="translate-button"]` and selects `[data-testid="translate-section-option"]` on a section, and confirms in the dialog, then the target language text field for that section contains non-empty translated text and the SSE stream completes with a `{ "done": true }` event | e2e | `translation.spec.ts` |
| AC-2 | Full-manual auto-translation | Given a manual with 3+ translatable sections and a target language, when the user clicks `[data-testid="translate-button"]` and selects `[data-testid="translate-all-option"]` and confirms, then each section's target language field contains non-empty translated text | e2e | `translation.spec.ts` |
| AC-3 | Confirmation dialog with token estimate | Given the user clicks translate on a section, when the confirmation dialog `[data-testid="translate-confirm-dialog"]` appears, then `[data-testid="token-estimate"]` displays a number greater than 0 and `[data-testid="cost-estimate"]` displays a USD value (matching pattern `$X.XX`) | e2e | `translation.spec.ts` |
| AC-4 | Streaming output into editor | Given a translation is confirmed, when the SSE stream emits chunks, then the target text field's content length increases over multiple Playwright `waitForFunction` checks (at least 2 intermediate states observed before final) | e2e | `translation.spec.ts` |
| AC-5 | Auto-translated badge displayed | Given a section has been auto-translated and not yet approved, when the user views the translation editor, then `[data-testid="auto-translated-badge"]` is visible on that section with text content "Auto-translated" | e2e | `translation.spec.ts` |
| AC-6 | Approve removes badge | Given a section displays `[data-testid="auto-translated-badge"]`, when the user clicks `[data-testid="approve-translation-button"]`, then `[data-testid="auto-translated-badge"]` is no longer present in the DOM for that section | e2e | `translation.spec.ts` |
| AC-7 | Stale detection on source change | Given a section has been translated (with a stored `sourceHash`), when the source content is modified and saved (producing a different hash), then the `SectionTranslation` record for that section has `stale` set to `true` | integration | `stale-detection.test.ts` |
| AC-8 | Product name excluded from translation | Given a manual with a product name "Widget Pro X", when auto-translation is triggered for all content fields, then the product name field in the target language record remains "Widget Pro X" (unchanged) | integration | `translation-service.test.ts` |
| AC-9 | Partial failure with retry | Given a "Translate all" operation where the mock API returns an error for section 2 of 3, when translation completes, then sections 1 and 3 have translated content, section 2 shows an element `[data-testid="translation-error"]` containing text "Error", and a `[data-testid="retry-translation-button"]` is visible for section 2 | e2e | `translation.spec.ts` |
| AC-10 | Glossary included in translation request | Given 2 approved translations exist for the same manual and target language, when `extractGlossary(manualId, targetLanguage)` is called, then it returns an array of `GlossaryEntry` objects with length > 0 and each entry has non-empty `source` and `target` strings | unit | `glossary.test.ts` |
| AC-11 | API key from environment variable | Given `OPENAI_API_KEY` is set in `process.env`, when `getTranslationProvider()` is called, then the returned provider's underlying client uses the value from `process.env.OPENAI_API_KEY` | unit | `openai.test.ts` |
| AC-12 | Provider interface abstraction | Given the `TranslationProvider` interface defines `translate()` returning `AsyncIterable<string>` and `estimateTokens()` returning `number`, when the OpenAI provider is instantiated, then it implements both methods and `translate()` yields string chunks | unit | `translation-service.test.ts` |
| AC-13 | Integration with side-by-side editor | Given the user is on `/manuals/[manualId]/edit` in translation mode (side-by-side view from Epic 7), when a section is auto-translated, then the translated text appears in the right pane's editor field for that section | e2e | `translation.spec.ts` |
| AC-14 | Stale indicator in UI | Given a section was previously translated and the source content has since changed (stale=true), when the user views the translation editor, then `[data-testid="stale-indicator"]` is visible with text containing "Source changed" and `[data-testid="retranslate-button"]` is visible | e2e | `translation.spec.ts` |
| AC-15 | Cancel stops translation | Given a translation is actively streaming, when the user clicks `[data-testid="cancel-translation-button"]`, then no further text chunks are appended to the target field (content length stabilizes within 2 seconds) | e2e | `translation.spec.ts` |

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/translation.spec.ts`

**Setup:** Seed database with a manual containing English source content (product name: "Widget Pro X", 3+ sections with overview, instructions, and warnings), German target language added via Epic 7. Mock OpenAI API responses using a deterministic mock provider that returns predictable translated strings in multiple chunks. Login as editor with manual access. Navigate to `/manuals/[manualId]/edit`.

**Tests:**

1. **Single-section translate flow (AC-1, AC-3, AC-4):**
   - Click `[data-testid="translate-button"]` on section 1.
   - Select `[data-testid="translate-section-option"]`.
   - Assert `[data-testid="translate-confirm-dialog"]` is visible.
   - Assert `[data-testid="token-estimate"]` contains a number > 0.
   - Assert `[data-testid="cost-estimate"]` text matches `/\$\d+\.\d{2}/`.
   - Click `[data-testid="translate-confirm-button"]`.
   - Use `page.waitForFunction` to assert the target text field content length increases across at least 2 checks (streaming).
   - Assert final target field content is non-empty and matches the mock's expected output.

2. **Auto-translated badge and approval (AC-5, AC-6):**
   - After translation completes on a section, assert `[data-testid="auto-translated-badge"]` is visible with text "Auto-translated".
   - Click `[data-testid="approve-translation-button"]`.
   - Assert `[data-testid="auto-translated-badge"]` is not visible (removed from DOM).

3. **Translate all sections (AC-2):**
   - Click `[data-testid="translate-button"]`, then `[data-testid="translate-all-option"]`.
   - Confirm in dialog.
   - After completion, assert each section's target language field contains non-empty text.

4. **Partial failure with retry (AC-9):**
   - Configure mock to fail on section 2.
   - Trigger "Translate all" and confirm.
   - Assert sections 1 and 3 have translated content.
   - Assert `[data-testid="translation-error"]` is visible for section 2.
   - Assert `[data-testid="retry-translation-button"]` is visible for section 2.
   - Click retry, assert section 2 now has translated content.

5. **Side-by-side editor integration (AC-13):**
   - Switch to translation mode (side-by-side view).
   - Trigger section translation.
   - Assert translated text appears in the right pane editor field.

6. **Stale indicator (AC-14):**
   - Translate a section, then modify the source content and save.
   - Assert `[data-testid="stale-indicator"]` is visible with text containing "Source changed".
   - Assert `[data-testid="retranslate-button"]` is visible.
   - Click `[data-testid="retranslate-button"]`, confirm, assert new translation appears and stale indicator is removed.

7. **Cancel translation (AC-15):**
   - Start a section translation (configure mock with slow chunk emission).
   - While streaming, click `[data-testid="cancel-translation-button"]`.
   - Record content length at cancel time, wait 2 seconds, assert content length has not increased.

### Unit Tests (Vitest)

#### `tests/unit/glossary.test.ts`
- `extractGlossary()` with 2 approved translations returns entries with non-empty `source` and `target` (AC-10).
- `extractGlossary()` with no approved translations returns empty array (AC-10).
- `extractGlossary()` with 100+ terms returns at most 50 entries (AC-10).

#### `tests/unit/translation-service.test.ts`
- OpenAI provider implements `TranslationProvider` interface: `translate()` returns `AsyncIterable<string>`, `estimateTokens()` returns `number` (AC-12).
- `estimateTokens("hello world")` returns a number > 0 (AC-3).
- Provider reads API key from `process.env.OPENAI_API_KEY` (AC-11).

#### `tests/unit/openai.test.ts`
- OpenAI client is initialized; `process.env.OPENAI_API_KEY` is read during construction (AC-11).

### Integration Tests (Vitest)

#### `tests/integration/stale-detection.test.ts`
**Setup:** Test database with manual, sections, and existing translations with `sourceHash`.

- Save source content, translate, modify source content with different text, call `markStaleTranslations()` -- assert `SectionTranslation.stale === true` (AC-7).
- Translate again after stale -- assert `stale` is reset to `false` and `sourceHash` is updated (AC-7).

#### `tests/integration/translation-service.test.ts`
- Translation request for a manual skips product name field; only overview, instructions, and warnings are sent to the provider (AC-8).
- After auto-translation completes, `SectionTranslation` record has `autoTranslated: true`, `approved: false` (AC-5).
- After calling `approveTranslation()`, record has `approved: true`, `approvedAt` is a valid date, `approvedBy` matches the session user ID (AC-6).

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-8_spec.md`

**Pages/routes to verify:**
- `/manuals/[manualId]/edit` — translation editor (side-by-side view)

**Key UX checkpoints (all verifiable via Playwright assertions):**
- `[data-testid="translate-button"]` is visible and clickable in the translation pane toolbar.
- `[data-testid="translate-confirm-dialog"]` renders with `[data-testid="token-estimate"]` and `[data-testid="cost-estimate"]` containing valid values.
- During streaming, target field text content length increases over time (verified via `waitForFunction`).
- `[data-testid="auto-translated-badge"]` has text content "Auto-translated" and is a child of the relevant section container.
- `[data-testid="stale-indicator"]` has text containing "Source changed" and is visible when `stale === true`.
- `[data-testid="approve-translation-button"]` is a sibling or close descendant of `[data-testid="auto-translated-badge"]`.
- `[data-testid="retry-translation-button"]` is visible adjacent to `[data-testid="translation-error"]`.
- `[data-testid="cancel-translation-button"]` is visible only while a translation is actively streaming.
- Translation controls render within the side-by-side layout from Epic 7 (right pane contains target language editor fields).

**Expected E2E test coverage:** AC-1 through AC-6, AC-9, AC-13, AC-14, AC-15.

## 11. Out of Scope

- Custom translation providers beyond OpenAI (service layer is ready, but only OpenAI implemented)
- Translation memory database (using glossary extraction from approved translations instead)
- Batch translation of multiple manuals at once
- Translation cost budgets or quotas per user
- RTL language rendering (deferred per Epic 7)
- Offline translation / local models
- Admin-level translation management dashboard
