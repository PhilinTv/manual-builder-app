# Epic 6: Real-time Notifications

**Goal:** Users see toast notifications when another user modifies a manual they are viewing or have access to.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 6.1 | WebSocket/SSE infrastructure | Server pushes events to connected clients; reconnects on disconnect |
| 6.2 | Broadcast manual changes | When a manual is saved, all other connected users with access receive an event |
| 6.3 | Toast notification UI | Non-blocking toast displays: who changed what, with link to the manual |

**Done when:** User A edits a manual, User B sees a toast notification in real time.

---

## Brainstorming

**Confidence Level:** 95%

### Summary

**Product:**
- Notifications triggered on manual publish and manual assignment/unassignment events (not on auto-save drafts)
- Scoped to relevant users: only users with access to the manual (assigned editors + all admins) receive notifications
- Contextual toast messages — different content depending on whether user is currently viewing the affected manual

**UX:**
- shadcn/ui Sonner toast (bottom-right) — non-blocking, stackable, auto-dismiss after ~5 seconds, accessible via ARIA live regions
- Contextual messaging: "This manual was just updated by [User]. Click to reload." when viewing the affected manual; "[User] published [Manual Name]" with link when elsewhere
- Persistent banner at top of editor when viewing a stale manual — "This manual has been updated. Click to reload." — maintains visibility after toast dismisses
- Subtle disconnection indicator shown only if offline for >10 seconds

**Architecture:**
- Server-Sent Events (SSE) — server-to-client only, works over HTTP, native auto-reconnect, simpler than WebSockets
- Events dispatched on manual publish and assignment change (Server Action triggers SSE broadcast)
- Automatic reconnect with exponential backoff; subtle UI indicator after >10 seconds offline
- No event catch-up on reconnect for MVP (accept minor gaps during brief disconnections)

### Expected Outcome

- **SSE connection:** On app load, client establishes an SSE connection to the server. Connection is maintained while the app is open. Reconnects automatically on drop.
- **Manual publish notification:** When User A publishes a manual, all other connected users who have access to that manual (assigned editors + all admins) receive a toast notification.
- **Assignment notification:** When an admin assigns/unassigns a manual to/from an editor, the affected editor receives a toast notification.
- **Toast UI:** shadcn/ui Sonner toast appears bottom-right. Shows "[User] published [Manual Name]" with a clickable link to the manual. Auto-dismisses after ~5 seconds. Multiple toasts stack.
- **Contextual in-editor notification:** If the user is currently viewing/editing the manual that was just published by someone else, the toast says "This manual was just updated by [User]. Click to reload." Additionally, a persistent banner appears at the top of the editor with a "Reload" button.
- **Banner behavior:** The stale-content banner stays visible until the user clicks "Reload" or navigates away. Reloading fetches the latest published version.
- **Disconnection indicator:** If the SSE connection drops for >10 seconds, a subtle indicator appears (e.g., small dot or text in the header). Disappears on reconnect.

### Acceptance Criteria

1. SSE connection is established on app load and maintained while the app is open
2. SSE connection auto-reconnects with exponential backoff on disconnect
3. A subtle disconnection indicator appears if connection is lost for >10 seconds
4. When a manual is published, all other connected users with access receive a toast notification
5. When a manual is assigned/unassigned, the affected editor receives a toast notification
6. Toast notifications are non-blocking, appear bottom-right, auto-dismiss after ~5 seconds, and stack
7. Toast shows "[User] published [Manual Name]" with a clickable link to the manual
8. When user is viewing a manual that another user just published, toast shows contextual message and a persistent banner appears at the top of the editor
9. Persistent banner shows "This manual has been updated" with a "Reload" button
10. Auto-save draft changes do NOT trigger notifications (only publish events do)
11. Notifications are scoped to users with access to the manual (assigned editors + all admins)
12. Notifications work correctly on mobile web

### Open Questions

*None — all questions resolved.*

### Resolved Decisions

| # | Question | Decision | Round |
|---|----------|----------|-------|
| 1 | Real-time transport | Server-Sent Events (SSE) — server-to-client only, simpler than WebSockets, auto-reconnects, sufficient for notification delivery | 1 |
| 2 | Notification scope | Manual published + manual assigned/unassigned — meaningful events without noise from auto-save drafts | 1 |
| 3 | Notification audience | Users with access to the manual (assigned editors + all admins) — scoped to relevance, reduces notification fatigue | 1 |
| 4 | Toast notification UI | shadcn/ui Sonner toast (bottom-right) — non-blocking, accessible, consistent with design system | 1 |
| 5 | Toast content | Contextual messaging — different copy depending on whether user is viewing the affected manual vs. elsewhere | 1 |
| 6 | Stale content handling | Toast + persistent banner at top of editor — maintains visibility after toast auto-dismisses, user controls when to reload | 1 |
| 7 | Reconnection strategy | Automatic reconnect with exponential backoff — subtle indicator if offline >10 seconds, no event catch-up for MVP | 1 |

### Discussion Log

#### Round 1

- **Questions asked:** Real-time transport, notification scope, notification audience, toast UI, toast content, stale content handling, reconnection strategy
- **Answers:** SSE, publish + assignment events only, users with access, Sonner toast bottom-right, contextual messaging, toast + persistent banner, auto-reconnect with backoff
- **Note:** All recommended options selected based on UX best practices and architectural fit. SSE chosen over WebSockets for simplicity (no client-to-server real-time needed). Publish-only scope avoids alert fatigue from auto-save (Option B had ⚠️ cognitive overload). Scoped audience follows "audience-appropriate messaging" pattern. Sonner toast follows "ephemeral non-blocking feedback" pattern. Contextual messaging follows "context-sensitive messaging" pattern. Persistent banner follows "persistent inline alert" pattern (Nielsen #1 visibility). Auto-reconnect with backoff follows "graceful degradation" pattern.
