# Epic 7: Multi-language Support

**Goal:** A manual can have content in multiple languages; users can switch between them.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 7.1 | Language model | Each manual can have multiple language variants; one is marked as source/primary |
| 7.2 | Add language to manual | User can add a new language and enter content for each section in that language |
| 7.3 | Language switcher in editor | Dropdown to switch language context while editing |
| 7.4 | Translation completeness indicator | Shows which sections are translated and which are missing per language |

**Done when:** User creates a manual in English, adds German, translates two sections, sees completeness indicator showing remaining untranslated sections.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product:**
- Fixed system list of ~30 languages (no custom entries). Any assigned user can add languages and translate.
- Primary/source language set at creation, changeable later. Existing manuals auto-migrate to English as default.
- Publishing allowed with incomplete translations (modal confirmation warns about missing sections).
- Language deletion is soft delete (content preserved, recoverable). RTL support out of scope for this epic.

**UX:**
- Language switcher dropdown in sticky editor header (next to publish button). "+ Add language" at bottom of dropdown.
- Primary language editing: normal single-pane editor (same as Epic 2).
- Translation editing (desktop): side-by-side — source (read-only) left, target (editable) right. Sections pre-filled with source text.
- Translation editing (mobile): single-pane with "Show source" bottom sheet peek.
- 3-state translation tracking per section: Not translated → In progress (auto-detected on edit) → Translated (explicit "Mark as translated").
- Completeness badge per language in dropdown (e.g., "DE — 3/5 sections").
- Manual list page shows language code tags (EN, DE, FR) + language filter chip.

**Architecture:**
- Version snapshots (Epic 5) include all languages — whole-manual versioning, rollback restores all languages.
- Data model supports future Epic 8 (automated translations).
- Migration: existing manuals auto-assigned English as primary language.

### Expected Outcome

- **Language model:** Each manual has a primary/source language (set at creation, changeable later) and zero or more additional language variants from a fixed system list of ~30 languages. Each section (product name, overview, instructions, warnings) has content stored per language. Each section has a 3-state translation status: Not translated → In progress → Translated.
- **Add language flow:** Any assigned user can add a new language to a manual from the editor (via "+ Add language" at the bottom of the language dropdown). When added, all sections are pre-filled with source language text (status: "Not translated"). User translates section by section.
- **Editor — primary language:** Normal single-pane editor (same as Epic 2). No side-by-side.
- **Editor — translation view (desktop):** Side-by-side layout — source language on the left (read-only), target language on the right (editable). Sections pre-filled with source text.
- **Editor — translation view (mobile):** Single-pane showing target language only. "Show source" button opens source text in a bottom sheet overlay (peek pattern).
- **Translation status tracking:** Auto-detect marks section "In progress" when user modifies pre-filled text. User explicitly clicks "Mark as translated" to confirm completion. Completeness badge counts only "Translated" sections.
- **Language switcher:** Dropdown in the sticky editor header bar (next to publish button). Each language in the dropdown shows a completeness badge (e.g., "DE — 3/5 sections").
- **Manual list page:** Each manual shows language code tags (EN, DE, FR) on the list item. Language filter chip available to filter by language.
- **Publishing:** User can publish with incomplete translations. Modal confirmation warns: "3 sections are not yet translated in DE. Publish anyway?" with Cancel/Publish.
- **Language deletion:** Soft delete — language is hidden/archived, content preserved.
- **Versioning:** Version snapshots include all languages (whole-manual). Rolling back restores all languages to that point.

### Acceptance Criteria

1. Each manual has a designated primary/source language set at creation, changeable later
2. User can add additional languages from a fixed system list of ~30 languages
3. Any assigned user (admin or editor) can add languages and translate content
4. User can switch between languages via a dropdown in the sticky editor header
5. Editing primary language shows normal single-pane editor
6. Editing a non-primary language shows side-by-side view (source read-only left, target editable right)
7. On mobile, translation editing shows single-pane with "Show source" bottom sheet peek
8. When a language is added, sections are pre-filled with source language text
9. Translation status is tracked per section with 3 states: Not translated → In progress → Translated
10. Auto-detection marks sections "In progress" on edit; user explicitly marks "Translated"
11. Language dropdown shows completeness badge per language (e.g., "DE — 3/5 sections")
12. Manual list page shows language code tags (EN, DE, FR) per manual
13. Language filter chip available on the manual list page
14. Publishing with incomplete translations shows a modal confirmation warning
15. Language deletion is soft delete (content preserved, recoverable)
16. Version snapshots (Epic 5) include all languages — rollback restores all languages
17. Language data model supports future Epic 8 (automated translations)

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Available languages | Fixed system list — predefined ~30 common languages, constrained input | 1 |
| 2 | Primary/source language | Set on creation, changeable later in settings | 1 |
| 3 | Translation editing UX | Side-by-side view — source (read-only) left, target (editable) right | 1 |
| 4 | Untranslated section display | Source text pre-filled — source content copied into target fields for editing | 1 |
| 5 | Language switcher placement | Top bar dropdown in sticky editor header, next to publish button | 1 |
| 6 | Completeness indicator | Badge on language dropdown — fraction per language (e.g., "DE — 3/5") | 1 |
| 7 | Who can add languages | Any assigned user — both admins and assigned editors | 1 |
| 8 | Language deletion | Soft delete — language hidden/archived, content preserved | 1 |
| 9 | List page interaction | Language code tags (EN, DE, FR) shown on each manual list item | 1 |
| 10 | Incomplete translation publishing | Allow publish with warning about missing translations | 1 |
| 11 | Side-by-side on mobile | Single-pane with "Show source" bottom sheet peek | 2 |
| 12 | Translation status tracking | 3-state: Not translated → In progress → Translated (auto-detect + explicit "Mark as translated") | 2 |
| 13 | Publish warning form | Modal confirmation listing untranslated sections with Cancel/Publish | 2 |
| 14 | Source language editing view | Normal single-pane editor (same as Epic 2); side-by-side only for non-primary languages | 2 |
| 15 | Language filter on list | Add language filter chip to manual list page | 2 |
| 16 | Versioning interaction | Whole-manual versions — snapshot includes all languages, rollback restores all | 2 |
| 17 | Add language button placement | Bottom of language dropdown — "+ Add language" opens picker from system list | 3 |
| 18 | Migration for existing manuals | Auto-assign English as default primary language, no user action needed | 3 |
| 19 | RTL language support | Out of scope for Epic 7 — deferred to future enhancement | 3 |

### Discussion Log

#### Round 1

- **Questions asked:** Available languages, primary language, translation editing UX, untranslated display, language switcher placement, completeness indicator, language permissions, language deletion, list page interaction, incomplete translation publishing
- **Answers:** (1) Fixed system list, (2) Set on creation changeable, (3) Side-by-side view, (4) Source text pre-filled, (5) Top bar dropdown, (6) Badge on dropdown, (7) Any assigned user, (8) Soft delete, (9) Language code tags, (10) Allow with warning

#### Round 2

- **Questions asked:** Side-by-side on mobile, translation status tracking, publish warning form, source language editing view, language filter on list, versioning interaction
- **Answers:** (11) Single-pane with peek, (12) Both / 3-state, (13) Modal confirmation, (14) Normal single-pane, (15) Add language filter chip, (16) Whole-manual versions

#### Round 3

- **Questions asked:** Add language button placement, migration for existing manuals, RTL support scope
- **Answers:** (17) Bottom of language dropdown, (18) Auto-assign English, (19) Out of scope
