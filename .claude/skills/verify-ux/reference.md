# UX Verification Reference

## Route Classification

### Protected Routes (require authentication)

These routes require an authenticated session and redirect to the login page if unauthenticated:

| Route | Feature |
|-------|---------|
| `/inbox` | Unified inbox — all communication threads |
| `/threads/:id` | Thread detail — conversation history per operational object |
| `/dashboard` | Cockpit dashboard — operational overview, alerts, SLA status |
| `/sla` | SLA monitoring — pending, at-risk, and breached items |
| `/reports` | Reporting and analytics dashboards |
| `/settings` | System settings, routing rules, SLA configuration |
| `/approvals` | Human-in-the-loop approval queue |

### Public Routes (no auth required)

| Route | Feature |
|-------|---------|
| `/login` | Login page |
| `/health` | Health check endpoint |

### Special Behavior

- Unauthenticated access to protected routes redirects to `/login`
- After login, user is redirected to `/inbox` (default landing page)
- Session management specifics TBD in E1 (JWT, session cookie, or SSO)

Note: Routes are provisional and will be finalized during E5 (Cockpit UI) implementation. Update this file as routes are established.

---

## Page-Specific Test Strategies

### `/inbox` (Protected)

**Expected elements:**
- Page heading/title for unified inbox
- Thread list with columns: priority, operational reference, latest message preview, channel icon, SLA status, assigned owner
- Sort and filter controls (by priority, channel, status, date, owner)
- Search bar for full-text search across messages
- Real-time alert indicators for escalations and SLA risks
- Thread count / pagination

**Test flow:**
1. Navigate to inbox after auth
2. Verify thread list renders with expected columns
3. Test sorting by priority, date, SLA status
4. Test filtering by channel (email, voice), status, owner
5. Use search to find a thread by PO number or keyword
6. Click a thread to navigate to thread detail
7. Verify new high-priority messages are visually distinguished

### `/threads/:id` (Protected)

**Expected elements:**
- Thread header with operational reference (PO/shipment/job number)
- Conversation timeline showing messages from all channels chronologically
- Channel indicator per message (email, voice transcript, etc.)
- Extracted data panel (PO numbers, entities, timestamps, locations highlighted)
- AI analysis panel (intent, priority, risk signals, confidence scores)
- HITL action area (approve/edit/reject suggested responses)
- Related operational data (linked shipment status, SLA countdown)

**Test flow:**
1. Navigate to thread detail after auth
2. Verify conversation timeline renders with messages
3. Check that messages show channel source indicator
4. Verify extracted data panel shows identified entities
5. Test HITL actions: review AI-suggested response, edit, approve
6. Verify SLA status/countdown is visible if applicable
7. Test navigation back to inbox

### `/dashboard` (Protected)

**Expected elements:**
- Operational overview cards (active threads, pending actions, SLA at-risk count)
- Real-time alert feed for escalations
- SLA compliance summary (on-track, at-risk, breached counts)
- Team workload distribution
- Channel volume breakdown
- Quick-action links to critical items

**Test flow:**
1. Navigate to dashboard after auth
2. Verify overview cards render with data
3. Check alert feed shows recent escalations
4. Verify SLA summary is accurate
5. Click on an alert to navigate to the relevant thread
6. Test refresh/auto-update behavior

### `/login` (Public)

**Expected elements:**
- Login form with appropriate credential fields
- Submit button
- Error messaging for invalid credentials

**Test flow:**
1. Verify form renders
2. Submit empty form, check validation errors
3. Enter invalid credentials, verify error message
4. Enter valid credentials, verify redirect to `/inbox`

### `/sla` (Protected)

**Expected elements:**
- SLA status overview (on-track, at-risk, breached)
- Filterable list of items with SLA status
- Countdown timers for at-risk items
- Escalation history per item
- Configuration panel for SLA rules (admin only)

**Test flow:**
1. Navigate to SLA page after auth
2. Verify SLA categories render with counts
3. Filter by status (at-risk, breached)
4. Click an item to view escalation details
5. Verify countdown timers are active for at-risk items

---

## Design System Verification Checklist

See `.claude/ux-design-reference.md` for the full design system, UX principles, status color conventions, component conventions, and reference product patterns. This section covers only verification-specific checks.

### What to verify against the UX design reference:

- **Status colors** — All status indicators use semantic tokens from the design reference (success/warning/destructive/info/muted). No hardcoded colors.
- **Information hierarchy** — List views follow the three-tier model (Tier 1 scannable, Tier 2 readable, Tier 3 on-demand).
- **CTA rules** — Maximum 1 primary CTA per panel. Destructive actions require confirmation.
- **Keyboard navigation** — All triage actions reachable via keyboard. Command palette functional.
- **Loading states** — Skeleton loaders for lists/cards, inline spinners for action buttons, streaming indicators for real-time content.
- **Error states** — Toasts for transient errors, inline for validation, fallback UI for subsystem unavailability.
- **Responsive behavior** — Desktop-first (1280px+), functional on tablet (1024px), mobile not required.
- **Reference product alignment** — Does the feature feel like Linear (speed/density), Superhuman (triage flow), or Front (team collaboration) where appropriate?

---

## Playwright MCP Tool Usage Patterns

### Navigate and Verify

```
1. mcp__playwright__navigate → url: "http://localhost:3000{path}"
2. mcp__playwright__screenshot → name: "{page}-initial"
3. mcp__playwright__get_text → selector: "h1" (or specific selector)
```

### Form Fill and Submit

```
1. mcp__playwright__fill → selector: '[name="email"]', value: "test@example.com"
2. mcp__playwright__fill → selector: '[name="password"]', value: "TestPassword123!"
3. mcp__playwright__click → selector: 'button[type="submit"]'
4. mcp__playwright__wait_for → selector: "[data-testid='inbox']" (or URL change)
```

### Accessibility Snapshot

```
1. mcp__playwright__snapshot → (captures full a11y tree)
2. Review tree for: missing labels, unnamed buttons, skipped headings, missing ARIA
```

### Responsive Viewport Testing

Desktop and mobile screenshots are taken by navigating to the page and using Playwright's viewport control:

```
1. Navigate to page at default viewport (desktop: 1280x720)
2. mcp__playwright__screenshot → name: "{page}-desktop"
3. Resize viewport to 1024x768 (tablet)
4. mcp__playwright__screenshot → name: "{page}-tablet"
```

### Waiting for Dynamic Content

```
1. mcp__playwright__click → selector: "button"
2. mcp__playwright__wait_for → selector: "[data-testid='modal']"
3. mcp__playwright__screenshot → name: "{page}-modal-open"
```

---

## Issue Severity Definitions

| Severity | Definition | Examples |
|----------|-----------|----------|
| **Critical** | Page crashes, data loss, broken core functionality, security vulnerability | White screen, thread data not loading, SLA alerts not triggering, auth bypass |
| **High** | Feature doesn't work as intended, major UI breakage, accessibility blocker | Inbox not filtering, thread messages out of order, approval queue unresponsive |
| **Medium** | Visual inconsistency, minor UX friction, non-standard patterns | Wrong status color, missing loading state, inconsistent spacing, slow render |
| **Low** | Cosmetic issue, nice-to-have improvement, minor design deviation | Slightly off alignment, extra whitespace, missing hover state |
