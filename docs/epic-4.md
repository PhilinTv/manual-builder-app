# Epic 4: Favorite Manuals

**Goal:** Users can mark manuals as favorites and filter the list to show only favorites.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 4.1 | Toggle favorite | User can star/unstar a manual from list or detail view |
| 4.2 | Filter by favorites | Manual list has a "Favorites only" toggle; persists across sessions |

**Done when:** User favorites two manuals, enables filter, sees only those two.

---

## Brainstorming

**Confidence Level:** 95%

### Summary

**Product:**
- Users can star/unstar manuals as favorites from both list and detail views
- "Favorites" filter chip in the manual list filters to show only starred manuals
- Filter preference persists across sessions via localStorage
- Optimistic UI updates for instant toggle feedback

**UX:**
- Star icon toggle (filled/outlined) — universally recognized favorite metaphor in professional tools
- Available in both manual list rows and manual detail header for maximum flexibility
- Integrated as a filter chip in the existing filter bar (consistent with Epic 2's filter pattern)
- Illustrated empty state with CTA when no favorites exist and filter is active

**Architecture:**
- `UserFavorite` join table (userId + manualId + createdAt) for relational querying
- Server Action for toggle; optimistic update on client with rollback on error
- localStorage for filter persistence (no new backend model needed)

### Expected Outcome

- **Manual list view:** Each manual row/card shows a star icon (outlined = not favorite, filled = favorite). Clicking the star toggles favorite status with optimistic UI feedback. Star appears on the left or alongside the manual title.
- **Manual detail view:** Star icon in the manual editor header area, next to the manual title. Same toggle behavior as list view.
- **Filter chip:** "Favorites" chip appears in the existing filter bar alongside status and assignee chips. When active, only favorited manuals are shown. Chip is dismissable to clear the filter.
- **Filter persistence:** The active state of the "Favorites" filter chip is saved to localStorage and restored on page load.
- **Empty state:** When "Favorites" filter is active and the user has no favorites, an illustrated empty state is shown with the message "No favorites yet" and a CTA button to browse all manuals (clears the filter).

### Acceptance Criteria

1. User can star/unstar a manual from the manual list view by clicking the star icon
2. User can star/unstar a manual from the manual detail/editor header
3. Star icon visually distinguishes favorited (filled) vs. not favorited (outlined) state
4. Favorite toggle updates optimistically with rollback on server error
5. Manual list filter bar includes a "Favorites" filter chip
6. When "Favorites" chip is active, only favorited manuals are displayed
7. "Favorites" filter preference persists across browser sessions (localStorage)
8. When "Favorites" filter is active and user has no favorites, an illustrated empty state with CTA is shown
9. Favorite status is per-user (each user has their own favorites)
10. Favorites feature works responsively on mobile web

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Favorite toggle icon | Star icon (filled/outlined) — universally recognized in professional tools (Gmail, GitHub) | 1 |
| 2 | Toggle placement | Both list view and detail view — supports browse-and-star and deep-read-and-star workflows | 1 |
| 3 | Favorites filter UX | Filter chip in existing filter bar — consistent with Epic 2's filter pattern, visible active state | 1 |
| 4 | Filter persistence | localStorage (client-side) — simple, no backend changes, persists per browser | 1 |
| 5 | Data model | Join table (UserFavorite: userId + manualId + createdAt) — relational, queryable, indexable | 1 |
| 6 | Optimistic UI | Yes, optimistic update with rollback on error — instant feedback for low-risk toggle action | 1 |
| 7 | Empty state (no favorites + filter active) | Illustrated empty state with "No favorites yet" message and CTA to browse all manuals | 1 |

### Discussion Log

#### Round 1

- **Questions asked:** Favorite toggle icon, toggle placement, filter UX, filter persistence, data model, optimistic UI, empty state
- **Answers:** Star icon, both views, filter chip, localStorage, join table, optimistic updates, illustrated empty state with CTA
- **Note:** All recommended options selected based on UX best practices and architectural fit. Star icon follows Jakob's Law (dominant convention in productivity tools). Both-view placement follows Nielsen Heuristic #7 (Flexibility and Efficiency). Filter chip follows Consistency and Standards with Epic 2. Optimistic UI follows Doherty Threshold for micro-interactions. Illustrated empty state follows Material Design Empty State pattern.
