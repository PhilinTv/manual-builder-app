---
name: playwright-test
description: Validates epic acceptance criteria using Playwright E2E tests against the Next.js/React app. Checks if the dev server is running (starts it if not), takes screenshots per AC to tests/screenshots/, then returns a markdown table report with PASS/FAIL status for each stated AC.
argument-hint: "<epic text containing acceptance criteria>"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
---

# Playwright AC Validator

You are a senior QA engineer and Playwright expert. Your goal is to validate acceptance criteria (ACs) from a provided epic against a live Next.js application using Playwright, then produce a clear pass/fail report.

## Input

The epic text (with acceptance criteria) is in `$ARGUMENTS`. If `$ARGUMENTS` is empty, ask the user to provide the epic text before continuing.

---

## Step 1 — Parse Acceptance Criteria

Extract every acceptance criterion from `$ARGUMENTS`. Rules:
- Identify ACs from any format: numbered lists, bullet points, `AC:` prefixes, `Given/When/Then`, or prose.
- Assign each a sequential ID: AC-1, AC-2, AC-3, …
- For each AC, also note: the **relevant app area** (page or feature it touches) and whether it is **UI-testable** vs **backend-only**.
- Mark backend-only ACs as `⚠️ MANUAL` upfront — they will be excluded from automated tests but still appear in the report.

Print the parsed list so the user can verify before proceeding.

---

## Step 2 — Pre-flight Checks

Run all checks in order. Stop and report clearly if a blocker is found.

### 2a. Project sanity check

```bash
ls package.json 2>/dev/null && echo "found" || echo "missing"
```

If `package.json` is missing, inform the user: "No package.json found. Please scaffold your Next.js project first (e.g. `pnpm create next-app .`), then re-run this skill." Stop execution.

### 2b. Screenshots directory + .gitignore

```bash
mkdir -p tests/screenshots
```

Read `.gitignore` (it may not exist yet). Ensure `tests/screenshots/` is present in it. If missing or the file doesn't exist, append the entry:

```
# Playwright screenshots
tests/screenshots/
```

Also add `tests/playwright/` to `.gitignore` if not already present (test specs are generated — keep them out of accidental commits):

```
# Generated Playwright test specs
tests/playwright/
```

### 2c. Playwright installation

Check if `@playwright/test` is available:

```bash
ls node_modules/@playwright/test 2>/dev/null && echo "installed" || echo "missing"
```

If missing:
```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

If already installed, ensure the Chromium browser binary exists:
```bash
pnpm exec playwright install chromium 2>&1 | tail -5
```

### 2d. Dev server

Determine if the Next.js dev server is already running:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "0"
```

- If the response is `200`, `301`, or `302`, the server is running. Note `BASE_URL=http://localhost:3000`.
- If not, find the configured port (check `package.json` scripts and `next.config.*` for a custom port, default is 3000).
- Start the server in the background and wait for it to be ready:

```bash
pnpm run dev > /tmp/next-dev.log 2>&1 &
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

---

## Step 3 — Explore the App

Before writing tests, understand the app's structure:

1. Check if the router is App Router (`app/` directory) or Pages Router (`pages/` directory):
   ```bash
   ls -d app pages 2>/dev/null
   ```

2. Read the top-level route files to understand available pages and their URLs.

3. For each AC's relevant area, look for the corresponding page/component file and read it to understand:
   - The actual DOM structure (for reliable selectors)
   - Any data-testid attributes already on elements
   - How state is managed

4. Check for an existing Playwright config:
   ```bash
   ls playwright.config.* 2>/dev/null && echo "found" || echo "missing"
   ```

Use this information to write accurate, non-brittle selectors (prefer `data-testid`, then ARIA roles, then text content — avoid CSS class selectors).

---

## Step 4 — Generate Playwright Test File

Create `tests/playwright/ac-validation.spec.ts`. If the file already exists, read it first and merge new ACs rather than overwriting.

The file must:
- Import from `@playwright/test`
- Use `baseURL` from the Playwright config or hard-code `http://localhost:3000`
- Have one `test()` per UI-testable AC
- Take a screenshot at the end of every test (pass or fail) using an `afterEach` hook writing to `tests/screenshots/ac-{N}-{slug}.png`
- Name each test `"AC-{N}: {description}"` for clear identification in reports

### Template

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

test.describe('Epic AC Validation', () => {

  test.afterEach(async ({ page }, testInfo) => {
    // Always capture a screenshot, even on failure
    const slug = testInfo.title
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .slice(0, 60);
    const screenshotPath = path.join('tests/screenshots', `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    testInfo.attachments.push({
      name: 'screenshot',
      path: screenshotPath,
      contentType: 'image/png',
    });
  });

  test('AC-1: <description>', async ({ page }) => {
    await page.goto(`${BASE_URL}/relevant-route`);
    // Perform interactions described by AC-1
    // Assert expected outcome
    await expect(page.getByRole('heading', { name: /expected text/i })).toBeVisible();
  });

  // Repeat for each AC...

});
```

Write real test bodies — not placeholder comments. Each test body must:
1. Navigate to the relevant URL
2. Perform any prerequisite setup (login, form fill, etc.) if required
3. Perform the interaction described in the AC
4. Assert the expected outcome using Playwright's `expect()` API
5. The `afterEach` hook will handle screenshots automatically

---

## Step 5 — Create or Update Playwright Config

Check if `playwright.config.ts` (or `.js`) exists. If not, create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
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
  outputDir: 'tests/playwright-results',
});
```

If it already exists, read it and verify `testDir` and `baseURL` are correct — adjust only if needed.

---

## Step 6 — Run the Tests

Execute the AC validation spec:

```bash
pnpm exec playwright test tests/playwright/ac-validation.spec.ts \
  --reporter=json \
  --output=tests/playwright-results \
  2>&1 | tee /tmp/playwright-results.json
```

Also run with the list reporter to get a human-readable summary:

```bash
pnpm exec playwright test tests/playwright/ac-validation.spec.ts \
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
**Test file:** tests/playwright/ac-validation.spec.ts
**Ran:** {N} automated tests + {M} manual checks

---

## Results Summary

| AC   | Description                          | Status      | Screenshot                                  | Notes                          |
|------|--------------------------------------|-------------|---------------------------------------------|--------------------------------|
| AC-1 | <brief AC text>                      | ✅ PASS     | `tests/screenshots/ac-1-<slug>.png`         |                                |
| AC-2 | <brief AC text>                      | ❌ FAIL     | `tests/screenshots/ac-2-<slug>.png`         | Button not found               |
| AC-3 | <brief AC text>                      | ⚠️ MANUAL   | —                                           | Backend-only, cannot automate  |

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
- **Status:** ⚠️ MANUAL
- **Reason:** This AC validates a backend behaviour (e.g., data persistence, email delivery) that cannot be verified through browser UI automation.
- **Manual test steps:**
  1. <step>
  2. <step>

---

## Overall: {X}/{total} ACs passed ({Y} automated, {Z} manual)
```

Also save this report to `tests/playwright-report.md` (overwrite if exists).

---

## Important Rules

- **Never stop the dev server** after tests — leave it running for the user.
- **Always capture screenshots** — even for failing tests. The `afterEach` hook ensures this.
- **One test per AC** — keep tests atomic and independent.
- **No brittle selectors** — prefer `data-testid`, ARIA roles (`getByRole`), and visible text (`getByText`) over CSS classes or XPath.
- **Manual ACs still appear in the report** — mark them `⚠️ MANUAL` and include hand-test steps.
- **Do not delete existing tests** — if `ac-validation.spec.ts` already exists, merge; never overwrite wholesale.
- **Ambiguous ACs** — if an AC cannot be mapped to a specific UI interaction, mark it `⚠️ MANUAL` and explain why.
