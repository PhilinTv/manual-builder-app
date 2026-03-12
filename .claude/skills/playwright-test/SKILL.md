---
name: playwright-test
description: Validates epic acceptance criteria using Playwright E2E tests against the Next.js/React app. Checks if the dev server is running (starts it if not), takes screenshots per AC to tests/screenshots/, then returns a markdown table report with PASS/FAIL status for each stated AC.
argument-hint: "<spec file path or epic text containing acceptance criteria>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
---

# Playwright AC Validator

You are a senior QA engineer and Playwright expert. Your goal is to validate acceptance criteria (ACs) from a provided spec against a live Next.js application using Playwright, then produce a clear pass/fail report.

## Project Context

This is a **Turborepo + pnpm monorepo** with this structure:
```
apps/
  web/          # Next.js 14+ App Router (src/ directory)
packages/
  db/           # Prisma schema + client
```

Key conventions:
- **Package manager:** pnpm (always use `pnpm` commands, never npm/yarn)
- **Next.js App Router** with `src/app/` directory in `apps/web/`
- **UI:** shadcn/ui (Radix + Tailwind) — components use `data-testid`, ARIA roles, and semantic HTML
- **Auth:** NextAuth.js v5 with session-based auth (credentials provider)
- **Database:** PostgreSQL + Prisma ORM (schema in `packages/db/prisma/schema.prisma`)
- **Dev server:** `pnpm dev` from root (Turborepo runs `apps/web` dev), or `pnpm --filter web dev`
- **Test runner:** Playwright config lives at `apps/web/playwright.config.ts`
- **Screenshots:** `tests/screenshots/` at repo root

## Input

The argument `$ARGUMENTS` is either:
- A **file path** to a spec (e.g., `docs/epic-1_spec.md`) — read the file and extract ACs from the Section 7 table.
- Raw **epic text** containing acceptance criteria.

If `$ARGUMENTS` is empty, ask the user to provide the spec file path or epic text before continuing.

---

## Step 1 — Parse Acceptance Criteria

If the input is a file path, read the file first. Extract every acceptance criterion:

- From spec files: parse the Section 7 "Acceptance Criteria" table. Use the existing `#`, `Criterion`, `Type`, and `Test` columns.
- From raw text: identify ACs from any format (numbered lists, bullets, `AC:` prefixes, Given/When/Then, prose) and assign sequential IDs.

For each AC, note:
- **AC ID** and description
- **Type** (`e2e`, `unit`, `integration`, `manual`)
- **Relevant page/route** it touches
- **UI-testable?** — Only `e2e` type ACs will be automated. Mark `unit`, `integration`, and `manual` ACs as `⚠️ SKIP` (they are validated by other test runners, not Playwright).

Print the parsed list so the user can verify before proceeding.

---

## Step 2 — Pre-flight Checks

Run all checks in order. Stop and report clearly if a blocker is found.

### 2a. Project sanity check

Verify the monorepo structure:
```bash
ls apps/web/package.json 2>/dev/null && echo "found" || echo "missing"
```

If missing, inform the user: "Monorepo not scaffolded yet. Please run the E1 scaffolding tasks first." Stop execution.

### 2b. Screenshots directory + .gitignore

```bash
mkdir -p tests/screenshots
```

Read `.gitignore` (it may not exist yet). Ensure these entries are present — append if missing:

```
# Playwright screenshots
tests/screenshots/

# Generated Playwright test specs
tests/playwright/
```

### 2c. Playwright installation

Check if `@playwright/test` is available in the web app:

```bash
ls apps/web/node_modules/@playwright/test 2>/dev/null && echo "installed" || echo "missing"
```

If missing:
```bash
pnpm --filter web add -D @playwright/test
pnpm --filter web exec playwright install chromium
```

If already installed, ensure the Chromium browser binary exists:
```bash
pnpm --filter web exec playwright install chromium 2>&1 | tail -5
```

### 2d. Dev server

Determine if the Next.js dev server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "0"
```

- If the response is `200`, `301`, or `302`, the server is running. Note `BASE_URL=http://localhost:3000`.
- If not, start it:

```bash
pnpm --filter web dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid
```

Then poll until ready (up to 30 seconds), checking every 3 seconds:

```bash
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "0")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    echo "Server ready"
    break
  fi
  echo "Waiting... ($i/10)"
  sleep 3
done
```

If the server never becomes ready, show the last 20 lines of `/tmp/next-dev.log` and stop.

### 2e. Database & seed data

Check if the database is accessible and has seed data for testing:

```bash
pnpm --filter db exec prisma db seed 2>&1 | tail -5
```

If this fails, warn the user that tests requiring login or existing data may fail without seed data.

---

## Step 3 — Explore the App

Before writing tests, understand the app's current state:

1. Check the App Router structure:
   ```bash
   find apps/web/src/app -name "page.tsx" -o -name "layout.tsx" | head -30
   ```

2. Read the top-level route files to understand available pages, their URLs, and route groups (e.g., `(auth)`, `(dashboard)`).

3. For each AC's relevant area, look for the corresponding page/component file and read it to understand:
   - The actual DOM structure (for reliable selectors)
   - Any `data-testid` attributes already on elements
   - shadcn/ui components used (they have predictable ARIA roles)
   - How auth state is managed (NextAuth session)

4. Check for an existing Playwright config:
   ```bash
   ls apps/web/playwright.config.* 2>/dev/null && echo "found" || echo "missing"
   ```

5. Check for existing test helpers (login helpers, seed helpers):
   ```bash
   find apps/web/tests -name "*.ts" 2>/dev/null | head -20
   ```

Use this information to write accurate, non-brittle selectors. **Selector priority:** `data-testid` > ARIA roles (`getByRole`) > visible text (`getByText`) > CSS selectors (last resort).

---

## Step 4 — Discover or Generate Playwright Tests

### 4a. Discover existing tests first

Before generating anything, check if tests already exist for this epic's ACs. Search for:

1. **Test files named in the spec** (from Section 8 Test Plan or Section 7 Test column):
   ```bash
   ls apps/web/tests/e2e/<name>.spec.ts 2>/dev/null
   ```

2. **Tests tagged with AC-IDs** (written by `/write-tests`):
   ```bash
   grep -r "AC-\d\+" apps/web/tests/e2e/ --include="*.spec.ts" -l
   ```

If existing test files cover ALL e2e ACs (identified by `AC-N:` in test names), **skip test generation** and go directly to Step 6 (Run). Print which existing tests map to which ACs.

If existing tests cover SOME ACs, only generate tests for the uncovered ones and merge them into the appropriate existing file.

### 4b. Generate tests for uncovered ACs

If tests need to be generated, create them in the **standard test directory** (`apps/web/tests/e2e/`) following project conventions — NOT in `tests/playwright/`. Use the test file name from the spec's Section 8 Test Plan.

The generated tests must:
- Import from `@playwright/test`
- Use `baseURL` from the Playwright config (port 3100 per `apps/web/playwright.config.ts`)
- Have one `test()` per UI-testable (e2e) AC
- **Name each test with AC-ID prefix:** `"AC-{N}: {description}"` — this enables `/verify-implementation` to map results to ACs
- Take a screenshot at the end of every test (pass or fail) using an `afterEach` hook writing to `tests/screenshots/ac-{N}-{slug}.png`
- Include proper auth setup (login via the app's login page or API) where tests require an authenticated session
- Use existing test helpers from `apps/web/tests/e2e/helpers/` (auth.ts, seed.ts)

### Auth Helper Pattern

For tests that require login, use this pattern:

```typescript
async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(`${BASE_URL}/`);  // or whatever the post-login redirect is
}
```

Adjust selectors after reading the actual login page in Step 3.

### Test Seed Data

Use the known seed data from the Prisma seed script. Default admin credentials: `admin@example.com` / password from seed. If seed data structure is unclear, read `packages/db/prisma/seed.ts` to determine credentials and test users.

### Template

```typescript
import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
// Resolve screenshots dir relative to this test file (repo-root/tests/screenshots)
const SCREENSHOTS_DIR = path.join(path.dirname(__filename), '..', 'screenshots');

// Auth helper — adjust selectors based on actual page structure
async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(?!login|register)/);
}

test.describe('Epic AC Validation', () => {

  test.afterEach(async ({ page }, testInfo) => {
    const slug = testInfo.title
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 60);
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    testInfo.attachments.push({
      name: 'screenshot',
      path: screenshotPath,
      contentType: 'image/png',
    });
  });

  test('AC-1: <description>', async ({ page }) => {
    await loginAs(page, 'admin@example.com', 'password');
    // Navigate and assert
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  // Repeat for each e2e AC...

});
```

Write **real test bodies** — not placeholder comments. Each test body must:
1. Set up auth state if needed (login as the correct role)
2. Navigate to the relevant URL
3. Perform the interaction described in the AC
4. Assert the expected outcome using Playwright's `expect()` API
5. The `afterEach` hook handles screenshots automatically

For **responsive/mobile tests**, set the viewport:
```typescript
test('AC-17: sidebar collapses to hamburger on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  // ...
});
```

---

## Step 5 — Create or Update Playwright Config

Check if `apps/web/playwright.config.ts` exists. If not, create it:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../../tests/playwright',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: '../../tests/playwright-results',
});
```

If it already exists, read it and verify `testDir` and `baseURL` are correct — adjust only if needed.

---

## Step 6 — Run the Tests

Execute from the `apps/web` directory (where playwright.config.ts lives):

```bash
cd apps/web && pnpm exec playwright test ../../tests/playwright/ac-validation.spec.ts \
  --reporter=json \
  --output=../../tests/playwright-results \
  2>&1 | tee /tmp/playwright-results.json
```

Also run with the list reporter for a human-readable summary:

```bash
cd apps/web && pnpm exec playwright test ../../tests/playwright/ac-validation.spec.ts \
  --reporter=list \
  2>&1 | tee /tmp/playwright-list.txt
```

Capture exit code. Parse `/tmp/playwright-results.json` to extract per-test status (passed/failed/skipped), duration, and error messages.

**Retry policy:** If tests fail due to clear environment issues (e.g., page not found, server error), investigate the error, fix the test file, and re-run once. Do NOT retry more than 2 total runs. If the same test fails twice, mark it FAIL in the report and document the failure message.

---

## Step 7 — Generate Report

After the run, produce and print the full report to the user:

```markdown
# Epic AC Validation Report

**Date:** {YYYY-MM-DD}
**App:** http://localhost:3000
**Spec:** {spec file path if provided}
**Test file:** tests/playwright/ac-validation.spec.ts
**Ran:** {N} automated tests + {M} skipped (unit/integration/manual)

---

## Results Summary

| AC   | Description                          | Status      | Screenshot                                  | Notes                          |
|------|--------------------------------------|-------------|---------------------------------------------|--------------------------------|
| AC-1 | <brief AC text>                      | ✅ PASS     | `tests/screenshots/ac-1-<slug>.png`         |                                |
| AC-2 | <brief AC text>                      | ❌ FAIL     | `tests/screenshots/ac-2-<slug>.png`         | Button not found               |
| AC-3 | <brief AC text>                      | ⚠️ SKIP     | —                                           | unit test — run via `pnpm test` |

---

## Detailed Results

### AC-1: <full AC text>
- **Status:** ✅ PASS
- **Duration:** 1.2s
- **Screenshot:** `tests/screenshots/ac-1-<slug>.png`
- **Validation:** Asserted that `<element>` was visible and contained `<value>`.

### AC-2: <full AC text>
- **Status:** ❌ FAIL
- **Duration:** 5.1s
- **Screenshot:** `tests/screenshots/ac-2-<slug>.png`
- **Error:** `<playwright error message>`
- **Suggested fix:** <brief actionable suggestion>

### AC-3: <full AC text>
- **Status:** ⚠️ SKIP
- **Type:** unit
- **Reason:** This AC is a unit/integration test. Run with `pnpm test` (Vitest) instead of Playwright.

---

## Overall: {X}/{total e2e} e2e ACs passed | {Y} skipped (unit/integration/manual)
```

Also save this report to `tests/playwright-report.md` (overwrite if exists).

---

## Important Rules

- **Never stop the dev server** after tests — leave it running for the user.
- **Always capture screenshots** — even for failing tests. The `afterEach` hook ensures this.
- **One test per AC** — keep tests atomic and independent.
- **No brittle selectors** — prefer `data-testid`, ARIA roles (`getByRole`), and visible text (`getByText`) over CSS classes or XPath. shadcn/ui components have good ARIA support — use it.
- **Skip non-e2e ACs** — mark `unit`, `integration`, and `manual` ACs as `⚠️ SKIP` with a note about which test runner covers them. Do NOT try to test backend-only logic with Playwright.
- **Do not delete existing tests** — if `ac-validation.spec.ts` already exists, merge; never overwrite wholesale.
- **Monorepo awareness** — always run pnpm commands from repo root with `--filter web` or `cd apps/web` for Playwright commands. Test files live at repo-root `tests/playwright/`, not inside `apps/web/`.
