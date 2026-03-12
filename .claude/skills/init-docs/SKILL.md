---
name: init-docs
description: Create or update documentation chapters incrementally from existing code and feature docs. Scans routes, components, and APIs to describe feature behaviors.
argument-hint: (no arguments)
allowed-tools: Read, Write, Edit, Glob, Grep, Task
---

# /init-docs

Create or update the high-level documentation chapters in `docs/documentation/` from existing code and feature docs.

## Behavior

1. **Check structure**: Read `docs/documentation/` — if missing, create all 7 chapter skeletons:
   - `10-platform-foundation.md` — Auth, Infrastructure, Message Schema, Event Bus, Observability
   - `20-channels-and-ingestion.md` — Email Adapter, Voice Post-Call, Voice Real-Time, Channel Normalization
   - `30-conversation-intelligence.md` — Intent Detection, Priority Classification, Data Extraction, Ambiguity Detection, Multilingual Processing
   - `40-operations-and-routing.md` — Operational Context, Thread Management, Routing, Ownership, SLA Monitoring, Escalation
   - `50-cockpit-ui.md` — Unified Inbox, Thread Detail, Alerts, Search & Filter, Task Panel, HITL Actions
   - `60-automation-and-workflows.md` — Auto-Clarification, Draft Responses, Approval Queue, Notifications, Feedback Loop
   - `70-reporting-and-analytics.md` — Communication Metrics, SLA Compliance, AI Performance, Team Workload, Dashboards

2. **Read feature docs**: Read all feature/epic docs (e.g., `docs/epics/*.md` or `docs/features/*.md`), excluding:
   - `*_spec.md` (specs)
   - `*_brainstorming.md` (brainstorming)
   - `*-tasks.md` (task lists)
   - `*.png`, `*.jpg` (images)
   - `*-verification-report.md` (reports)

3. **Build inventory**: Map chapters → features. Identify which features have a doc with `**Status:** Done` vs which need inline descriptions from code.

4. **Update chapters** — go chapter by chapter:
   - For each feature, scan relevant code (routes, components, APIs, services — paths depend on the project's chosen structure from E1)
   - Read feature docs if they exist and have `**Status:** Done`
   - Write/update feature entries (## heading + one-liner + key behaviors)
   - Each entry has: one-liner description + 3-5 key behaviors
   - Link only to feature docs with `**Status:** Done` using: `**Feature doc:** [Name](../epics/file.md)` (adjust relative path based on actual doc location)
   - Features without Done docs get described inline from code (no link)
   - Update cross-feature interactions section

5. **Report** what was created/updated.

## Idempotency

This skill is re-runnable. It:
- Updates existing feature entries (matched by ## heading)
- Adds new entries for features not yet documented
- Preserves manual edits to sections it doesn't manage

## Chapter Format

Each chapter follows this structure:

```markdown
# Chapter Title

2-3 sentence overview of this system capability area.

---

## Feature Name

One-liner describing the feature.

**Key Behaviors:**
- Behavior 1
- Behavior 2
- Behavior 3

**Feature doc:** [Feature Name](../epics/feature-doc.md)  ← only if Status: Done

---

## Cross-Feature Interactions

- How features in this chapter connect to each other and to other chapters
```

## Feature-to-Chapter Mapping

| Feature pattern | Chapter |
|---|---|
| platform, auth, infrastructure, event-bus, message-schema, observability | `10-platform-foundation.md` |
| email-adapter, voice-*, channel-*, ingestion, transcription | `20-channels-and-ingestion.md` |
| intelligence, intent-*, priority-*, extraction, ambiguity, nlp, multilingual | `30-conversation-intelligence.md` |
| thread-*, operational-context, routing, ownership, sla-*, escalation | `40-operations-and-routing.md` |
| cockpit, inbox, dashboard, ui-*, search, filter, alerts | `50-cockpit-ui.md` |
| automation, hitl, workflow, clarification, draft-response, approval | `60-automation-and-workflows.md` |
| reporting, analytics, metrics, compliance | `70-reporting-and-analytics.md` |
