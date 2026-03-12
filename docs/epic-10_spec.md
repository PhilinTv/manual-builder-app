# PDF Preview — Spec

## 1. Goal

Enable users to preview the PDF output in-browser before downloading. The preview uses a native browser `<iframe>` embed in a full-screen overlay, showing the latest saved version of the manual. On mobile, a "Download PDF" button replaces the embedded viewer.

## 2. Dependencies

- **Epic 9** — PDF export (PDF generation service, Puppeteer pipeline, HTML template)
- **Epic 2** — Manual CRUD (editor, manual data model)

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF viewer | Native browser `<iframe>` embed | Zero dependencies, uses browser's built-in PDF viewer with native scroll, zoom, and page controls |
| Preview container | Full-screen overlay/modal | Immersive viewing, clear context switch, easy exit |
| Content source | Latest saved version fetched by manual ID | Avoids unsaved-state serialization; user must save before previewing |
| Mobile experience | Download-only — "Download PDF" button | No second rendering pipeline; relies on device's native PDF viewer |
| Language in preview | Shows whichever language is selected in the editor | No language picker in the preview overlay |

## 4. Implementation Tasks

### 4.1 Preview API Route

1. Create `src/app/api/manuals/[manualId]/preview/pdf/route.ts`:
   ```typescript
   export async function GET(
     req: Request,
     { params }: { params: { manualId: string } }
   ) {
     const session = await getRequiredSession()
     const url = new URL(req.url)
     const language = url.searchParams.get("language") ?? "en"

     // Verify read access to manual
     const manual = await getManualWithAccessCheck(params.manualId, session.user.id)

     // Generate PDF from saved manual data (same pipeline as Epic 9 export)
     const pdfBuffer = await generateManualPdf(manual, language)

     return new Response(pdfBuffer, {
       headers: {
         "Content-Type": "application/pdf",
         "Content-Disposition": "inline",
         "Cache-Control": "no-store",
       },
     })
   }
   ```
   - Reuses Epic 9's `generateManualPdf()` — same pipeline, same output.
   - `Content-Disposition: inline` tells the browser to display rather than download.

### 4.2 Preview Overlay Component

1. Create `src/components/pdf/preview-overlay.tsx`:
   ```typescript
   interface PreviewOverlayProps {
     manualId: string
     currentLanguage: string
     onClose: () => void
   }
   ```
   - Full-screen overlay with semi-transparent backdrop.
   - Top toolbar: close button (X) and "Download PDF" button.
   - Body (desktop): `<iframe>` with `src` pointing to the preview API route (`/api/manuals/[manualId]/preview/pdf?language=...`).
   - Body (mobile, viewport < 768px): no iframe; shows a "Download PDF" button instead.
   - Close on Escape key or close button click.
   - Focus trap within overlay (accessibility).

2. Toolbar layout:
   ```
   [X Close]                              [Download PDF]
   ```

### 4.3 Preview Button UI

1. Create `src/components/pdf/preview-button.tsx`:
   - "Preview" button with eye icon in editor header toolbar.
   - Positioned before the "Export PDF" button.
   - On click: opens preview overlay, passing current manual ID and selected language.

### 4.4 Loading State

1. In `preview-overlay.tsx`:
   - Show a loading spinner centered in the overlay body while the `<iframe>` loads.
   - Listen for the iframe `load` event to hide the spinner and reveal the iframe.

### 4.5 Mobile Download Behavior

1. In `preview-overlay.tsx`:
   - Detect mobile viewport using `useMediaQuery` hook (threshold: 768px).
   - On mobile: render a centered "Download PDF" button instead of the iframe.
   - On click: trigger download via the Epic 9 export endpoint (`GET /api/manuals/[manualId]/export/pdf?language=...`).

### 4.6 Download from Preview (Desktop)

1. In `preview-overlay.tsx`:
   - "Download PDF" button in toolbar.
   - On click: trigger the Epic 9 export API (`GET /api/manuals/[manualId]/export/pdf?language=...`) using the same `usePdfExport` hook from Epic 9.
   - Additionally, the browser's native PDF controls within the iframe provide their own download option.

### 4.7 Editor Header Integration

1. Modify `src/app/(dashboard)/manuals/[manualId]/editor/header.tsx`:
   - Add `PreviewButton` before `ExportButton`.
   - Pass current manual ID and selected language.

## 5. API Contracts

### GET /api/manuals/[manualId]/preview/pdf

**Auth:** Session with read access to manual.

```typescript
// Query params
// language: string (optional, defaults to "en")

// Response 200
// Content-Type: application/pdf
// Content-Disposition: inline
// Body: PDF binary

// Response 401 — not authenticated
// Response 403 — no access to this manual
// Response 404 — manual not found
// Response 500 — PDF generation failed
```

## 6. Data Model

No new Prisma models required. Preview is stateless — it reads the saved manual from the database and generates a PDF using the same Epic 9 pipeline.

## 7. Acceptance Criteria

| # | Criterion | Given / When / Then |
|---|-----------|---------------------|
| AC-1 | Preview button visible in editor | Given a user is on the manual editor page `/manuals/[manualId]/edit`, then a button with text "Preview" is visible in the editor header toolbar, positioned before the "Export PDF" button. |
| AC-2 | Clicking Preview opens full-screen overlay | Given the user is on the editor page, when they click the "Preview" button, then a full-screen overlay element with `[data-testid="preview-overlay"]` appears covering the viewport. |
| AC-3 | Overlay contains an iframe with PDF on desktop | Given the preview overlay is open on a desktop viewport (>=768px), then an `<iframe>` element with `[data-testid="preview-iframe"]` is visible, and its `src` attribute contains `/api/manuals/[manualId]/preview/pdf`. |
| AC-4 | Preview API returns valid PDF with correct headers | Given an authenticated user with access to a manual, when a GET request is made to `/api/manuals/[manualId]/preview/pdf?language=en`, then the response status is 200, `Content-Type` is `application/pdf`, and the response body starts with `%PDF`. |
| AC-5 | Preview shows the latest saved version | Given the user has saved a manual with overview text "Alpha", when they open the preview, then the iframe loads successfully. When they close the preview, change the overview to "Beta" without saving, and re-open the preview, then the preview still reflects the "Alpha" content (verified by the API returning the same PDF bytes as before). |
| AC-6 | Loading spinner shown while PDF generates | Given the user clicks "Preview", then a spinner element with `[data-testid="preview-spinner"]` is visible. When the iframe finishes loading, then the spinner is hidden and the iframe is visible. |
| AC-7 | Close button closes the overlay | Given the preview overlay is open, when the user clicks the close button `[data-testid="preview-close-button"]`, then the overlay element `[data-testid="preview-overlay"]` is removed from the DOM. |
| AC-8 | Escape key closes the overlay | Given the preview overlay is open, when the user presses the Escape key, then the overlay element `[data-testid="preview-overlay"]` is removed from the DOM. |
| AC-9 | Editor state preserved after closing preview | Given the user has typed unsaved text "Draft123" in the editor, when they open the preview and then close it, then the text "Draft123" is still present in the editor. |
| AC-10 | Download button triggers file download on desktop | Given the preview overlay is open on desktop, when the user clicks the "Download PDF" button `[data-testid="preview-download-button"]`, then a file download is triggered (verified by Playwright download event). |
| AC-11 | Mobile shows download button instead of iframe | Given the preview overlay is open on a mobile viewport (375px width), then no `<iframe>` element is present inside the overlay, and a "Download PDF" button `[data-testid="preview-download-button"]` is visible. |
| AC-12 | Mobile download button triggers file download | Given the preview overlay is open on a mobile viewport, when the user clicks the "Download PDF" button, then a file download is triggered (verified by Playwright download event). |
| AC-13 | Preview reflects the currently selected editor language | Given a manual with English and German translations, when the user selects German in the editor language switcher and clicks "Preview", then the preview API is called with `?language=de` (verified by intercepting the network request). |
| AC-14 | Unauthenticated user gets 401 from preview API | Given no active session, when a GET request is made to `/api/manuals/[manualId]/preview/pdf`, then the response status is 401. |
| AC-15 | User without access gets 403 from preview API | Given an authenticated user who is not assigned to a manual, when a GET request is made to that manual's preview endpoint, then the response status is 403. |
| AC-16 | Focus trap within overlay | Given the preview overlay is open, when the user presses Tab repeatedly, then focus cycles within the overlay and does not move to elements behind it. |

## 8. Test Plan (TDD)

Tests should be written **before** implementing the corresponding feature code. The workflow for each task is:

1. Write the failing test (red).
2. Implement the minimal code to pass the test (green).
3. Refactor while keeping tests green.

### E2E Tests (Playwright)

#### `tests/e2e/pdf-preview.spec.ts`

**Setup:** Seed database with a saved manual containing English and German translations, with enough content for a multi-page PDF. Log in as a user with access to the manual.

| Test Case | Covers | Steps |
|-----------|--------|-------|
| Preview button is visible in editor toolbar | AC-1 | Navigate to `/manuals/[manualId]/edit`. Assert `button:has-text("Preview")` is visible. Assert it appears before the "Export PDF" button in DOM order. |
| Clicking Preview opens overlay | AC-2 | Click `button:has-text("Preview")`. Assert `[data-testid="preview-overlay"]` is visible. |
| Overlay contains PDF iframe on desktop | AC-3 | Open preview on 1280x720 viewport. Assert `[data-testid="preview-iframe"]` is visible. Assert its `src` contains `/api/manuals/` and `/preview/pdf`. |
| Spinner shown then hidden after iframe loads | AC-6 | Click Preview. Assert `[data-testid="preview-spinner"]` is visible. Wait for iframe `load` event. Assert spinner is hidden. Assert iframe is visible. |
| Close button closes overlay | AC-7 | Open preview. Click `[data-testid="preview-close-button"]`. Assert `[data-testid="preview-overlay"]` is not in DOM. |
| Escape key closes overlay | AC-8 | Open preview. Press Escape. Assert `[data-testid="preview-overlay"]` is not in DOM. |
| Editor state preserved after preview | AC-9 | Type "Draft123" in editor overview field. Open preview. Close preview. Assert "Draft123" is still in the editor field. |
| Download button triggers download on desktop | AC-10 | Open preview. Set up Playwright download listener. Click `[data-testid="preview-download-button"]`. Assert download event fires with `.pdf` filename. |
| Mobile viewport shows download button, no iframe | AC-11 | Set viewport to 375x667. Open preview. Assert `[data-testid="preview-iframe"]` is not present. Assert `[data-testid="preview-download-button"]` is visible. |
| Mobile download triggers file download | AC-12 | Set viewport to 375x667. Open preview. Set up download listener. Click `[data-testid="preview-download-button"]`. Assert download event fires. |
| Preview uses current editor language | AC-13 | Switch editor language to German. Set up Playwright request interception for `/preview/pdf`. Click Preview. Assert intercepted request URL contains `language=de`. |
| Focus stays trapped in overlay | AC-16 | Open preview. Press Tab 20 times. After each Tab, assert `document.activeElement` is inside `[data-testid="preview-overlay"]`. |

### API Integration Tests (Vitest)

#### `tests/integration/pdf-preview-api.test.ts`

**Setup:** Test database with seeded manual and users (one with access, one without).

| Test Case | Covers | Steps |
|-----------|--------|-------|
| GET preview/pdf returns 200 with PDF bytes | AC-4 | Send GET to `/api/manuals/[id]/preview/pdf?language=en`. Assert status 200. Assert `Content-Type` is `application/pdf`. Assert body starts with `%PDF`. |
| GET preview/pdf returns saved manual content | AC-5 | Save manual with known content. GET preview. Assert response is 200. Update manual content via DB without API. GET preview again. Assert response differs from first. |
| GET preview/pdf with language param | AC-13 | GET with `?language=de`. Assert 200. Assert the generated PDF uses the German content (verify by checking the PDF text extraction or ensuring the generation function is called with `de`). |
| GET preview/pdf without auth returns 401 | AC-14 | Send GET without session cookie. Assert status 401. |
| GET preview/pdf without access returns 403 | AC-15 | Send GET as user without manual access. Assert status 403. |
| GET preview/pdf for nonexistent manual returns 404 | AC-4 | Send GET with non-existent manual ID. Assert status 404. |

## 9. Out of Scope

- Annotation or commenting on preview
- Side-by-side editor + preview split view (preview is full-screen overlay only)
- Caching generated preview PDFs (regenerated each time)
- Print from preview (use browser print or download + print)
- Thumbnail page navigation sidebar
- Custom zoom/page controls (browser-native iframe controls handle this)
- Language picker in the preview overlay (user switches language in the editor)
- Preview of unsaved changes (user must save first)
- HTML approximation for mobile (mobile uses download-only approach)
- Offline preview capability
