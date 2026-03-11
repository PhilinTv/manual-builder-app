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
- Export history tracked: who exported, when, which version/language.
- Export available from both editor header and manual list view.

**UX:**
- Professional document layout with cover page, branded header/footer, page numbers, and styled TOC.
- Synchronous download with spinner for MVP (simple, immediate feedback).
- Auto-generated TOC from manual structure with clickable links and page numbers.
- Danger warnings styled per ISO 7010 safety conventions: icon + colored banner + text label (accessible in B&W).
- Export button in both editor toolbar (next to Publish/Preview) and manual list actions.

**Architecture:**
- Headless browser rendering (Puppeteer/Playwright) — HTML template rendered to PDF for high-fidelity CSS matching.
- Export history persisted in database with metadata (user, timestamp, version, language).
- Synchronous generation streamed to client (no background job queue for MVP).

### Expected Outcome

- **PDF generation:** Backend uses headless browser rendering (Puppeteer/Playwright) to convert an HTML template into a PDF. The HTML template is populated with manual data (product name, TOC, overview, feature instructions, danger warnings) and styled with CSS to match the web editor look. This approach provides high-fidelity layout control. If performance becomes an issue, a template-based engine (Typst/WeasyPrint) is a viable fallback.
- **Export flow:** User clicks "Export PDF" from either the editor header toolbar or the manual list view actions. A spinner is shown during synchronous generation, and the browser downloads the file directly upon completion. The exported file is named using the convention ProductName_Language_Version (e.g., ProductX_EN_v3.pdf).
- **PDF content:** The exported PDF has a professional document layout: cover page with product name, branded header/footer on each page, page numbers, and a styled auto-generated table of contents with clickable links to sections. All manual sections are properly formatted. Danger warnings follow ISO 7010 safety sign conventions (icon + colored banner + text label), ensuring accessibility in both color and B&W printing through redundant coding.
- **Multi-language:** User selects a single language per export and receives one PDF in that language.
- **Permissions:** Any user with read access to a manual can export it as PDF.
- **Tracking:** Each export is saved with metadata (who exported, when, which version/language) for audit trail purposes.

### Acceptance Criteria

1. User can trigger PDF export from both the manual editor header toolbar and the manual list view actions
2. Generated PDF contains all manual sections: cover page with product name, auto-generated TOC, overview, feature instructions, and danger warnings
3. PDF has a professional document layout with cover page, branded header/footer, page numbers, and styled typography
4. Danger warnings use ISO 7010 style conventions: icon + colored banner + text label, accessible in B&W with redundant coding
5. Table of contents is auto-generated from manual section structure with clickable links and page numbers
6. User can select which single language to export; one PDF per language
7. PDF is generated synchronously with a loading spinner; file downloads directly upon completion
8. PDF file is named using the convention ProductName_Language_Version (e.g., ProductX_EN_v3.pdf)
9. Any user with read access to the manual can export a PDF
10. Each export is recorded with metadata (user, timestamp, version, language) in an export history
11. PDF is rendered via headless browser (Puppeteer/Playwright) from an HTML template with CSS styling matching the web editor
12. Generated PDF file size is reasonable for the content

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | PDF generation approach | Headless browser rendering (Puppeteer/Playwright) — render HTML template and print to PDF. High fidelity CSS styling. Note: Template-based engine (Typst/WeasyPrint) is viable if performance is an issue, but headless browser gives best CSS/layout control for matching the web editor look | 2 |
| 2 | PDF layout and styling | Professional document layout — cover page with product name, branded header/footer, page numbers, styled TOC. Looks like a real product manual | 2 |
| 3 | Export trigger and delivery | Synchronous download with spinner — user clicks export, waits, browser downloads. Simple UX for MVP | 2 |
| 4 | Danger warnings in PDF | ISO 7010 style — standard safety sign conventions (icon + colored banner + text label). Accessible in B&W with redundant coding | 2 |
| 5 | Table of contents | Auto-generated from sections — TOC built automatically from manual structure with clickable links and page numbers | 2 |
| 6 | Multi-language export | Single language per export — user selects one language, gets one PDF | 2 |
| 7 | Export button placement | Both locations — available from both editor header and manual list view actions | 2 |
| 8 | PDF file naming | Product name + language + version — e.g., ProductX_EN_v3.pdf. Informative naming at a glance | 2 |
| 9 | Export permissions | Any user with read access — if you can see the manual, you can export it | 2 |
| 10 | PDF storage/tracking | Export history — each export saved with metadata (who, when, which version/language) for audit trail | 2 |

### Discussion Log

#### Round 1

- **Questions asked:** PDF generation approach, layout/styling, export trigger, danger warnings styling, TOC generation, multi-language export, button placement, file naming, access control, storage/tracking
- **Answers:** Awaiting user input

#### Round 2

- **Questions asked:** All 10 open questions from Round 1
- **Answers:** Selected recommended options for all: (1) Headless browser, (2) Professional layout, (3) Sync download, (4) ISO 7010 style, (5) Auto-generated TOC, (6) Single language per export, (7) Both locations, (8) Product+language+version naming, (9) Any user with read access, (10) Export history
