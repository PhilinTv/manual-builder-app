# User Manuals Builder — Roadmap & Epic Breakdown

## Overview

This roadmap breaks the product into 11 epics across 5 phases. Each phase is fully usable on its own, enabling incremental delivery and validation.

---

## Dependency Graph

```
Epic 1: Auth & Project Setup
  └─► Epic 2: Manual CRUD & Assignment
        ├─► Epic 3: Danger Warnings Library
        ├─► Epic 4: Favorite Manuals
        ├─► Epic 5: Manual Versioning
        ├─► Epic 6: Real-time Notifications
        ├─► Epic 7: Multi-language Support
        │     └─► Epic 8: Automated Translations
        └─► Epic 9: PDF Export
              ├─► Epic 10: PDF Preview
              └─► Epic 11: PDF Parsing (Import)
```

---

## Phase 1 — Foundation

### Epic 1: Project Setup, Auth & User Management

**Goal:** Authenticated users can log in, admins can manage users. Sets up project infrastructure.

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 1.1 | Project scaffolding | Monorepo structure, dev/build/lint scripts, CI pipeline runs on push |
| 1.2 | Database & ORM setup | Schema migrations work, seed script creates initial admin |
| 1.3 | User registration & login | Users can register, log in, receive JWT/session; passwords are hashed |
| 1.4 | Role-based access (Admin / Editor) | Admin role can access user management; Editor role cannot |
| 1.5 | Admin: user CRUD | Admin can list, create, deactivate users and assign roles |
| 1.6 | Responsive app shell | Navigation, layout, and auth screens render correctly on desktop and mobile web |

**Done when:** An admin can log in, create an editor user, and that editor can log in. App shell is responsive.

---

## Phase 2 — Core Manual Management

### Epic 2: Manual CRUD & Assignment

**Goal:** Users can create and edit manuals with all core fields. Admins can assign manuals to users.

**Depends on:** Epic 1

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 2.1 | Manual data model | Schema includes: product name, table of contents, product overview, feature instructions (ordered list), danger warnings (list) |
| 2.2 | Create / edit / delete manual | Authenticated user can perform full CRUD on manuals they have access to |
| 2.3 | Manual list view | Paginated list with search by product name; responsive on mobile |
| 2.4 | Manual detail editor | Rich form for editing all manual sections; auto-save or explicit save |
| 2.5 | Admin: assign manual to user | Admin can assign/unassign manuals to editors; editors see only assigned manuals |

**Done when:** Admin creates a manual, assigns it to an editor, editor edits all fields, changes persist.

---

### Epic 3: Danger Warnings Library

**Goal:** Reusable library of danger warnings that can be selected when editing a manual.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 3.1 | Warning library CRUD | Admin can create, edit, delete shared danger warnings (title + description + severity) |
| 3.2 | Select warnings for a manual | In manual editor, user can pick from the library instead of typing warnings from scratch |
| 3.3 | Custom warnings | User can still add a one-off warning not in the library |

**Done when:** Admin populates warning library; editor selects library warnings in a manual and adds a custom one.

---

### Epic 4: Favorite Manuals

**Goal:** Users can mark manuals as favorites and filter the list to show only favorites.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 4.1 | Toggle favorite | User can star/unstar a manual from list or detail view |
| 4.2 | Filter by favorites | Manual list has a "Favorites only" toggle; persists across sessions |

**Done when:** User favorites two manuals, enables filter, sees only those two.

---

## Phase 3 — Collaboration & History

### Epic 5: Manual Versioning

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

### Epic 6: Real-time Notifications

**Goal:** Users see toast notifications when another user modifies a manual they are viewing or have access to.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 6.1 | WebSocket/SSE infrastructure | Server pushes events to connected clients; reconnects on disconnect |
| 6.2 | Broadcast manual changes | When a manual is saved, all other connected users with access receive an event |
| 6.3 | Toast notification UI | Non-blocking toast displays: who changed what, with link to the manual |

**Done when:** User A edits a manual, User B sees a toast notification in real time.

---

## Phase 4 — Internationalization

### Epic 7: Multi-language Support

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

### Epic 8: Automated Translations

**Goal:** Users can auto-translate manual content into a target language using a translation API.

**Depends on:** Epic 7

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 8.1 | Translation API integration | Backend integrates with a translation service (e.g., DeepL, Google Translate) |
| 8.2 | Auto-translate action | User can trigger "auto-translate" for a section or full manual into a target language |
| 8.3 | Review translated content | Auto-translated text is saved as draft; user can review and edit before publishing |

**Done when:** User clicks auto-translate on an English manual to German, reviews the output, edits one section, and saves.

---

## Phase 5 — PDF Pipeline

### Epic 9: PDF Export

**Goal:** Users can export a manual as a formatted PDF document.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 9.1 | PDF generation service | Backend generates a PDF from manual data with proper formatting (title, TOC, sections, warnings) |
| 9.2 | Export action | User clicks "Export PDF" and downloads the file |
| 9.3 | Multi-language export | User can select which language variant to export |

**Done when:** User exports an English manual as PDF; the PDF contains all sections with formatted TOC and danger warnings.

---

### Epic 10: PDF Preview

**Goal:** Users can preview the PDF output in-browser before downloading.

**Depends on:** Epic 9

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 10.1 | In-browser PDF viewer | Rendered PDF is displayed in an embedded viewer (no download required) |
| 10.2 | Preview from editor | "Preview" button in the manual editor opens the PDF preview |

**Done when:** User clicks Preview, sees the PDF rendered in the browser, can then download or go back to editing.

---

### Epic 11: Automated PDF Parsing (Import)

**Goal:** Users can upload an existing PDF manual, and the system extracts structured data from it.

**Depends on:** Epic 2

| # | Story | Acceptance Criteria |
|---|-------|-------------------|
| 11.1 | PDF upload | User can upload a PDF file (with size/type validation) |
| 11.2 | Text & structure extraction | System extracts text and attempts to identify: product name, TOC, sections, warnings |
| 11.3 | Review & map extracted data | User sees extracted data mapped to manual fields; can correct before saving |
| 11.4 | Create manual from import | Confirmed import creates a new manual with the extracted data |

**Done when:** User uploads a PDF manual, system extracts content, user reviews/corrects the mapping, and a new manual is created with the data.

---

## Phase Summary

| Phase | Epics | Outcome |
|-------|-------|---------|
| **1 — Foundation** | 1 | Users can log in, admins manage users, responsive shell |
| **2 — Core** | 2, 3, 4 | Full manual CRUD with danger library and favorites |
| **3 — Collaboration** | 5, 6 | Version history, rollback, real-time notifications |
| **4 — i18n** | 7, 8 | Multi-language content with automated translation |
| **5 — PDF** | 9, 10, 11 | Export, preview, and import PDF manuals |

Each phase delivers a shippable increment. Epics within a phase can be developed in parallel where dependencies allow.
