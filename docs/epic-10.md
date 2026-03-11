# Epic 10: PDF Preview

**Goal:** Users can preview the PDF output in-browser before downloading.

**Depends on:** Epic 9

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 10.1 | In-browser PDF viewer | Rendered PDF is displayed in an embedded viewer (no download required) |
| 10.2 | Preview from editor | "Preview" button in the manual editor opens the PDF preview |

**Done when:** User clicks Preview, sees the PDF rendered in the browser, can then download or go back to editing.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product:**
- Preview shows real PDF output (same generation as export) for WYSIWYG guarantee.
- Preview reflects current editor state including unsaved changes — no need to save first.
- Users can switch language in the preview toolbar without leaving the preview.

**UX:**
- Full-screen overlay/modal with close button — immersive, clear entry/exit.
- Progressive page loading — first page appears quickly while remaining pages render.
- Desktop: full PDF.js viewer with scroll, zoom, and page navigation.
- Mobile: simplified read-only HTML approximation with "Download PDF" button for the real file.
- Language dropdown in preview toolbar, defaulting to currently selected language.

**Architecture:**
- PDF.js (Mozilla) for in-browser PDF rendering — consistent cross-platform.
- Reuses Epic 9's PDF generation service — preview and export share the same pipeline.
- For preview, unsaved editor content is sent to the backend for PDF generation (not persisted as a save).
- Mobile HTML approximation generated server-side as a lightweight alternative.

### Expected Outcome

- **Preview trigger:** User clicks a "Preview" button in the manual editor to see how the PDF will look before exporting.
- **Real PDF rendering:** The preview calls the same PDF generation service used by Epic 9's export, ensuring WYSIWYG fidelity between preview and final download.
- **In-browser viewer:** PDF.js (Mozilla) renders the PDF in a canvas element within a full-screen overlay/modal. No file download required to see the preview.
- **Navigation:** User can scroll through pages, zoom in/out, and navigate the PDF within the viewer. A close button returns to the editor.
- **Current editor state:** Preview reflects the current editor content including unsaved changes — unsaved content is sent to the backend for PDF generation without persisting as a save.
- **Progressive loading:** Pages appear as they render; the first page is shown quickly while remaining pages continue to load in the background.
- **Mobile experience:** On mobile devices, a simplified read-only HTML approximation is shown instead of the full PDF.js viewer. A "Download PDF" button is provided for users who need the real file.
- **Multi-language support:** The preview defaults to the currently selected editor language. A language dropdown in the preview toolbar allows switching languages without leaving the preview.
- **Actions from preview:** User can download the PDF directly from the preview view, switch language, or close to return to editing.

### Acceptance Criteria

1. User can open a PDF preview from the manual editor via a "Preview" button.
2. Preview calls the same PDF generation service as Epic 9 export — the rendered preview matches the exported PDF exactly (WYSIWYG).
3. PDF is rendered using PDF.js (Mozilla) in a full-screen overlay/modal with a visible close button.
4. Preview reflects the current editor state including unsaved changes (unsaved content is sent to the backend without persisting as a save).
5. First page appears progressively while remaining pages continue rendering in the background.
6. Preview viewer supports scrolling, page navigation, and zoom on desktop.
7. User can download the PDF directly from the preview overlay.
8. User can close the preview overlay and return to the editor without losing any editor state.
9. On mobile, a simplified read-only HTML approximation is shown instead of the PDF.js viewer, with a "Download PDF" button for the real file.
10. Preview toolbar includes a language dropdown defaulting to the currently selected editor language; switching language re-renders the preview in the chosen language without leaving the overlay.
11. Mobile HTML approximation is generated server-side as a lightweight alternative to full PDF rendering.

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Preview rendering approach | Real PDF — call the same PDF generation service (Epic 9) and render the actual PDF in a viewer. WYSIWYG guarantee | 2 |
| 2 | PDF viewer component | PDF.js (Mozilla) — open-source, renders PDF in canvas. Full-featured, consistent cross-platform, supports accessibility | 2 |
| 3 | Preview placement | Full-screen overlay/modal — preview takes over the screen with a close button. Immersive viewing, clear context switch | 2 |
| 4 | Preview content freshness | Current editor state (including unsaved changes) — preview reflects what's currently in the editor. Direct manipulation principle | 2 |
| 5 | Preview loading experience | Progressive loading — show pages as they render, first page appears quickly. Better perceived performance | 2 |
| 6 | Mobile preview experience | Simplified mobile view — read-only HTML approximation on mobile, offer "Download PDF" for the real thing. Responsive disclosure | 2 |
| 7 | Multi-language preview | Default to current, allow switching — start with current language, include language dropdown in preview toolbar. Progressive disclosure | 2 |

### Discussion Log

#### Round 1

- **Questions asked:** Preview rendering approach, viewer component, preview placement, content freshness, loading experience, mobile preview, multi-language preview
- **Answers:** Awaiting user input

#### Round 2

- **Questions asked:** All 7 open questions from Round 1
- **Answers:** Selected recommended options for all: (1) Real PDF rendering, (2) PDF.js viewer, (3) Full-screen overlay, (4) Current editor state, (5) Progressive loading, (6) Simplified HTML on mobile, (7) Default to current language with switching
