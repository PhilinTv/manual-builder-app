## Component-Specific Guidelines

### Manual List View
- **Compact list rows** (not cards): product name, status badge, assignee avatar(s), last updated date, language tags (EN, DE, FR), star icon for favorites.
- **Search:** Text search by product name.
- **Pagination:** Offset-based, 20 items per page.
- **"New Manual" button:** Visible to admins only.

### Manual Editor
- **Single scrollable page** (not accordion/tabs).
- **Rich text:** Tiptap (ProseMirror) WYSIWYG block editor.
- **Tiptap toolbar:** Bold, italic, underline, headings (H2-H4), bullet/ordered lists, links, blockquotes.
- **Section order (top-to-bottom):** Product name (text input) -> Product overview (rich text) -> Feature instructions (ordered, drag-to-reorder blocks with title + rich-text body) -> Danger warnings (structured blocks with severity selector).
- **Table of Contents:** Auto-generated from headings, displayed read-only.

### Danger Warnings
- **Severity levels (ISO 3864 / ANSI Z535):** Danger (red), Warning (orange), Caution (yellow).
- **Display:** Colored cards with severity icon + badge, inline in editor.
- **Picker:** Dropdown/combobox typeahead search for library warnings.
- **Custom warnings:** "Add custom warning" button for one-off warnings on a manual.
- Library warnings are linked references -- admin edits propagate to all manuals.

### Favorites
- **Star icon:** Filled = favorite, outlined = not. Available in both list rows and editor header.
- **Optimistic toggle** with rollback on error.
- Per-user, independent favorites.

### Version History
- **Trigger:** Only explicit "Publish" creates versions (not auto-save).
- **UI location:** Side panel/drawer via clock icon in editor header.
- **Version list:** Reverse-chronological, showing date, author, change summary, optional note.
- **Comparison (desktop):** Side-by-side with word/sentence-level diff highlighting (GitHub-style).
- **Comparison (mobile):** Toggle view -- single pane with switch to flip between versions.
- **Rollback:** Creates a new version (N+1 = copy of old). Always reversible. Confirmation dialog required.
- **Notes:** One-click publish (no dialog). Notes added retroactively from version panel.

### Real-Time Notifications
- **Transport:** SSE (server-to-client, auto-reconnect with exponential backoff).
- **Events:** Only manual publish and assignment changes (NOT auto-save drafts).
- **Audience:** Scoped to relevant users only (assigned editors + admins).
- **Context-sensitive toasts:**
    - Viewing affected manual: "This manual was just updated by [User]. Click to reload."
    - Elsewhere: "[User] published [Manual Name]" with clickable link.
- **Stale-content banner:** Persistent banner at top of editor when content is outdated: "This manual has been updated. Click to reload." with Reload button. Stays until user acts.
- **Disconnection indicator:** Subtle dot/text in header, shown only after >10 seconds of lost connection.

### Multi-Language Editor
- **Source language editing:** Normal single-pane editor.
- **Translation editing:** Side-by-side layout -- source (read-only) on left, target (editable) on right.
- **Language switcher:** Dropdown in sticky header with completeness badge per language (e.g., "DE -- 3/5 sections").
- **Mobile translation (preferred approach):** Single-pane with peek/bottom sheet for source text.
- **Incomplete translations:** Allow publish with warning modal ("3 sections not translated in DE. Publish anyway?").

### PDF Export
- Export button in manual editor/detail view.
- Multi-language export: user selects language variant.
- PDF includes: cover page, auto-generated TOC with page numbers, all sections, visually distinct severity-styled warnings.

---