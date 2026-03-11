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
- Preview shows the latest saved version — user must save before previewing.
- Preview shows whichever language is currently selected in the editor.

**UX:**
- Full-screen overlay/modal with close button — immersive, clear entry/exit.
- Loading spinner while PDF generates, then full document displayed.
- Desktop: native browser PDF embed (`<iframe>`) with browser-native scroll, zoom, and controls.
- Mobile: download-only — "Download PDF" button, relies on native PDF viewer.
- No language picker in preview — always shows the current editor language.

**Architecture:**
- Native browser `<iframe>` PDF embed — zero dependencies, no bundle size impact.
- Reuses Epic 9's PDF generation service — preview and export share the same pipeline.
- Preview fetches saved manual data by ID (no unsaved state serialization).
- No separate mobile rendering pipeline — mobile just downloads the file.

### Expected Outcome

- **Preview trigger:** User clicks a "Preview" button in the manual editor to see how the PDF will look before exporting.
- **Real PDF rendering:** The preview calls the same PDF generation service used by Epic 9's export, ensuring WYSIWYG fidelity between preview and final download.
- **In-browser viewer (desktop):** The generated PDF is displayed in a native browser `<iframe>` embed within a full-screen overlay/modal. Browser-native controls handle scrolling, zoom, and page navigation. Zero additional dependencies.
- **Navigation:** A close button returns to the editor. User can download directly from the browser's native PDF controls.
- **Latest saved version:** Preview shows the last saved/published version of the manual. User must save before previewing to see latest changes. This avoids unsaved-state serialization complexity.
- **Loading:** A spinner is shown while the PDF generates. Once ready, the full document is displayed.
- **Mobile experience:** On mobile devices, the preview overlay shows a "Download PDF" button instead of an embedded viewer. The PDF is downloaded and opened in the device's native PDF viewer.
- **Multi-language:** Preview shows whichever language is currently selected in the editor. No language picker in the preview — user switches language in the editor and re-opens preview if needed.
- **Actions from preview:** User can download the PDF or close the overlay to return to editing.

### Acceptance Criteria

1. User can open a PDF preview from the manual editor via a "Preview" button.
2. Preview calls the same PDF generation service as Epic 9 export — the rendered preview matches the exported PDF exactly (WYSIWYG).
3. PDF is displayed using a native browser `<iframe>` embed in a full-screen overlay/modal with a visible close button.
4. Preview shows the latest saved version of the manual. User must save before previewing to see latest changes.
5. A loading spinner is shown while the PDF generates; full document displayed once ready.
6. On desktop, the browser's native PDF controls handle scrolling, page navigation, and zoom.
7. User can download the PDF from the browser's native PDF controls within the preview.
8. User can close the preview overlay and return to the editor without losing any editor state.
9. On mobile, the preview overlay shows a "Download PDF" button; PDF is downloaded and opened in the device's native PDF viewer.
10. Preview shows whichever language is currently selected in the editor (no language picker in preview).

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Preview rendering approach | Real PDF — call the same PDF generation service (Epic 9) and render the actual PDF in a viewer. WYSIWYG guarantee | 2 |
| 2 | PDF viewer component | Native browser `<iframe>` embed — zero dependencies, uses browser's built-in PDF viewer. Simplest implementation | 3 |
| 3 | Preview placement | Full-screen overlay/modal — preview takes over the screen with a close button. Immersive viewing, clear context switch | 2 |
| 4 | Preview content freshness | Latest saved version — preview shows last saved content. User saves before previewing. Avoids unsaved-state serialization | 3 |
| 5 | Preview loading experience | Loading spinner — show spinner while PDF generates, display full document when ready. Simple, one component | 3 |
| 6 | Mobile preview experience | Download-only on mobile — "Download PDF" button, opens in native PDF viewer. No second rendering pipeline | 3 |
| 7 | Multi-language preview | Preview current language — shows whichever language is selected in the editor. No language picker in preview | 3 |

### Discussion Log

#### Round 1

- **Questions asked:** Preview rendering approach, viewer component, preview placement, content freshness, loading experience, mobile preview, multi-language preview
- **Answers:** Awaiting user input

#### Round 2

- **Questions asked:** All 7 open questions from Round 1
- **Answers:** Selected recommended options for all: (1) Real PDF rendering, (2) PDF.js viewer, (3) Full-screen overlay, (4) Current editor state, (5) Progressive loading, (6) Simplified HTML on mobile, (7) Default to current language with switching

#### Round 3

- **Simplification pass:** User requested easier-to-implement options to reduce bugs.
- **Changes:** (2) PDF.js → Native `<iframe>` embed, (4) Current editor state → Latest saved version, (5) Progressive loading → Loading spinner, (6) HTML approximation → Download-only on mobile, (7) Default+switching → Current language only
- **Rationale:** Zero dependencies for viewer (one HTML tag vs 400KB library), no unsaved-state serialization (just fetch by ID), simple spinner (no streaming), no second rendering pipeline for mobile (just download button), no extra language picker component
