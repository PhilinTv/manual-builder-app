# Epic 5: Manual Versioning

**Goal:** Every save creates a version; users can view history and roll back.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 5.1 | Version on save | Each save creates an immutable version snapshot with timestamp and author |
| 5.2 | Version history view | User can see list of versions with date, author, and summary of changes |
| 5.3 | View past version | User can open a read-only view of any past version |
| 5.4 | Rollback | User can restore a past version (creates a new version based on old snapshot) |

**Done when:** User edits a manual 3 times, views version history, rolls back to version 1, and version 4 reflects the rollback.

---

## Brainstorming

**Confidence Level:** 95%

### Summary

**Product:**
- Every explicit "Publish" creates an immutable version; all versions kept forever
- Any user with edit access can rollback — consistent with editor permissions
- Rollback immediately replaces content and creates a new version; previous state preserved as a version (always reversible)
- Confirmation dialog shown before rollback executes
- Auto-generated change summary per version + optional retroactive user note (publish remains one-click)

**UX:**
- Version history lives in a side panel/drawer, opened via a clock icon button in the editor header
- Side-by-side version comparison with word/sentence-level diff highlighting (GitHub-style)
- On mobile: toggle view — single pane with switch to flip between versions, changed sections highlighted
- Read-only view for viewing any past version
- Retroactive version notes edited from the history panel (no publish dialog friction)

**Architecture:**
- Full snapshot storage per version (full manual content as JSON, timestamp, author)
- All versions kept forever — no pruning, complete audit trail
- Auto-generated change summaries computed by diffing consecutive snapshots
- Version note is an editable field on the version record

### Expected Outcome

- **Version creation:** Each time a user publishes a manual, an immutable full-snapshot version is created automatically, capturing the full manual content (as JSON), timestamp, and author. All versions are kept forever.
- **Version history panel:** A side panel/drawer accessible from the manual editor (via a clock icon button in the editor header) shows a reverse-chronological list of versions with date, author, auto-generated change summary, and optional user note.
- **View past version:** User can click any version entry to open a read-only view of that version's content.
- **Compare versions:** User can select two versions for side-by-side comparison with word/sentence-level diff highlighting (like GitHub). On mobile, falls back to a toggle view — single pane with a switch to flip between versions, with changed sections highlighted.
- **Rollback flow:** User selects a past version and clicks "Rollback." A confirmation dialog explains the action. Rollback immediately replaces current content and creates a new version (version N+1 = copy of old version). The previous state is preserved as a version, so rollback is always reversible.
- **Change descriptions:** Each version shows an auto-generated summary of changed sections. Users can add a note retroactively from the version history panel.

### Acceptance Criteria

1. Publishing a manual creates an immutable version snapshot with full content, timestamp, and author
2. User can open a version history side panel from the manual editor via a clock icon in the header
3. Version history displays a reverse-chronological list of versions with date, author, and auto-generated change summary
4. User can view a read-only rendering of any past version
5. User can compare two versions side-by-side with word/sentence-level diff highlighting
6. On mobile, version comparison uses a toggle view (single pane, switch between versions, changed sections highlighted)
7. User can rollback to a past version; rollback immediately replaces content and creates a new version
8. Rollback shows a confirmation dialog before executing
9. Rollback preserves the existing version history (no versions are deleted; previous state becomes a version)
10. User can add an optional note to any version retroactively from the history panel
11. Version history works responsively on mobile web

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | What triggers a new version? | Only explicit "Publish" creates a version — clean history tied to intentional actions | 1 |
| 2 | Version history UI location | Side panel/drawer in the editor — contextual, no navigation needed | 1 |
| 3 | How to compare versions? | Side-by-side comparison with word/sentence-level diff highlighting (GitHub-style) | 1 |
| 4 | Who can rollback? | Any user with edit access — consistent with editor permissions model | 1 |
| 5 | Rollback behavior | Immediate replace + creates new version (N+1 = copy of old). Previous state preserved as a version. | 1 |
| 6 | Version storage strategy | Full snapshot of all manual content per version | 1 |
| 7 | Version retention policy | Keep all versions forever — complete audit trail | 1 |
| 8 | Change description approach | Auto-generated summary + optional user note | 1 |
| 9 | Rollback confirmation | Confirmation dialog before rollback — explains action, Cancel/Confirm buttons | 2 |
| 10 | Mobile diff fallback | Toggle view — single pane with switch to flip between versions, changed sections highlighted | 2 |
| 11 | Version history entry point | Clock icon button in editor header — always visible, discoverable | 2 |
| 12 | Optional version note entry | Publish is one-click (no dialog); note added retroactively from version history panel | 2 |

### Discussion Log

#### Round 1

- **Questions asked:** Version trigger, history UI location, version comparison, rollback permissions, rollback behavior, storage strategy, retention policy, change descriptions
- **Answers:** (1) Publish-only versioning, (2) side panel/drawer, (3) side-by-side with word-level diff like GitHub, (4) any editor with access, (5) immediate rollback — diverged from recommended draft-based approach, (6) full snapshots, (7) keep all forever, (8) auto-generated + optional note
- **Note:** User chose immediate rollback over draft-based. Rationale: since all versions are preserved, rollback is always reversible by rolling back again. Follow-up question added for confirmation dialog.

#### Round 2

- **Questions asked:** Rollback confirmation, mobile diff fallback, history panel entry point, version note entry
- **Answers:** (9) Confirmation dialog, (10) toggle view — diverged from recommended unified diff, preferring single-pane toggle on mobile, (11) clock icon in header, (12) one-click publish with retroactive notes
- **Note:** User chose toggle view over unified diff for mobile. Rationale: keeps focus on one version at a time in a familiar pane rather than a code-oriented unified diff. Trade-off: comparison becomes a memory task, but acceptable for mobile where screen space is limited.
