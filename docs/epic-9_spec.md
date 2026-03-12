# PDF Export — Spec

## 1. Goal

Enable users to export a manual as a formatted PDF with title, auto-generated table of contents, sections, and styled danger warnings, rendered via headless browser from an HTML template and downloaded synchronously.

## 2. Dependencies

- **Epic 2** — Manual CRUD (manual data model, sections, danger warnings)
- **Epic 7** — Multi-language support (language selection for export)
- **Epic 1** — Auth & user management (session, access control)

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF generation | Puppeteer (headless Chromium) | High-fidelity CSS rendering, familiar web tech, `page.pdf()` API |
| HTML template | React server-side rendering to static HTML string | Reuse existing component patterns, type-safe templates |
| TOC generation | Two-pass render: first pass collects headings + page numbers, second pass injects TOC | Accurate page numbers require rendered layout |
| Danger warning icons | Inline SVG icons per severity | No external asset dependencies, works in PDF |
| Delivery | Synchronous streamed response | Simple UX for MVP, no background jobs |
| API pattern | API Route returning `application/pdf` | Binary response requires raw route handler |

## 4. Implementation Tasks

### 4.1 Puppeteer Setup

1. Install `puppeteer` in `apps/web`:
   ```bash
   pnpm --filter web add puppeteer
   ```
2. Create `src/lib/puppeteer.ts`:
   ```typescript
   import puppeteer, { Browser } from "puppeteer"

   let browser: Browser | null = null

   export async function getBrowser(): Promise<Browser> {
     if (!browser || !browser.connected) {
       browser = await puppeteer.launch({
         headless: true,
         args: ["--no-sandbox", "--disable-setuid-sandbox"],
       })
     }
     return browser
   }
   ```

### 4.2 PDF HTML Template

1. Create `src/services/pdf/template.tsx`:
   ```typescript
   export function renderManualToHtml(manual: ManualWithSections, language: string): string
   ```
   - Accepts full manual data for the selected language.
   - Returns a complete HTML document string with embedded CSS.
   - Sections rendered top-to-bottom: product name header, TOC placeholder, overview, feature instructions (numbered), danger warnings.
2. Create `src/services/pdf/styles.css`:
   - Typography: system font stack, 11pt body, 16pt headings.
   - Section hierarchy: H1 product name, H2 section titles, H3 instruction titles.
   - Page numbers via CSS `@page` rule with `counter(page)`.
   - Page breaks: `page-break-before: always` on major sections.
   - Danger warning cards: border-left colored by severity, inline SVG icon, bold label.

### 4.3 Danger Warning Styling

1. Create `src/services/pdf/warning-icons.ts`:
   - Export inline SVG strings for each severity level:
     - `DANGER` — red octagon with exclamation mark
     - `WARNING` — orange triangle with exclamation mark
     - `CAUTION` — yellow triangle with exclamation mark
   - B&W accessible: each severity uses a distinct icon shape plus a text label (not color alone).

### 4.4 Table of Contents Generation

1. Create `src/services/pdf/toc.ts`:
   ```typescript
   export async function generateTocHtml(page: Page): Promise<string>
   ```
   - After first render, query all heading elements from the page to collect:
     - Heading text
     - Heading level (H2, H3)
     - Page number (computed from element position relative to page height)
   - Return HTML string for TOC with anchor links and page numbers.
2. Two-pass rendering flow:
   - Pass 1: render HTML without TOC -> collect heading positions and page numbers.
   - Pass 2: inject generated TOC HTML -> render final PDF.

### 4.5 PDF Generation Service

1. Create `src/services/pdf/generate.ts`:
   ```typescript
   export async function generateManualPdf(
     manualId: string,
     language: string
   ): Promise<Buffer>
   ```
   - Load manual with all sections and translations for the specified language.
   - Call `renderManualToHtml()` to build HTML.
   - Launch Puppeteer page, set content, run two-pass TOC generation.
   - Call `page.pdf()` with options:
     ```typescript
     {
       format: "A4",
       margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
       printBackground: true,
       displayHeaderFooter: true,
       footerTemplate: '<div style="font-size:9px;width:100%;text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
     }
     ```
   - Return PDF buffer.

### 4.6 File Naming Utility

1. Create `src/services/pdf/filename.ts`:
   ```typescript
   export function generatePdfFilename(
     productName: string,
     language: string,
     version: number
   ): string
   ```
   - Sanitize product name (remove special chars, replace spaces with underscores).
   - Format: `ProductName_EN_v3.pdf`.

### 4.7 Export API Route

1. Create `src/app/api/manuals/[manualId]/export/pdf/route.ts`:
   ```typescript
   export async function GET(
     req: Request,
     { params }: { params: { manualId: string } }
   ) {
     const session = await getRequiredSession()
     const { searchParams } = new URL(req.url)
     const language = searchParams.get("language") || "en"

     // Verify read access to manual
     const manual = await getManualWithAccessCheck(params.manualId, session.user.id)

     const pdfBuffer = await generateManualPdf(params.manualId, language)
     const filename = generatePdfFilename(manual.productName, language, manual.version)

     return new Response(pdfBuffer, {
       headers: {
         "Content-Type": "application/pdf",
         "Content-Disposition": `attachment; filename="${filename}"`,
         "Content-Length": pdfBuffer.length.toString(),
       },
     })
   }
   ```

### 4.8 Export Button UI

1. Create `src/components/pdf/export-button.tsx`:
   - Button with download icon in the manual editor header toolbar (next to Publish/Preview).
   - The button must have `data-testid="export-pdf-button"`.
   - If manual has multiple languages, show a dropdown to select which language to export.
   - If single language, trigger export directly.
   - On click: show loading spinner on button, initiate fetch to export API, trigger browser download on response.
2. Create `src/components/pdf/language-select-dialog.tsx`:
   - Dialog listing available languages for the manual.
   - Each option shows language name and completeness status.
   - "Export" button triggers download for selected language.
   - The dialog must have `data-testid="language-select-dialog"`.

### 4.9 Download Client Hook

1. Create `src/hooks/use-pdf-export.ts`:
   ```typescript
   export function usePdfExport() {
     return {
       exportPdf: (manualId: string, language: string) => Promise<void>
       exporting: boolean
       error: string | null
     }
   }
   ```
   - Fetches from export API route.
   - Converts response to blob, creates object URL, triggers download via anchor click.
   - Handles errors (timeout, server error) with toast notification.

### 4.10 Editor Header Integration

1. Modify `src/app/(dashboard)/manuals/[manualId]/editor/header.tsx`:
   - Add `ExportButton` component to the toolbar, positioned after Publish button.
   - Pass manual ID and available languages as props.

## 5. API Contracts

### GET /api/manuals/[manualId]/export/pdf

**Auth:** Session with read access to manual.

Query params: `?language=en` (ISO 639-1 code, defaults to primary language)

```typescript
// Response 200
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="ProductName_EN_v3.pdf"
// Body: PDF binary

// Response 401 — not authenticated
// Response 403 — no read access to manual
// Response 404 — manual not found
// Response 400 — invalid language code or language not available for this manual
// Response 500 — PDF generation failed
```

## 6. Data Model

No new Prisma models required. PDF export reads from existing models:

```prisma
// Existing models used (from Epic 2 / Epic 7):
// - Manual (productName, version, sections, languages)
// - Section (type, order, content)
// - SectionTranslation (content per language)
// - DangerWarning (title, description, severity)
```

## 7. Acceptance Criteria

| # | Criterion | Given / When / Then |
|---|-----------|---------------------|
| AC-1 | Export button visible in editor toolbar | Given a user with read access is on `/manuals/[manualId]/edit`, when the page loads, then a button with `data-testid="export-pdf-button"` containing the text "Export PDF" is visible in the editor header toolbar. |
| AC-2 | PDF contains all manual sections | Given a manual with product name "TestProduct", an overview section, 3 feature instructions, 1 library danger warning, and 1 custom warning, when the export API `GET /api/manuals/[manualId]/export/pdf` is called, then the response has status 200, `Content-Type: application/pdf`, and the PDF text content contains the product name "TestProduct", the overview text, all 3 instruction titles, the library warning title, and the custom warning title. |
| AC-3 | PDF has page numbers in footer | Given a manual with enough content to span multiple pages, when the PDF is generated, then every page after page 1 contains a footer with the pattern `<pageNumber> / <totalPages>` (e.g., "2 / 5"). |
| AC-4 | Danger warnings display severity icon and text label | Given a manual with danger warnings of severity DANGER, WARNING, and CAUTION, when the PDF is generated, then each warning section in the rendered HTML contains an inline `<svg>` element and a text label matching its severity level ("DANGER", "WARNING", or "CAUTION"). |
| AC-5 | Custom warnings appear in exported PDF | Given a manual with one linked library warning titled "Electric shock" and one custom warning titled "Fragile parts" with severity CAUTION, when `GET /api/manuals/[manualId]/export/pdf` is called, then the PDF text content contains both "Electric shock" and "Fragile parts", and the custom warning section contains a text label "CAUTION". |
| AC-6 | TOC is auto-generated from section headings | Given a manual with sections titled "Overview", "Setup Instructions", and "Safety Warnings", when the PDF is generated, then the PDF contains a table of contents region listing "Overview", "Setup Instructions", and "Safety Warnings" with associated page numbers. |
| AC-7 | Language selection for multi-language manuals | Given a manual with English and German language variants, when the user clicks `[data-testid="export-pdf-button"]`, then a dialog with `data-testid="language-select-dialog"` appears listing "English" and "German" as options. When the user selects "German" and confirms, then a PDF is downloaded with "DE" in the filename. |
| AC-8 | Loading spinner during PDF generation | Given the user clicks "Export PDF" (or selects a language and confirms), when the export request is in progress, then the export button displays a spinner (an element with `role="status"` or `data-testid="export-spinner"` is visible). When the download completes, then the spinner is no longer visible. |
| AC-9 | PDF filename follows naming convention | Given a manual with product name "My Product", language "en", and version 3, when the PDF is exported, then the downloaded file is named `My_Product_EN_v3.pdf`. |
| AC-10 | Assigned editor can export PDF | Given a user with the Editor role who is assigned to a manual, when they navigate to `/manuals/[manualId]/edit`, then the `[data-testid="export-pdf-button"]` button is visible and clicking it results in a successful PDF download (HTTP 200 from the export API). |
| AC-11 | Admin can export any manual | Given a user with the Admin role, when they navigate to any manual at `/manuals/[manualId]/edit` and click `[data-testid="export-pdf-button"]`, then a PDF is downloaded successfully (HTTP 200 from the export API). |
| AC-12 | Unauthenticated user cannot export | Given no active session, when `GET /api/manuals/[manualId]/export/pdf` is called, then the response status is 401. |
| AC-13 | User without access cannot export | Given a user who is not assigned to a manual and is not an admin, when `GET /api/manuals/[manualId]/export/pdf` is called, then the response status is 403. |
| AC-14 | Invalid language returns 400 | Given a manual that only has English content, when `GET /api/manuals/[manualId]/export/pdf?language=xx` is called, then the response status is 400 and the body contains an error message indicating the language is not available. |
| AC-15 | Single-language manual exports directly | Given a manual with only one language (English), when the user clicks `[data-testid="export-pdf-button"]`, then the PDF download begins immediately without showing a language selection dialog. |
| AC-16 | Export works on mobile viewport | Given a mobile viewport (width 375px), when the user navigates to `/manuals/[manualId]/edit`, then `[data-testid="export-pdf-button"]` is visible and tappable, and clicking it initiates a PDF download. |
| AC-17 | PDF is a valid PDF file | Given any manual, when the export API returns a PDF buffer, then the first bytes of the response body are `%PDF` (the PDF magic bytes). |
| AC-18 | Error during export shows toast notification | Given the PDF generation fails (e.g., server error), when the user clicks "Export PDF", then a toast notification with `role="alert"` appears containing an error message. |

## 8. TDD Approach

All tests should be written before their corresponding implementation code. Follow this order:

1. **Unit tests first** -- Write tests for pure functions (`generatePdfFilename`, `renderManualToHtml`, `warning-icons`) before implementing them. These have no external dependencies and validate core logic.
2. **Integration tests second** -- Write tests for `generateManualPdf` that verify the full PDF generation pipeline (HTML rendering through Puppeteer to PDF buffer). Seed a test database, call the service, and assert on the output buffer.
3. **API route tests third** -- Write tests for the export API route covering auth (401/403), validation (400), success (200 with correct headers), and error (500) responses.
4. **E2E tests last** -- Write Playwright tests for the UI flow (button visibility, spinner, download, language selection, mobile viewport) before building the UI components.

Each implementation task in Section 4 should only begin after its corresponding test(s) are written and failing (red). Implement just enough code to make the tests pass (green), then refactor.

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/pdf-export.spec.ts`
**Setup:** Seed database with a published manual (English + German, 5 sections including overview, instructions, and warnings). Create an admin user and an assigned editor user.

| Test case | Covers |
|-----------|--------|
| Navigate to `/manuals/[manualId]/edit` as assigned editor, assert `[data-testid="export-pdf-button"]` is visible with text "Export PDF" | AC-1, AC-10 |
| Click `[data-testid="export-pdf-button"]`, assert `[data-testid="language-select-dialog"]` appears with "English" and "German" options | AC-7 |
| Select "German" in language dialog, confirm, assert `[role="status"]` or `[data-testid="export-spinner"]` appears, then assert download event fires with filename containing `_DE_` | AC-7, AC-8, AC-9 |
| Click `[data-testid="export-pdf-button"]` and select "English", assert downloaded filename matches `*_EN_v*.pdf` | AC-9 |
| Login as admin, navigate to manual editor, click export, assert download succeeds | AC-11 |
| Set viewport to 375x812, navigate to editor, assert `[data-testid="export-pdf-button"]` is visible, click it, assert download triggers | AC-16 |
| Seed a manual with only English, click export, assert download starts immediately (no language dialog shown) | AC-15 |
| Mock the export API to return 500, click export, assert a toast with `role="alert"` containing error text appears | AC-18 |

#### `tests/e2e/pdf-export-auth.spec.ts`
**Setup:** Seed database with a manual and multiple users.

| Test case | Covers |
|-----------|--------|
| Call `GET /api/manuals/[id]/export/pdf` without session, assert response status 401 | AC-12 |
| Login as unassigned editor, call export API, assert response status 403 | AC-13 |

### Integration Tests (Vitest)

#### `tests/integration/pdf-generate.test.ts`
**Setup:** Test database with a manual containing product name, overview, 3 instructions, 1 library danger warning, and 1 custom warning.

| Test case | Covers |
|-----------|--------|
| `generateManualPdf()` returns a Buffer whose first 5 bytes are `%PDF-` | AC-17 |
| Parse generated PDF text: contains product name "TestProduct" | AC-2 |
| Parse generated PDF text: contains all 3 instruction titles | AC-2 |
| Parse generated PDF text: contains the library warning title and the custom warning title | AC-2 |
| Parse generated PDF text: contains overview section text | AC-2 |
| Given a manual with both library and custom warnings, when PDF is exported, then both warning types appear in the PDF content | AC-5 |
| Parse generated PDF text: contains a TOC region listing all section headings | AC-6 |
| Generated PDF for a 20-section manual has buffer size < 5 MB | AC-17 |
| Call export API with `?language=xx` for a manual without that language: returns 400 | AC-14 |

#### `tests/integration/pdf-template.test.ts`
**Setup:** Manual data fixture.

| Test case | Covers |
|-----------|--------|
| `renderManualToHtml()` returns an HTML string containing an `<h1>` with the product name | AC-2 |
| Rendered HTML contains inline `<svg>` elements for each danger warning | AC-4 |
| Each warning section contains a text label matching its severity ("DANGER", "WARNING", "CAUTION") | AC-4 |
| Rendered HTML contains page number CSS (`@page` rule with `counter(page)`) | AC-3 |

### Unit Tests (Vitest)

#### `tests/unit/pdf-filename.test.ts`

| Test case | Covers |
|-----------|--------|
| `generatePdfFilename("My Product", "en", 3)` returns `My_Product_EN_v3.pdf` | AC-9 |
| Special characters in product name are stripped: `"A/B: Test!"` becomes `AB_Test` | AC-9 |
| Language code is uppercased: `"de"` becomes `DE` | AC-9 |
| Spaces are replaced with underscores | AC-9 |

#### `tests/unit/warning-icons.test.ts`

| Test case | Covers |
|-----------|--------|
| DANGER icon returns a string containing `<svg` and `octagon` or equivalent shape identifier | AC-4 |
| WARNING icon returns a string containing `<svg` and `triangle` or equivalent shape identifier | AC-4 |
| Each severity icon string is distinct from the others | AC-4 |

## 10. UX Verification

**Verification command:** `/playwright-test docs/epic-9_spec.md`

**Pages/routes to verify:**
- `/manuals/[manualId]/edit` — editor header with export button

**Key UX checkpoints:**
- Export button with `data-testid="export-pdf-button"` is visible in the editor toolbar (not hidden in a menu)
- Language selection dialog (`data-testid="language-select-dialog"`) shows language names and completeness indicators
- Loading spinner (`role="status"` or `data-testid="export-spinner"`) appears during generation
- Download triggers automatically on completion (no extra clicks needed)
- Error state shows a toast (`role="alert"`) with error message if generation fails
- On mobile (375px width), export button is visible and tappable
- Downloaded PDF opens correctly (valid `%PDF` header)

## 11. Out of Scope

- Branded headers, logos, or cover pages (basic functional layout only)
- Background job queue for large manuals (synchronous for MVP)
- Server-side PDF storage or export history tracking
- Batch export of multiple manuals
- Custom PDF templates or layout configuration
- Watermarks or DRM protection
- Image embedding in PDF (text-only content for now)
- Print-specific CSS for browser print dialog (separate from PDF export)
