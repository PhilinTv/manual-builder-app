# Automated PDF Parsing (Import) — Spec

## 1. Goal

Enable users to upload an existing PDF manual and have the system extract structured data (product name, TOC, overview, instructions, danger warnings) using LLM-based parsing, then review and correct the extraction in a side-by-side view before creating a new manual.

## 2. Dependencies

- **Epic 2** — Manual CRUD (manual data model, create manual flow, sections, danger warnings)
- **Epic 1** — Auth & user management (session, roles, access control)

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF text extraction | `pdf-parse` (npm) | Lightweight, extracts text from PDF without OCR |
| Structure extraction | Claude API (Anthropic) | Best at understanding document structure, handles ambiguous layouts |
| Danger warning detection | Keyword matching (regex) | Well-defined labels (WARNING, DANGER, CAUTION, ATTENTION) don't need LLM |
| Language detection | `franc` (npm) | Lightweight, offline language detection from text |
| File upload | Next.js API route with `formData` | Native form handling, streaming upload |
| Async processing | Database-backed job with polling | Simple, no message queue needed for MVP |
| PDF viewer in review | PDF.js (reuse from Epic 10) or `<iframe>` | Show original PDF for side-by-side comparison |

## 4. Implementation Tasks

### 4.1 Dependencies Setup

1. Install packages in `apps/web`:
   ```bash
   pnpm --filter web add pdf-parse franc @anthropic-ai/sdk
   pnpm --filter web add -D @types/pdf-parse
   ```
2. Add `ANTHROPIC_API_KEY` to `.env.example`.

### 4.2 Prisma Schema — Import Job Model

1. Add to `packages/db/prisma/schema.prisma`:
   ```prisma
   enum ImportStatus {
     UPLOADING
     EXTRACTING
     READY_FOR_REVIEW
     COMPLETED
     FAILED
   }

   model PdfImport {
     id              String       @id @default(cuid())
     userId          String
     status          ImportStatus @default(UPLOADING)
     sourceFilename  String
     fileSize        Int
     filePath        String       // temp storage path
     rawText         String?      @db.Text
     extractedData   Json?        // structured extraction result
     confidence      Json?        // per-field confidence scores
     detectedLanguage String?
     errorMessage    String?
     retryCount      Int          @default(0)
     manualId        String?      // set when import is confirmed and manual created
     createdAt       DateTime     @default(now())
     updatedAt       DateTime     @updatedAt

     user            User         @relation(fields: [userId], references: [id])
     manual          Manual?      @relation(fields: [manualId], references: [id])

     @@index([userId])
     @@index([status])
   }
   ```
2. Run `pnpm --filter db migrate:dev --name add-pdf-import`.

### 4.3 PDF Text Extraction Service

1. Create `src/services/import/extract-text.ts`:
   ```typescript
   import pdf from "pdf-parse"

   export async function extractTextFromPdf(
     buffer: Buffer
   ): Promise<{ text: string; pageCount: number }> {
     const data = await pdf(buffer)
     return { text: data.text, pageCount: data.numpages }
   }
   ```
   - Returns raw text and page count.
   - If `text.length < 100`, set a flag for scanned PDF warning.

### 4.4 Danger Warning Keyword Detection

1. Create `src/services/import/detect-warnings.ts`:
   ```typescript
   export interface DetectedWarning {
     keyword: string         // DANGER | WARNING | CAUTION | ATTENTION
     severity: "DANGER" | "WARNING" | "CAUTION"
     text: string            // surrounding context
     confidence: number      // 0-1
   }

   export function detectDangerWarnings(text: string): DetectedWarning[]
   ```
   - Regex patterns for `WARNING`, `DANGER`, `CAUTION`, `ATTENTION` (case-insensitive).
   - Map `ATTENTION` to `CAUTION` severity.
   - Extract surrounding paragraph as warning text.
   - Confidence: 0.9 for exact keyword match with structured context, 0.6 for keyword in flowing text.

### 4.5 LLM Structure Extraction

1. Create `src/services/import/llm-extract.ts`:
   ```typescript
   export interface ExtractedManualData {
     productName: string
     overview: string
     instructions: { title: string; body: string }[]
     tableOfContents: string[]
     confidence: {
       productName: number
       overview: number
       instructions: number
       tableOfContents: number
     }
   }

   export async function extractStructure(
     text: string
   ): Promise<ExtractedManualData>
   ```
   - Uses Claude API with structured prompt:
     ```
     Extract the following from this product manual text:
     1. Product name
     2. Product overview/description
     3. Feature instructions (as ordered list of title + body)
     4. Table of contents entries

     Return as JSON. For each field, rate your confidence (0.0-1.0).
     ```
   - Parse JSON response, validate schema.
   - Retry up to 3 times on transient errors (rate limit, timeout).

### 4.6 Language Detection

1. Create `src/services/import/detect-language.ts`:
   ```typescript
   import { franc } from "franc"

   export function detectLanguage(text: string): {
     code: string    // ISO 639-1
     name: string
     confidence: number
   }
   ```
   - Use `franc` to detect language from first 1000 characters of extracted text.
   - Map ISO 639-3 output to ISO 639-1 code.
   - Return confidence based on `franc` score.

### 4.7 Import Processing Pipeline

1. Create `src/services/import/pipeline.ts`:
   ```typescript
   export async function processImport(importId: string): Promise<void>
   ```
   - Step 1: Read file from temp storage.
   - Step 2: Extract text (`extractTextFromPdf`).
   - Step 3: Detect language (`detectLanguage`).
   - Step 4: Extract structure via LLM (`extractStructure`).
   - Step 5: Detect warnings via keywords (`detectDangerWarnings`).
   - Step 6: Merge results, compute per-field confidence.
   - Step 7: Update `PdfImport` record: set `extractedData`, `confidence`, `detectedLanguage`, status `READY_FOR_REVIEW`.
   - On error: increment `retryCount`, if < 3 retry, else set status `FAILED` with `errorMessage`.

### 4.8 Upload API Route

1. Create `src/app/api/imports/upload/route.ts`:
   ```typescript
   export async function POST(req: Request) {
     const session = await getRequiredSession()

     // Check for existing in-progress import
     const existing = await prisma.pdfImport.findFirst({
       where: {
         userId: session.user.id,
         status: { in: ["UPLOADING", "EXTRACTING"] },
       },
     })
     if (existing) {
       return Response.json(
         { error: "Import already in progress" },
         { status: 409 }
       )
     }

     const formData = await req.formData()
     const file = formData.get("file") as File

     // Validate type and size
     if (file.type !== "application/pdf") {
       return Response.json({ error: "Only PDF files are accepted" }, { status: 400 })
     }
     if (file.size > 10 * 1024 * 1024) {
       return Response.json({ error: "File size exceeds 10 MB limit" }, { status: 400 })
     }

     // Save file to temp storage
     const buffer = Buffer.from(await file.arrayBuffer())
     const filePath = path.join(UPLOAD_DIR, `${cuid()}.pdf`)
     await fs.writeFile(filePath, buffer)

     // Create import record
     const importRecord = await prisma.pdfImport.create({
       data: {
         userId: session.user.id,
         status: "EXTRACTING",
         sourceFilename: file.name,
         fileSize: file.size,
         filePath,
       },
     })

     // Trigger async processing (non-blocking)
     processImport(importRecord.id).catch(console.error)

     return Response.json({ importId: importRecord.id }, { status: 201 })
   }
   ```

### 4.9 Import Status Polling API

1. Create `src/app/api/imports/[importId]/route.ts`:
   - `GET` — returns current import status, extracted data (if ready), confidence scores.
   - Auth: only the import owner can access.

### 4.10 Import Confirmation API

1. Create `src/app/api/imports/[importId]/confirm/route.ts`:
   ```typescript
   export async function POST(req: Request, { params }: { params: { importId: string } }) {
     const session = await getRequiredSession()
     const body = await req.json() as ConfirmImportRequest

     // Create manual from reviewed/corrected data
     const manual = await createManualFromImport(
       params.importId,
       body.data,
       body.language,
       session.user.id
     )

     return Response.json({ manualId: manual.id }, { status: 201 })
   }
   ```
2. Create `src/services/import/create-manual.ts`:
   ```typescript
   export async function createManualFromImport(
     importId: string,
     data: ReviewedManualData,
     language: string,
     userId: string
   ): Promise<Manual>
   ```
   - Creates a new Manual with sections from the reviewed data.
   - Sets import `status: COMPLETED`, links `manualId`.
   - Cleans up temp file.

### 4.11 Discard Import API

1. Create `src/app/api/imports/[importId]/discard/route.ts`:
   - `POST` — deletes import record and temp file.
   - Auth: only the import owner.

### 4.12 Retry Import API

1. Add to `src/app/api/imports/[importId]/route.ts`:
   - `POST` — re-triggers `processImport()` for failed imports.
   - Resets status to `EXTRACTING`, clears error.

### 4.13 Import Entry Point UI

1. Modify `src/app/(dashboard)/manuals/page.tsx` (manual list):
   - "Create Manual" button opens a dialog with two options:
     - "Create from scratch" — existing flow (Epic 2).
     - "Import from PDF" — opens upload flow.
   - If pending import exists, show badge/indicator on the list page.

2. Create `src/components/import/create-manual-dialog.tsx`:
   - Two-option card layout: "Blank Manual" and "Import from PDF".

### 4.14 Upload UI Component

1. Create `src/components/import/upload-zone.tsx`:
   ```typescript
   interface UploadZoneProps {
     onUploadComplete: (importId: string) => void
     onError: (error: string) => void
   }
   ```
   - Drag-and-drop zone with file picker fallback.
   - File type validation (`.pdf` only) and size validation (10 MB max) on client side.
   - Determinate progress bar during upload (using `XMLHttpRequest` for progress events).
   - `beforeunload` event listener during upload to warn on navigation.
   - Cancel button stops the upload.

### 4.15 Processing Status Component

1. Create `src/components/import/processing-status.tsx`:
   - Polls `GET /api/imports/[importId]` every 2 seconds.
   - Shows spinner with "Extracting content..." message.
   - On completion: redirects to review page.
   - On error: shows error message with "Try Again" button.

### 4.16 Review Page

1. Create `src/app/(dashboard)/imports/[importId]/review/page.tsx`:
   - Auth: only import owner can access.
   - Fetches import data including `extractedData` and `confidence`.

2. **Desktop layout** — side-by-side:
   - Left panel: original PDF rendered in an iframe or PDF.js viewer.
   - Right panel: extracted fields as editable form.

3. **Mobile layout** — stacked:
   - Top: PDF viewer (collapsible).
   - Bottom: extracted fields form.

4. Create `src/components/import/review-form.tsx`:
   - Fields: product name (text input), language (dropdown, pre-selected), overview (Tiptap editor), instructions (ordered list of title + body blocks), danger warnings (list with severity selector).
   - Each field has a confidence indicator:
     - Green (>= 0.8): high confidence
     - Yellow (0.5-0.8): medium confidence
     - Red (< 0.5): low confidence
   - User can edit any field.
   - "Confirm & Create Manual" button at bottom.
   - "Discard Import" button (secondary, with confirmation dialog).

5. Create `src/components/import/confidence-badge.tsx`:
   - Color-coded badge component showing confidence level.

### 4.17 Scanned PDF Warning

1. In `review-form.tsx`:
   - If extracted text is minimal (< 100 chars), show a warning banner:
     "This PDF appears to be scanned/image-based. Extracted content may be incomplete."
   - User can still proceed with whatever was extracted.

### 4.18 Import Notification

1. Create `src/components/import/import-notification.tsx`:
   - Toast notification when import processing completes.
   - Triggered when polling detects `READY_FOR_REVIEW` status.
2. Modify manual list page:
   - Show a badge/banner if the user has a pending import ready for review.
   - Link to the review page.

## 5. API Contracts

### POST /api/imports/upload

**Auth:** Authenticated user.

```typescript
// Request: multipart/form-data
// Field: "file" — PDF file (max 10 MB)

// Response 201
type UploadResponse = {
  importId: string
}

// Response 400 — invalid file type or size
// Response 409 — import already in progress
```

### GET /api/imports/[importId]

**Auth:** Import owner only.

```typescript
// Response 200
type ImportStatusResponse = {
  id: string
  status: "UPLOADING" | "EXTRACTING" | "READY_FOR_REVIEW" | "COMPLETED" | "FAILED"
  sourceFilename: string
  extractedData: {
    productName: string
    overview: string
    instructions: { title: string; body: string }[]
    warnings: { keyword: string; severity: string; text: string }[]
    tableOfContents: string[]
  } | null
  confidence: {
    productName: number
    overview: number
    instructions: number
    tableOfContents: number
    warnings: number
  } | null
  detectedLanguage: string | null
  errorMessage: string | null
  createdAt: string
}

// Response 404 — import not found or not owned by user
```

### POST /api/imports/[importId]/confirm

**Auth:** Import owner only.

```typescript
// Request
type ConfirmImportRequest = {
  data: {
    productName: string
    overview: Json         // Tiptap JSON
    instructions: { title: string; body: Json }[]
    warnings: { title: string; description: string; severity: "DANGER" | "WARNING" | "CAUTION" }[]
  }
  language: string        // ISO 639-1 code
}

// Response 201
type ConfirmImportResponse = {
  manualId: string
}

// Response 400 — validation error
// Response 404 — import not found
// Response 409 — import already completed
```

### POST /api/imports/[importId]/discard

**Auth:** Import owner only.

```typescript
// Response 200
type DiscardResponse = { success: true }

// Response 404 — import not found
```

### POST /api/imports/[importId]/retry

**Auth:** Import owner only.

```typescript
// Response 200
type RetryResponse = { importId: string }

// Response 400 — import not in FAILED status
```

## 6. Data Model

```prisma
enum ImportStatus {
  UPLOADING
  EXTRACTING
  READY_FOR_REVIEW
  COMPLETED
  FAILED
}

model PdfImport {
  id              String       @id @default(cuid())
  userId          String
  status          ImportStatus @default(UPLOADING)
  sourceFilename  String
  fileSize        Int
  filePath        String
  rawText         String?      @db.Text
  extractedData   Json?
  confidence      Json?
  detectedLanguage String?
  errorMessage    String?
  retryCount      Int          @default(0)
  manualId        String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  user            User         @relation(fields: [userId], references: [id])
  manual          Manual?      @relation(fields: [manualId], references: [id])

  @@index([userId])
  @@index([status])
}
```

## 7. Acceptance Criteria

| # | Criterion | Type | Test |
|---|-----------|------|------|
| AC-1 | Given an authenticated user on the upload page, when they upload a valid PDF file (< 10 MB, `.pdf` type), then the API responds with 201 and an `importId`, and the UI shows a processing indicator with text "Extracting content..." | e2e | `pdf-import.spec.ts`: upload valid PDF, assert HTTP 201, assert element with text "Extracting content..." is visible |
| AC-2 | Given an authenticated user on the upload page, when they attempt to upload a non-PDF file (e.g. `.txt`), then the upload is rejected and an error message containing "Only PDF files are accepted" is visible | e2e | `pdf-import.spec.ts`: select `.txt` file, assert error text "Only PDF files are accepted" visible on page |
| AC-3 | Given an authenticated user on the upload page, when they attempt to upload a PDF larger than 10 MB, then the upload is rejected and an error message containing "10 MB" is visible | e2e | `pdf-import.spec.ts`: select oversized file, assert error text containing "10 MB" visible on page |
| AC-4 | Given an authenticated user on the manual list page (`/manuals`), when they click the "Create Manual" button, then a dialog appears containing both a "Create from scratch" option and an "Import from PDF" option | e2e | `pdf-import.spec.ts`: click "Create Manual" button, assert dialog contains text "Import from PDF" and "Create from scratch" |
| AC-5 | Given a user has uploaded a PDF and extraction is processing, when extraction completes, then a toast notification containing the source filename appears, and the user is redirected to the review page at `/imports/[importId]/review` | e2e | `pdf-import.spec.ts`: upload PDF (with mocked LLM), wait for toast element to appear, assert URL matches `/imports/.*/review` |
| AC-6 | Given an import with status `READY_FOR_REVIEW`, when the user navigates to `/imports/[importId]/review` on desktop viewport (>=1024px), then the page displays a PDF viewer element (`[data-testid="pdf-viewer"]`) on the left and an editable form (`[data-testid="review-form"]`) on the right, and each extracted field has an adjacent confidence badge element (`[data-testid="confidence-badge"]`) with a `data-level` attribute of `high`, `medium`, or `low` | e2e | `pdf-import.spec.ts`: navigate to review page at desktop viewport, assert `[data-testid="pdf-viewer"]` and `[data-testid="review-form"]` are visible, assert at least one `[data-testid="confidence-badge"]` exists |
| AC-7 | Given the user is on the review page, when they clear the product name input and type a new value, then the input reflects the new value; when they edit an instruction title, then that input also reflects the new value | e2e | `pdf-import.spec.ts`: clear and fill product name input, assert its value matches; clear and fill first instruction title, assert its value matches |
| AC-8 | Given an English-language PDF was imported, when the user views the review page, then the language dropdown (`[data-testid="language-select"]`) has "English" (or "en") pre-selected | e2e | `pdf-import.spec.ts`: upload English PDF, navigate to review, assert language select value is "en" or selected text is "English" |
| AC-9 | Given the user is on the review page with extracted data, when they click the "Confirm & Create Manual" button, then the API responds with 201 and a `manualId`, the browser redirects to the manual editor page, and the manual's product name matches the value from the review form | e2e | `pdf-import.spec.ts`: click "Confirm & Create Manual", assert URL changes to manual editor route, assert product name text on the new page matches the imported value |
| AC-10 | Given a scanned/image-based PDF with minimal extractable text (< 100 characters) was uploaded, when the user views the review page, then a warning banner containing text "scanned" or "image-based" is visible, and the "Confirm & Create Manual" button is still enabled | e2e | `pdf-import.spec.ts`: upload near-empty PDF, navigate to review, assert warning banner with text matching /scanned|image-based/ is visible, assert confirm button is not disabled |
| AC-11 | Given a mobile viewport (375x667), when the user navigates to the review page, then the layout is stacked: the PDF viewer appears above the form (PDF viewer's bounding box top is less than the form's bounding box top) | e2e | `pdf-import.spec.ts`: set viewport to 375x667, navigate to review, assert `[data-testid="pdf-viewer"]` boundingBox.y < `[data-testid="review-form"]` boundingBox.y |
| AC-12 | Given the LLM extraction fails 3 times for an import, when the user views the processing status, then the UI displays an error message element (`[data-testid="import-error"]`) and a "Try Again" button (`[data-testid="retry-button"]`) | e2e | `pdf-import.spec.ts`: upload PDF with LLM mock set to fail, wait for error state, assert `[data-testid="import-error"]` is visible, assert `[data-testid="retry-button"]` is visible |
| AC-13 | Given a user is uploading a PDF, when the upload is in progress, then a progress bar element (`[role="progressbar"]`) with an `aria-valuenow` attribute greater than 0 is visible | e2e | `pdf-import.spec.ts`: upload large PDF, assert `[role="progressbar"]` element is visible with `aria-valuenow` > 0 |
| AC-14 | Given a user has started uploading a PDF, when they click the "Cancel" button, then the upload stops and no import record with status `EXTRACTING` exists for that user (verified via API call returning 0 active imports) | e2e | `pdf-import.spec.ts`: start upload, click cancel button, assert upload zone is shown again (no processing spinner) |
| AC-15 | Given the user is on the review page, when they click "Discard Import" and confirm the dialog, then they are redirected to `/manuals` and the import record is deleted (GET `/api/imports/[importId]` returns 404) | e2e | `pdf-import.spec.ts`: on review page, click "Discard Import", confirm dialog, assert URL is `/manuals`, assert API GET for the import returns 404 |
| AC-16 | Given a user has an import with status `EXTRACTING`, when they attempt to upload another PDF, then the API responds with 409 and the UI displays an error message containing "Import already in progress" | e2e | `pdf-import.spec.ts`: upload first PDF, while processing attempt second upload, assert error text "Import already in progress" is visible |
| AC-17 | Given a mobile viewport (375x667), when the user performs the full import flow (upload, review, confirm), then a new manual is created successfully (URL ends at manual editor route) | e2e | `pdf-import.spec.ts`: mobile viewport, upload PDF, wait for review page, fill fields, confirm, assert URL matches manual editor route |
| AC-18 | Given a user has a pending import with status `READY_FOR_REVIEW`, when they visit the `/manuals` page, then a badge or banner element (`[data-testid="import-pending-badge"]`) linking to the review page is visible | e2e | `pdf-import.spec.ts`: create import in `READY_FOR_REVIEW` state, visit `/manuals`, assert `[data-testid="import-pending-badge"]` is visible and contains a link to the review page |
| AC-19 | Given text containing "WARNING: Do not submerge in water", when `detectDangerWarnings()` is called, then it returns an array containing an object with `severity: "WARNING"` and `text` including "submerge" | unit | `detect-warnings.test.ts` |
| AC-20 | Given text containing "ATTENTION: Keep away from children", when `detectDangerWarnings()` is called, then it returns an object with `severity: "CAUTION"` (ATTENTION maps to CAUTION) | unit | `detect-warnings.test.ts` |
| AC-21 | Given text with no warning keywords, when `detectDangerWarnings()` is called, then it returns an empty array | unit | `detect-warnings.test.ts` |
| AC-22 | Given sample manual text, when `extractStructure()` is called (with mocked Claude API), then it returns an object with non-empty `productName`, `overview`, `instructions` array, and `tableOfContents` array, each with a numeric `confidence` value between 0 and 1 | integration | `llm-extract.test.ts` |
| AC-23 | Given the Claude API returns a transient error, when `extractStructure()` is called, then it retries up to 3 times before throwing | integration | `llm-extract.test.ts` |
| AC-24 | Given English text, when `detectLanguage()` is called, then it returns `{ code: "en" }` | unit | `detect-language.test.ts` |
| AC-25 | Given a valid PDF buffer, when `extractTextFromPdf()` is called, then it returns an object with a non-empty `text` string and a `pageCount` >= 1 | unit | `extract-text.test.ts` |
| AC-26 | Given a user clicks "Try Again" on a failed import (`[data-testid="retry-button"]`), when the retry API is called, then the import status resets to `EXTRACTING` and the processing indicator reappears | e2e | `pdf-import.spec.ts`: on failed import, click retry button, assert processing indicator is visible again |

## 8. TDD Approach

Tests should be written **before** or **alongside** implementation for each task. Follow this order:

1. **Unit tests first** (Tasks 4.3, 4.4, 4.6): Write tests for `extractTextFromPdf`, `detectDangerWarnings`, and `detectLanguage` before implementing the functions. These are pure/near-pure functions with clear inputs and outputs -- ideal for test-first development.
2. **Integration tests second** (Tasks 4.5, 4.7, 4.10): Write tests for `extractStructure` (with mocked Claude API) and the pipeline orchestration before wiring them together. Write tests for `createManualFromImport` against a test database.
3. **API route tests** (Tasks 4.8-4.12): Write request/response tests for each API endpoint before implementing route handlers. Assert status codes, response shapes, and auth guards.
4. **E2E tests last** (Tasks 4.13-4.18): Write Playwright tests for each user-facing flow. Use mocked LLM responses (via API intercept or test fixtures) to keep tests deterministic. Run against a seeded test database.

Each PR should include the relevant tests for the tasks it implements. No task is considered complete until its corresponding tests pass.

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/pdf-import.spec.ts`
**Setup:** Seed database with authenticated user. Prepare test PDF files (valid manual PDF, scanned/near-empty PDF, oversized 15 MB file, `.txt` file). Mock Claude API responses via API route intercept or test fixture so LLM calls return deterministic extracted data.

- Click "Create Manual" on `/manuals` page, assert dialog contains "Import from PDF" and "Create from scratch" options (AC-4)
- Select "Import from PDF", upload valid PDF, assert progress bar (`[role="progressbar"]`) visible (AC-1, AC-13)
- After upload completes, assert "Extracting content..." text visible (AC-1)
- After extraction completes, assert toast notification appears and URL matches `/imports/.*/review` (AC-5)
- Upload non-PDF file, assert error message "Only PDF files are accepted" visible (AC-2)
- Upload file > 10 MB, assert error message containing "10 MB" visible (AC-3)
- On review page (desktop >=1024px): assert `[data-testid="pdf-viewer"]` and `[data-testid="review-form"]` visible, assert confidence badges present (AC-6)
- Edit product name and instruction title in review form, assert input values update (AC-7)
- Assert language dropdown pre-selected to "en" or "English" for English PDF (AC-8)
- Click "Confirm & Create Manual", assert redirect to manual editor, assert product name matches (AC-9)
- Upload scanned PDF (minimal text), assert warning banner with /scanned|image-based/ text, assert confirm button enabled (AC-10)
- Mobile viewport (375x667): review page has stacked layout (PDF viewer above form) (AC-11)
- Mobile viewport: full flow -- upload, review, confirm, assert manual created (AC-17)
- Upload with LLM mock set to fail 3 times, assert `[data-testid="import-error"]` and `[data-testid="retry-button"]` visible (AC-12)
- Click "Try Again" on failed import, assert processing indicator reappears (AC-26)
- Start upload, click cancel, assert upload zone reappears (AC-14)
- On review page, click "Discard Import", confirm dialog, assert redirect to `/manuals`, assert GET import returns 404 (AC-15)
- Upload file while another is processing, assert "Import already in progress" error (AC-16)
- Seed import with `READY_FOR_REVIEW` status, visit `/manuals`, assert `[data-testid="import-pending-badge"]` visible with link (AC-18)

### Integration Tests (Vitest)

#### `tests/integration/llm-extract.test.ts`
**Setup:** Mock Claude API.

- `extractStructure()` returns product name, overview, instructions, TOC with confidence scores from sample text (AC-22)
- `extractStructure()` retries on transient API errors up to 3 times (AC-23)
- `extractStructure()` throws after 3 failed retries (AC-23)

#### `tests/integration/pipeline.test.ts`
**Setup:** Test database, mock Claude API, sample PDF buffer.

- Full pipeline: upload file, run pipeline, assert `PdfImport` record has status `READY_FOR_REVIEW` with non-null `extractedData` (AC-22)
- Pipeline sets `FAILED` status after 3 LLM retries exhausted (AC-23)
- `createManualFromImport()` creates Manual record with correct product name, sections, language, and links `manualId` on `PdfImport` (AC-9)

### Unit Tests (Vitest)

#### `tests/unit/detect-warnings.test.ts`
- Text containing "WARNING: Do not submerge" returns warning with severity `WARNING` (AC-19)
- Text containing "DANGER: High voltage" returns warning with severity `DANGER` (AC-19)
- Text containing "CAUTION: Handle with care" returns warning with severity `CAUTION` (AC-19)
- Text containing "ATTENTION: Keep away" maps to severity `CAUTION` (AC-20)
- Text without warning keywords returns empty array (AC-21)
- Multiple warnings in same text are all detected (AC-19)

#### `tests/unit/detect-language.test.ts`
- English text returns `{ code: "en", name: "English" }` (AC-24)
- German text returns `{ code: "de", name: "German" }` (AC-24)
- Very short text returns low confidence score (AC-24)

#### `tests/unit/extract-text.test.ts`
- Valid PDF buffer returns non-empty text string and pageCount >= 1 (AC-25)
- PDF with minimal text (< 100 chars) flags as potentially scanned (AC-10)

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-11_spec.md`

**Pages/routes to verify:**
- `/manuals` — manual list with "Create Manual" button and `[data-testid="import-pending-badge"]`
- Upload dialog/page — drag-and-drop zone with `[role="progressbar"]`
- `/imports/[importId]/review` — side-by-side review screen with `[data-testid="pdf-viewer"]`, `[data-testid="review-form"]`, `[data-testid="confidence-badge"]`

**Key UX checkpoints:**
- "Import from PDF" option is clearly presented alongside "Create from scratch" in the create dialog
- Drag-and-drop zone has clear visual affordance (dashed border, icon, text)
- Progress bar uses `[role="progressbar"]` with `aria-valuenow` for accessibility
- Processing state shows "Extracting content..." text
- Toast notification is visible when extraction completes
- Side-by-side review layout has `[data-testid="pdf-viewer"]` left and `[data-testid="review-form"]` right
- Confidence badges use `data-level` attribute (`high`/`medium`/`low`) with green/yellow/red styling
- Scanned PDF warning banner is prominent but does not disable the confirm button
- "Confirm & Create Manual" button is prominent; "Discard Import" is secondary/destructive styled
- Mobile stacked layout places PDF viewer above form
- "Discard Import" triggers a confirmation dialog before proceeding
- Failed imports show `[data-testid="import-error"]` with `[data-testid="retry-button"]`

**Expected E2E test coverage:** AC-1 through AC-18, AC-26 (all e2e-type criteria).

## 11. Out of Scope

- OCR for scanned/image-based PDFs (text extraction only)
- Merging imported content into existing manuals (always creates new)
- Batch import of multiple PDFs at once
- Custom field mapping rules or templates
- Import from file formats other than PDF (Word, HTML, etc.)
- Image extraction from PDFs
- Admin-level import monitoring dashboard
- Import history or audit log UI (metadata stored in DB for audit but no UI)
- Background job queue (using simple async processing with DB polling for MVP)
