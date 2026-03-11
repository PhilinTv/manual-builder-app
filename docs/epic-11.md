# Epic 11: Automated PDF Parsing (Import)

**Goal:** Users can upload an existing PDF manual, and the system extracts structured data from it.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 11.1 | PDF upload | User can upload a PDF file (with size/type validation) |
| 11.2 | Text & structure extraction | System extracts text and attempts to identify: product name, TOC, sections, warnings |
| 11.3 | Review & map extracted data | User sees extracted data mapped to manual fields; can correct before saving |
| 11.4 | Create manual from import | Confirmed import creates a new manual with the extracted data |

**Done when:** User uploads a PDF manual, system extracts content, user reviews/corrects the mapping, and a new manual is created with the data.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product:**
- Import entry point inside "Create Manual" flow as alternative creation method.
- PDF upload limited to 10 MB with type validation. Always creates a new manual (no merge).
- LLM-based extraction for structure (product name, TOC, overview, instructions). Keyword matching for danger warnings.
- Language auto-detected from extracted text, shown for user confirmation.
- Scanned/image-based PDFs accepted with warning.

**UX:**
- Desktop review: side-by-side — original PDF on left, extracted fields on right. Confidence indicators per field (green/yellow/red).
- Mobile review: stacked layout — PDF viewer on top, extracted fields below.
- Async processing with toast notification + badge on manual list for pending imports.
- LLM failures: automatic retry 2-3 times, then error with "Try Again" button.

**Architecture:**
- LLM (Claude API) for structure extraction. Keyword matching for danger warning detection.
- Async processing pipeline: upload → extract text → LLM analysis → store results → notify.
- 10 MB file size limit. PDF text extraction via server-side library.
- Import metadata stored for audit (who imported, when, source filename).

### Expected Outcome

- **Entry point:** User clicks "Create Manual" on the manual list page, then chooses "Import from PDF" as the creation method (alongside "Create from scratch").
- **Upload:** User uploads a PDF file (max 10 MB, type-validated). System accepts the file and begins async processing.
- **Async extraction:** System sends extracted text to an LLM (e.g., Claude API) to identify structure: product name, TOC, overview, feature instructions. Danger warnings are detected via keyword matching ("WARNING", "DANGER", "CAUTION", etc.). Language is auto-detected from the extracted text.
- **Notification:** User is notified via in-app toast when extraction completes, plus a badge/indicator on the manual list for pending imports. User can continue other work while waiting.
- **Review screen (desktop):** Side-by-side view — original PDF on the left, extracted fields on the right. Each field shows a confidence indicator (green/yellow/red). User can edit, correct, or fill in any field. Auto-detected language is shown for confirmation.
- **Review screen (mobile):** Stacked layout — PDF viewer on top, extracted fields below. Preserves simultaneous reference on mobile so users can compare extracted data against the original PDF.
- **Scanned PDFs:** If little/no text is found, system shows a warning that the PDF may be image-based. User can proceed with whatever was extracted.
- **Error handling:** If LLM extraction fails, system automatically retries 2-3 times for transient errors. If retries are exhausted, user sees a clear error message with a "Try Again" button.
- **Upload UX:** Determinate progress bar during file upload. Browser warns if user tries to navigate away during upload. Once file is handed to backend, navigation is safe.
- **Cancellation:** User can cancel mid-upload (stops transfer). Review screen has a "Discard Import" button. No cancel during async extraction (short enough to complete).
- **Concurrency:** One import at a time per user. If user tries to start another while one is processing, show clear "Import in progress" messaging.
- **Manual creation:** User confirms the mapping → a new manual is created with the extracted data, ready for further editing. Import always creates a new manual (no merge).

### Acceptance Criteria

1. User can upload a PDF file (max 10 MB) with type and size validation
2. "Import from PDF" is accessible inside the "Create Manual" flow as a creation method
3. System sends extracted text to an LLM to identify and map: product name, TOC, overview, feature instructions
4. Danger warnings are detected via keyword matching (WARNING, DANGER, CAUTION, ATTENTION)
5. Extraction runs asynchronously — user is notified when complete
6. User sees a side-by-side review screen (PDF left, extracted fields right) with confidence indicators per field
7. User can edit, correct, or fill in any extracted field before saving
8. System auto-detects language and shows it for user confirmation
9. Confirming the import creates a new manual with the extracted data (always new, no merge)
10. If PDF has little/no extractable text, system warns user (no hard rejection)
11. Upload and import flow works on both desktop and mobile web
12. System handles LLM failures gracefully — auto-retry for transient errors, immediate error for permanent failures, with "Try Again" button
13. Upload shows determinate progress bar and warns on navigation-away during upload phase
14. User can cancel upload mid-transfer and discard import results from the review screen
15. Only one import at a time per user; clear messaging if user attempts concurrent import

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | PDF parsing approach | AI/LLM-based extraction — send text to LLM to identify structure. Better at ambiguous layouts. | 1 |
| 2 | Upload size limit | 10 MB — covers most text-based manuals, keeps processing fast | 1 |
| 3 | Review/mapping UX | Side-by-side view — original PDF on left, extracted fields on right | 1 |
| 4 | Extraction failures | Confidence indicators per field (green/yellow/red) — user triages low-confidence areas | 1 |
| 5 | Scanned/image-based PDFs | Accept with warning — warn if little/no text found, let user proceed | 1 |
| 6 | Import entry point | Inside "Create Manual" flow — option to create from scratch or import from PDF | 1 |
| 7 | New vs existing manual | New manual only — import always creates a fresh manual | 1 |
| 8 | Danger warning detection | Keyword matching — scan for WARNING, DANGER, CAUTION, ATTENTION keywords | 1 |
| 9 | Language for imported content | Auto-detect with confirmation — detect language, show for user confirmation | 1 |
| 10 | Processing time UX | Asynchronous — upload and notify when ready, user can continue other work | 1 |
| 11 | Mobile review fallback | Stacked layout — PDF viewer on top, extracted fields below. Preserves simultaneous reference on mobile | 2 |
| 12 | Async notification | Toast + badge on imports — toast notification plus badge/indicator on manual list showing pending imports | 2 |
| 13 | LLM API failure handling | Retry with user notification — retry automatically 2-3 times, then show error with "Try Again" button | 2 |
| 14 | Upload progress & navigation | Determinate progress bar during upload + browser navigation warning. Once handed to backend for async extraction, navigation is safe (toast+badge covers it). | 3 |
| 15 | Import cancellation | Cancel during upload (stops transfer) + "Discard Import" button on review screen. No cancel during async extraction — it's short enough to let it finish. | 3 |
| 16 | Concurrent imports | One import at a time — block new uploads while one is processing. Clear messaging if user tries. | 3 |

### Discussion Log

#### Round 1

- **Questions asked:** Parsing approach, upload size limit, review UX, extraction failures, scanned PDFs, import entry point, new vs existing manual, warning detection, language handling, processing time
- **Answers:** (1) LLM-based extraction, (2) 10 MB — diverged from recommended 25 MB, (3) side-by-side, (4) confidence indicators, (5) accept with warning, (6) inside Create Manual flow, (7) new manual only, (8) keyword matching — chose simpler approach over LLM for warnings specifically, (9) auto-detect with confirmation, (10) asynchronous
- **Notes:** User chose full LLM for structure extraction but simple keyword matching for danger warnings — pragmatic split: LLM handles the ambiguous task (structure), keywords handle the well-defined task (standardized warning labels). User chose 10 MB over recommended 25 MB — likely prioritizing simplicity and fast processing; images are out of scope per briefing anyway.
- **Follow-up questions surfaced:** Mobile review fallback, async notification mechanism, LLM failure handling

#### Round 2

- **Questions asked:** Mobile review fallback, async notification mechanism, LLM API failure handling
- **Answers:** Selected recommended options for all: (11) Stacked layout for mobile, (12) Toast + badge on imports, (13) Retry 2-3 times then error with "Try Again"

#### Round 3

- **Questions resolved:** (14) Determinate progress bar + navigation warning during upload; safe to navigate once handed to backend. (15) Cancel during upload + "Discard Import" on review screen; no cancel during extraction. (16) One import at a time per user with clear messaging.
- **Notes:** All three were minor UX gap questions. User confirmed recommended options for all three. Confidence raised to 92%. Brainstorming complete.
