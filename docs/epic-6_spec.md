# Real-time Notifications — Spec

## 1. Goal

Deliver real-time notifications to connected users when manuals are published or assignments change, using Server-Sent Events (SSE). Users see non-blocking toast notifications and, when viewing a stale manual, a persistent reload banner in the editor.

## 2. Dependencies

- **Epic 1** — Auth, roles, app shell
- **Epic 2** — Manual CRUD, publish flow, assignment model

## 3. Tech Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transport | Server-Sent Events (SSE) | Server-to-client only, native browser reconnect, simpler than WebSockets |
| Toast library | Sonner (via shadcn/ui) | Non-blocking, stackable, accessible ARIA live regions, already in design system |
| Event dispatch | In-process EventEmitter | No external message broker needed at this scale; Server Actions emit events |
| Reconnection | Exponential backoff via `EventSource` | Native browser behavior + custom backoff for extended outages |
| Event catch-up | None (MVP) | Accept minor gaps during brief disconnections |

## 4. Implementation Tasks

### 4.1 SSE Event Bus

1. Create `apps/web/src/lib/events/event-bus.ts`:
   ```typescript
   import { EventEmitter } from 'events'

   export type SSEEvent =
     | { type: 'manual:published'; manualId: string; manualTitle: string; actorId: string; actorName: string }
     | { type: 'manual:assigned'; manualId: string; manualTitle: string; editorId: string; actorName: string }
     | { type: 'manual:unassigned'; manualId: string; manualTitle: string; editorId: string; actorName: string }

   class AppEventBus extends EventEmitter {
     emit(event: 'sse', data: SSEEvent): boolean
     on(event: 'sse', listener: (data: SSEEvent) => void): this
   }

   export const eventBus = new AppEventBus()
   ```
2. The event bus is a singleton module-level instance shared across the server process.

### 4.2 SSE API Route

1. Create `apps/web/src/app/api/events/route.ts`:
   ```typescript
   export async function GET(req: Request): Promise<Response>
   ```
2. Implementation:
   - Authenticate the request via `getRequiredSession()`. Return 401 if unauthenticated.
   - Extract `userId` and `role` from session.
   - Return a `ReadableStream` response with headers:
     ```
     Content-Type: text/event-stream
     Cache-Control: no-cache
     Connection: keep-alive
     ```
   - Subscribe to `eventBus.on('sse', ...)`.
   - Filter events per user:
     - `manual:published` — send if user is admin OR user is assigned to the manual (query `ManualAssignment` table).
     - `manual:assigned` / `manual:unassigned` — send only to the affected `editorId`.
   - Do NOT send events back to the actor who triggered them (`actorId !== userId`).
   - Send `event: ping` every 30 seconds as keepalive.
   - On stream close, unsubscribe from event bus.

### 4.3 Emit Events from Server Actions

1. Modify publish Server Action in `apps/web/src/app/(dashboard)/manuals/[id]/actions.ts`:
   - After successful publish, emit:
     ```typescript
     eventBus.emit('sse', {
       type: 'manual:published',
       manualId, manualTitle, actorId: session.user.id, actorName: session.user.name
     })
     ```

2. Modify assignment Server Actions in `apps/web/src/app/(dashboard)/manuals/[id]/actions.ts` (or equivalent):
   - After assigning an editor:
     ```typescript
     eventBus.emit('sse', {
       type: 'manual:assigned',
       manualId, manualTitle, editorId, actorName: session.user.name
     })
     ```
   - After unassigning:
     ```typescript
     eventBus.emit('sse', {
       type: 'manual:unassigned',
       manualId, manualTitle, editorId, actorName: session.user.name
     })
     ```

### 4.4 Client-Side SSE Hook

1. Create `apps/web/src/hooks/use-sse.ts`:
   ```typescript
   export function useSSE(onEvent: (event: SSEEvent) => void): {
     status: 'connected' | 'connecting' | 'disconnected'
   }
   ```
2. Implementation:
   - Create `EventSource` pointing to `/api/events`.
   - Parse `event.data` as JSON and call `onEvent`.
   - Track connection status: `connected` on `onopen`, `disconnected` on `onerror`.
   - `EventSource` handles reconnection natively. Add custom exponential backoff for extended outages (2s, 4s, 8s, 16s, max 30s).
   - Clean up on unmount.

### 4.5 Connection Status Tracking

1. Create `apps/web/src/hooks/use-connection-status.ts`:
   ```typescript
   export function useConnectionStatus(sseStatus: 'connected' | 'connecting' | 'disconnected'): {
     showIndicator: boolean
   }
   ```
2. Return `showIndicator: true` only when disconnected for more than 10 seconds (use a timer).
3. Reset timer when status changes to `connected`.

### 4.6 Notification Provider

1. Create `apps/web/src/components/notifications/notification-provider.tsx`:
   - Wrap the app shell layout (in `src/app/(dashboard)/layout.tsx`).
   - Uses `useSSE` hook to listen for events.
   - Stores the current page context (which manual is being viewed, if any) via React context or URL check.
   - On event received, determines toast message and whether to show stale banner.
   - Calls `toast()` from Sonner with appropriate content.

### 4.7 Toast Notifications

1. Configure Sonner `Toaster` in `apps/web/src/app/(dashboard)/layout.tsx` (if not already present):
   - Position: `bottom-right`.
   - Duration: 5000ms.
   - Stack behavior: enabled.

2. Toast content for each event type:
   - `manual:published` (user NOT viewing that manual):
     ```
     Title: "[ActorName] published [ManualTitle]"
     Action: link to /manuals/[id]
     ```
   - `manual:published` (user IS viewing that manual):
     ```
     Title: "This manual was just updated by [ActorName]"
     Description: "Click to reload with latest changes"
     Action: reload handler
     ```
   - `manual:assigned`:
     ```
     Title: "You were assigned to [ManualTitle]"
     Action: link to /manuals/[id]
     ```
   - `manual:unassigned`:
     ```
     Title: "You were unassigned from [ManualTitle]"
     ```

### 4.8 Stale Content Banner

1. Create `apps/web/src/components/manuals/stale-banner.tsx`:
   ```typescript
   type StaleBannerProps = {
     visible: boolean
     updatedBy: string
     onReload: () => void
   }
   ```
2. Renders a yellow/amber banner at the top of the editor area with `data-testid="stale-banner"`:
   - Text: "This manual has been updated by [Name]. You may be viewing stale content."
   - Button: "Reload" (primary variant) with `data-testid="stale-banner-reload"`.
3. Clicking "Reload" calls `router.refresh()` to re-fetch server components and clears the banner.
4. Banner dismisses automatically if user navigates away from the manual.

### 4.9 Disconnection Indicator

1. Create `apps/web/src/components/notifications/connection-indicator.tsx`:
   - Renders a small red dot with tooltip "Connection lost" in the app header bar, with `data-testid="connection-lost-indicator"`.
   - Only visible when `showIndicator` is true (disconnected > 10s).
   - Disappears on reconnect.

### 4.10 Integration into App Layout

1. In `apps/web/src/app/(dashboard)/layout.tsx`:
   - Add `<NotificationProvider>` wrapping the layout children.
   - Add `<ConnectionIndicator>` in the header.
   - Ensure `<Toaster>` from Sonner is rendered with `position="bottom-right"`.

## 5. API Contracts

### GET /api/events (SSE Stream)

**Auth:** Authenticated user.

```typescript
// SSE event format (data field is JSON)
// event: message
// data: { type: string, ...payload }

type ManualPublishedEvent = {
  type: 'manual:published'
  manualId: string
  manualTitle: string
  actorName: string
}

type ManualAssignedEvent = {
  type: 'manual:assigned'
  manualId: string
  manualTitle: string
  actorName: string
}

type ManualUnassignedEvent = {
  type: 'manual:unassigned'
  manualId: string
  manualTitle: string
  actorName: string
}

type SSEClientEvent = ManualPublishedEvent | ManualAssignedEvent | ManualUnassignedEvent

// Keepalive
// event: ping
// data: {}

// Response 401 — unauthenticated
```

## 6. Data Model

No new database tables. Events are transient and dispatched via in-process event bus.

The SSE route queries existing tables for authorization:
- `ManualAssignment` — to check if a user has access to a manual.
- `User` — to check role (admins receive all manual:published events).

## 7. Acceptance Criteria

| # | Criterion | Given / When / Then |
|---|-----------|---------------------|
| AC-1 | SSE connection established on app load | Given an authenticated user navigates to any dashboard page, when the page loads, then no element with `[data-testid="connection-lost-indicator"]` is visible within 3 seconds |
| AC-2 | SSE route rejects unauthenticated requests | Given an unauthenticated request to `GET /api/events`, when the request is made, then the server responds with HTTP 401 |
| AC-3 | SSE connection auto-reconnects after disconnect | Given an authenticated user with an active SSE connection, when the SSE endpoint is temporarily blocked and then restored, then the client re-establishes the connection and no `[data-testid="connection-lost-indicator"]` is visible |
| AC-4 | Disconnection indicator appears after >10 seconds offline | Given an authenticated user with an active SSE connection, when the SSE endpoint is blocked for 11 seconds, then an element with `[data-testid="connection-lost-indicator"]` becomes visible in the page header |
| AC-5 | Disconnection indicator disappears on reconnect | Given the disconnection indicator is visible, when the SSE endpoint is restored and the connection re-establishes, then `[data-testid="connection-lost-indicator"]` is no longer visible |
| AC-6 | Publish notification delivered to users with access | Given Editor1 is assigned to ManualA and is on the dashboard, when another user publishes ManualA, then a Sonner toast (`[data-sonner-toast]`) appears containing the text "[ActorName] published [ManualTitle]" |
| AC-7 | Publish notification NOT delivered to users without access | Given Editor2 is NOT assigned to ManualA, when another user publishes ManualA, then no toast appears for Editor2 within 5 seconds |
| AC-8 | Admin receives publish notifications for all manuals | Given an admin user is on the dashboard, when any user publishes any manual, then the admin sees a toast containing the manual title |
| AC-9 | Assignment notification delivered to affected editor | Given an admin assigns Editor1 to ManualA, when the assignment is saved, then Editor1 sees a toast containing the text "You were assigned to [ManualTitle]" |
| AC-10 | Unassignment notification delivered to affected editor | Given an admin unassigns Editor1 from ManualA, when the unassignment is saved, then Editor1 sees a toast containing the text "You were unassigned from [ManualTitle]" |
| AC-11 | Toast is non-blocking and positioned bottom-right | Given a notification event is triggered, when the toast appears, then a `[data-sonner-toast]` element is visible and its computed position is in the bottom-right quadrant of the viewport |
| AC-12 | Toast auto-dismisses within 4-6 seconds | Given a toast appears, when 6 seconds elapse, then the `[data-sonner-toast]` element for that notification is no longer visible |
| AC-13 | Multiple toasts stack | Given two notification events fire within 1 second, when both toasts appear, then at least two `[data-sonner-toast]` elements are visible simultaneously |
| AC-14 | Toast contains clickable link to manual | Given a publish toast for ManualA (id: X) is visible, when the user clicks the toast action link, then the browser navigates to a URL matching `/manuals/X` |
| AC-15 | Contextual toast when viewing the updated manual | Given Editor1 is on page `/manuals/[id]` for ManualA, when another user publishes ManualA, then a toast appears containing the text "This manual was just updated by [ActorName]" |
| AC-16 | Persistent stale banner appears when viewing updated manual | Given Editor1 is on page `/manuals/[id]` for ManualA, when another user publishes ManualA, then an element with `[data-testid="stale-banner"]` becomes visible containing text "This manual has been updated" and a "Reload" button (`[data-testid="stale-banner-reload"]`) |
| AC-17 | Stale banner reload refreshes content and hides banner | Given the stale banner is visible on `/manuals/[id]`, when the user clicks the "Reload" button, then `[data-testid="stale-banner"]` is no longer visible and the page content reflects the latest published version |
| AC-18 | Stale banner dismisses on navigation | Given the stale banner is visible on `/manuals/[id]`, when the user navigates to a different page, then `[data-testid="stale-banner"]` is no longer visible |
| AC-19 | Auto-save drafts do NOT trigger notifications | Given Editor1 is editing ManualA and an auto-save occurs, when the draft is saved (not published), then no other connected user receives a toast |
| AC-20 | Actor does not receive their own notifications | Given Editor1 publishes ManualA, when the publish completes, then Editor1 does NOT see a toast for that publish event |
| AC-21 | Notifications work on mobile viewport (390x844) | Given an authenticated user on a 390x844 viewport, when a notification event fires, then a `[data-sonner-toast]` element is visible within the viewport bounds |

## 8. TDD Approach

All tests should be written **before** the corresponding implementation code. The development workflow for each task is:

1. **Write the test** — create a failing test that asserts the expected behavior described in the acceptance criteria.
2. **Implement the feature** — write the minimal code to make the test pass.
3. **Refactor** — clean up the implementation while keeping all tests green.

Start with integration tests for the SSE event bus and route (tasks 4.1-4.3), then E2E tests for the UI layer (tasks 4.6-4.9).

## 9. Test Plan

### E2E Tests (Playwright)

#### `tests/e2e/notifications.spec.ts`
**Setup:** Seed DB with admin, 2 editors. Editor1 assigned to ManualA. Both editors logged in using two separate browser contexts.

| Test Case | Steps | Assertion | ACs |
|-----------|-------|-----------|-----|
| SSE connection on login | Login as Editor1, navigate to dashboard | `[data-testid="connection-lost-indicator"]` is not visible within 3s | AC-1 |
| Publish toast for assigned user | Editor1 on dashboard; Admin publishes ManualA | `[data-sonner-toast]` visible with text containing "[Admin] published [ManualA title]" | AC-6 |
| No publish toast for unassigned user | Editor2 on dashboard (not assigned to ManualA); Admin publishes ManualA | No `[data-sonner-toast]` appears within 5s | AC-7 |
| Admin sees all publish toasts | Admin2 on dashboard; Editor1 publishes ManualA | Admin2 sees toast with ManualA title | AC-8 |
| Assignment toast | Admin assigns Editor2 to ManualA | Editor2 sees toast "You were assigned to [ManualA title]" | AC-9 |
| Unassignment toast | Admin unassigns Editor1 from ManualA | Editor1 sees toast "You were unassigned from [ManualA title]" | AC-10 |
| Toast position bottom-right | Trigger publish event for Editor1 | Toast element's bounding rect: `left > viewport.width / 2` and `top > viewport.height / 2` | AC-11 |
| Toast auto-dismiss | Trigger publish event, wait 6s | `[data-sonner-toast]` for that notification is no longer in the DOM | AC-12 |
| Multiple toasts stack | Trigger 2 events within 1s | 2 `[data-sonner-toast]` elements visible simultaneously | AC-13 |
| Toast link navigates to manual | Click action link on publish toast | URL matches `/manuals/[manualId]` | AC-14 |
| Contextual toast when viewing manual | Editor1 on `/manuals/[id]`; Admin publishes ManualA | Toast contains "This manual was just updated by" | AC-15 |
| Stale banner appears | Editor1 on `/manuals/[id]`; Admin publishes ManualA | `[data-testid="stale-banner"]` visible with "Reload" button | AC-16 |
| Stale banner reload | Click `[data-testid="stale-banner-reload"]` | Banner disappears; page content updates | AC-17 |
| Stale banner clears on navigation | Navigate away from `/manuals/[id]` | `[data-testid="stale-banner"]` not visible | AC-18 |
| Actor does not see own notification | Editor1 publishes ManualA | No toast for Editor1 within 5s | AC-20 |
| Disconnection indicator after 11s | Block SSE endpoint via route intercept, wait 11s | `[data-testid="connection-lost-indicator"]` visible | AC-4 |
| Disconnection indicator clears on reconnect | Restore SSE endpoint after indicator shown | `[data-testid="connection-lost-indicator"]` not visible | AC-5 |
| Mobile toast visibility | Set viewport 390x844; trigger event | `[data-sonner-toast]` visible within viewport | AC-21 |

### Unit Tests (Vitest)

#### `tests/unit/connection-status.test.ts`
- Given status is `disconnected` for less than 10s, then `showIndicator` is false.
- Given status is `disconnected` for more than 10s, then `showIndicator` is true.
- Given `showIndicator` is true and status changes to `connected`, then `showIndicator` resets to false.

### Integration Tests (Vitest)

#### `tests/integration/event-bus.test.ts`
- Given a listener subscribed to `eventBus`, when `manual:published` is emitted, then the listener receives the event payload.
- Given a publish server action completes, when checking emitted events, then an SSE event with `type: 'manual:published'` was emitted.
- Given an auto-save draft action completes, when checking emitted events, then no SSE event was emitted (AC-19).

#### `tests/integration/sse-route.test.ts`
- Given an unauthenticated request to `GET /api/events`, then the response status is 401 (AC-2).
- Given an authenticated editor assigned to ManualA, when `manual:published` is emitted for ManualA, then the SSE stream receives the event (AC-6).
- Given an authenticated editor NOT assigned to ManualA, when `manual:published` is emitted for ManualA, then the SSE stream does NOT receive the event (AC-7).
- Given an authenticated admin, when `manual:published` is emitted for any manual, then the SSE stream receives the event (AC-8).
- Given the actor who triggered the publish, then the actor's SSE stream does NOT receive the event (AC-20).
- Given an SSE connection drops and reconnects, then the client receives events sent after reconnection (AC-3).

## 10. Out of Scope

- Notification history / notification center (bell icon with list)
- Email or push notifications
- Event catch-up on reconnect (accept minor gaps)
- WebSocket upgrade (SSE sufficient for server-to-client)
- User notification preferences (mute, per-type toggles)
- Batching rapid-fire notifications
- Notifications for user management actions (Epic 1)
- Sound or vibration on notification
