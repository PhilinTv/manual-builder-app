# Epic 9: PDF Export

**Goal:** Users can export a manual as a formatted PDF document.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 9.1 | PDF generation service | Backend generates a PDF from manual data with proper formatting (title, TOC, sections, warnings) |
| 9.2 | Export action | User clicks "Export PDF" and downloads the file |
| 9.3 | Multi-language export | User can select which language variant to export |

**Done when:** User exports an English manual as PDF; the PDF contains all sections with formatted TOC and danger warnings.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product:**
- Any user with read access can export a manual as a PDF. Single language per export (user selects language).
- File naming: ProductX_EN_v3.pdf (product name + language + version).
- No export history stored — PDF generated on-the-fly and streamed to user.
- Export available from the editor toolbar.

**UX:**
- Basic functional layout — clean typography, clear section hierarchy, page numbers. No cover page or branded headers.
- Synchronous download with spinner for MVP (simple, immediate feedback).
- Auto-generated TOC from manual structure with clickable links and page numbers.
- Danger warnings styled with icons + text: severity icon + bold/colored text label. Accessible in B&W through redundant coding (icon + text, not color alone).
- Export button in editor toolbar (next to Publish/Preview).

**Architecture:**
- Headless browser rendering (Puppeteer/Playwright) — HTML template rendered to PDF for high-fidelity CSS matching.
- No server-side storage of exported PDFs — generated on-the-fly and streamed to client.
- Synchronous generation streamed to client (no background job queue for MVP).

### Expected Outcome

- **PDF generation:** Backend uses headless browser rendering (Puppeteer/Playwright) to convert an HTML template into a PDF. The HTML template is populated with manual data (product name, TOC, overview, feature instructions, danger warnings) and styled with CSS. This approach provides high-fidelity layout control with familiar web technologies.
- **Export flow:** User clicks "Export PDF" from the editor header toolbar. A spinner is shown during synchronous generation, and the browser downloads the file directly upon completion. The exported file is named using the convention ProductName_Language_Version (e.g., ProductX_EN_v3.pdf).
- **PDF content:** The exported PDF has a basic functional layout: clean typography, clear section hierarchy, page numbers, and an auto-generated table of contents with clickable links to sections. All manual sections are properly formatted. Danger warnings use icons + text styling: severity icon + bold/colored text label, accessible in B&W through redundant coding (icon + text, not color alone).
- **Multi-language:** User selects a single language per export and receives one PDF in that language.
- **Permissions:** Any user with read access to a manual can export it as PDF.
- **Storage:** No server-side storage — PDF is generated on-the-fly and streamed directly to the user. No export history tracking for MVP.

### Acceptance Criteria

1. User can trigger PDF export from the manual editor header toolbar via an "Export PDF" button
2. Generated PDF contains all manual sections: product name header, auto-generated TOC, overview, feature instructions, and danger warnings
3. PDF has a basic functional layout with clean typography, clear section hierarchy, and page numbers
4. Danger warnings use icons + text styling: severity icon + bold/colored text label, accessible in B&W through redundant coding
5. Table of contents is auto-generated from manual section structure with clickable links and page numbers
6. User can select which single language to export; one PDF per language
7. PDF is generated synchronously with a loading spinner; file downloads directly upon completion
8. PDF file is named using the convention ProductName_Language_Version (e.g., ProductX_EN_v3.pdf)
9. Any user with read access to the manual can export a PDF
10. PDF is rendered via headless browser (Puppeteer/Playwright) from an HTML template with CSS styling
11. Generated PDF file size is reasonable for the content
12. Export works on both desktop and mobile web

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | PDF generation approach | Headless browser rendering (Puppeteer/Playwright) — render HTML template and print to PDF. High fidelity CSS styling. Note: Template-based engine (Typst/WeasyPrint) is viable if performance is an issue, but headless browser gives best CSS/layout control for matching the web editor look | 2 |
| 2 | PDF layout and styling | Basic functional layout — clean typography, clear section hierarchy, page numbers. No cover page or branded headers. Simpler to implement, fewer page-break edge cases | 3 |
| 3 | Export trigger and delivery | Synchronous download with spinner — user clicks export, waits, browser downloads. Simple UX for MVP | 2 |
| 4 | Danger warnings in PDF | Icons + text styling — severity icon + bold/colored text label. Accessible in B&W through redundant coding. No graphic assets needed | 3 |
| 5 | Table of contents | Auto-generated from sections — TOC built automatically from manual structure with clickable links and page numbers | 2 |
| 6 | Multi-language export | Single language per export — user selects one language, gets one PDF | 2 |
| 7 | Export button placement | Editor toolbar only — "Export PDF" button in the editor header bar, next to Publish/Preview. Single integration point | 3 |
| 8 | PDF file naming | Product name + language + version — e.g., ProductX_EN_v3.pdf. Informative naming at a glance | 2 |
| 9 | Export permissions | Any user with read access — if you can see the manual, you can export it | 2 |
| 10 | PDF storage/tracking | No storage — PDF generated on-the-fly and streamed to user. No DB table or history UI for MVP | 3 |

### Discussion Log

#### Round 1

- **Questions asked:** PDF generation approach, layout/styling, export trigger, danger warnings styling, TOC generation, multi-language export, button placement, file naming, access control, storage/tracking
- **Answers:** Awaiting user input

#### Round 2

- **Questions asked:** All 10 open questions from Round 1
- **Answers:** Selected recommended options for all: (1) Headless browser, (2) Professional layout, (3) Sync download, (4) ISO 7010 style, (5) Auto-generated TOC, (6) Single language per export, (7) Both locations, (8) Product+language+version naming, (9) Any user with read access, (10) Export history

#### Round 3

- **Simplification pass:** User requested easier-to-implement options to reduce bugs.
- **Changes:** (2) Professional → Basic functional layout, (4) ISO 7010 → Icons + text styling, (7) Both locations → Editor toolbar only, (10) Export history → No storage
- **Rationale:** Removed cover page/branding (fewer CSS edge cases), dropped graphic assets requirement, single integration point for export button, no extra DB table or history UI for MVP
