# Epic 8: Automated Translations

**Goal:** Users can auto-translate manual content into a target language using a translation API.

**Depends on:** Epic 7

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 8.1 | Translation API integration | Backend integrates with OpenAI API for LLM-based translation |
| 8.2 | Auto-translate action | User can trigger "auto-translate" for a section or full manual into a target language |
| 8.3 | Review translated content | Auto-translated text is saved as draft; user can review and edit before publishing |

**Done when:** User clicks auto-translate on an English manual to German, reviews the output, edits one section, and saves.

---

## Brainstorming

**Confidence Level:** 92%

### Summary

**Product:**
- Users can auto-translate individual sections or full manuals using OpenAI GPT-4o-mini.
- Only content fields are translated (overview, instructions, warnings). Product name stays in source language.
- Translation cost shown as token estimate before user confirms.
- Stale indicators flag translations that may be outdated after source content changes.
- API key managed as server-side environment variable by DevOps.

**UX:**
- Auto-translated sections show an "Auto-translated" badge until user explicitly approves (quality gate).
- Translation streams token-by-token directly into the editable field (typewriter effect) for real-time visibility.
- Per-section and full-manual translation both available (flexibility and efficiency).
- Failed sections show error with retry; successful sections are preserved (partial success).
- Stale indicator on translated sections when source content changes — user decides to re-translate.

**Architecture:**
- OpenAI API integration with GPT-4o-mini via server-side env var.
- Streaming API responses forwarded to client via SSE for real-time token display.
- Section + glossary context sent to LLM for consistent terminology across the manual.
- Translation status tracked per section: auto-translated flag + approval state + stale indicator.
- Service layer abstracts OpenAI API for future provider flexibility.

### Expected Outcome

- **Auto-translate action:** User can trigger GPT-4o-mini-powered translation for individual sections or an entire manual from source language into any added target language, with a confirmation dialog showing estimated token cost before proceeding.
- **Review workflow:** Auto-translated content displays an "Auto-translated" badge. Users review and explicitly approve each section to clear the badge, establishing a quality gate. Users can edit machine output freely at any time.
- **Stale detection:** When source content changes after a translation was generated, a stale indicator marks affected translated sections. The user decides whether to re-translate.
- **Progress feedback:** Translation streams token-by-token directly into the editable field (typewriter effect) via SSE, providing real-time visibility of system status per section.
- **Content scope:** Only content fields (overview, instructions, warnings) are translated. Product names remain in the source language to prevent brand/proper-noun errors.
- **Error handling:** Partial success model — successfully translated sections are saved, failed sections show an error with a retry option.
- **Context quality:** Each translation request includes the section text plus a glossary of key terms extracted from previous translations in the same manual, ensuring consistent terminology.
- **Integration:** The backend connects to OpenAI API via a server-side environment variable, with the integration abstracted behind a service layer for future provider flexibility.

### Acceptance Criteria

1. User can trigger auto-translation for a single section into a target language using GPT-4o-mini
2. User can trigger auto-translation for an entire manual (all sections) into a target language
3. Before translation starts, a confirmation dialog shows the estimated token count/cost and requires user confirmation
4. Translation output streams token-by-token into the target language editable field via SSE (typewriter effect)
5. Auto-translated sections display an "Auto-translated" badge until the user explicitly approves the translation
6. Approving a translation removes the "Auto-translated" badge from that section
7. When source content changes, translated sections show a "potentially stale" indicator
8. Only content fields (overview, instructions, warnings) are translated; product name remains in the source language
9. If translation fails for some sections, successfully translated sections are saved and failed sections show an error with a retry option
10. Each translation request sends the section text plus a glossary of key terms from previous translations for terminology consistency
11. OpenAI API key is configured via server-side environment variable
12. OpenAI API integration is abstracted behind a service layer for future provider flexibility
13. Auto-translate works within the existing side-by-side editor (Epic 7)

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| #   | Question | Decision | Round |
| --- | -------- | -------- | ----- |
| -   | Translation API provider | OpenAI API (LLM-based translation) — enables context-aware translations, streaming output, and leverages existing LLM capabilities | 1 |
| 1   | OpenAI model selection | GPT-4o-mini — good quality at significantly lower cost (~$0.15/1M input tokens). Best cost/quality balance for straightforward content | 2 |
| 2   | Translation granularity | Both per-section and full manual — supports both novice and expert workflows (flexibility and efficiency) | 2 |
| 3   | Auto-translated content status | Saved with "auto-translated" flag — marked as auto-translated; user can review and approve to clear the flag. Progressive disclosure | 2 |
| 4   | Translation progress UX | Inline streaming per section — each section streams translated text token-by-token in real-time. Direct manipulation, visibility of system status | 2 |
| 5   | Re-translation on source change | Stale indicator — mark translated sections as "potentially stale" when source changes. User decides whether to re-translate | 2 |
| 6   | Cost management | Confirmation with token estimate — before translating, show estimated token count/cost and ask user to confirm. Informed consent pattern | 2 |
| 7   | OpenAI API key management | Environment variable — server-side env var set by DevOps. Simple, secure, single key for the whole system | 2 |
| 8   | Auto-translated content distinction | Badge + approval workflow — badge shown until user explicitly approves, then removed. Visibility + quality gate | 2 |
| 9   | Error handling | Partial success — successfully translated sections saved, failed sections show error with retry option | 2 |
| 10  | Translatable content fields | Content fields only — overview, instructions, and warnings. Product name stays in source language (error prevention) | 2 |
| 11  | Streaming UX | Stream directly into editable field — tokens appear in target text area as they arrive. Typewriter effect reduces perceived latency | 2 |
| 12  | Context-aware translation | Section + glossary — send section plus glossary of key terms from previous translations. Best quality-to-cost ratio, mirrors CAT-tool patterns | 2 |

### Discussion Log

#### Round 1

- **Questions asked:** Translation API provider, translation granularity, draft/review workflow, progress UX, re-translation on source change, cost management, API key management, auto-translated content distinction, error handling, translatable fields
- **Answers:** User decided on OpenAI API for translations. Resolved question 1. Added new LLM-specific questions: model selection, streaming UX, context-aware translation. Updated progress UX and cost management to reflect LLM/token-based characteristics.

#### Round 2

- **Questions asked:** All 12 open questions (model selection, granularity, content status, progress UX, re-translation, cost management, API key, content distinction, error handling, translatable fields, streaming UX, context-aware translation)
- **Answers:** Selected recommended options for all: (1) GPT-4o-mini, (2) Both per-section + full manual, (3) Auto-translated flag with approval, (4) Inline streaming per section, (5) Stale indicator, (6) Confirmation with token estimate, (7) Environment variable, (8) Badge + approval workflow, (9) Partial success, (10) Content fields only, (11) Stream into editable field, (12) Section + glossary context
