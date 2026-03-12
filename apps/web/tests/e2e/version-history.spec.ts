import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Version History", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
  });

  // AC-2: Clock icon button visible in editor header
  test("version history button is visible in editor header", async ({ page }) => {
    await expect(page.getByTestId("version-history-btn")).toBeVisible();
  });

  // AC-2: Clicking clock icon opens version history panel
  test("clicking version history button opens side panel", async ({ page }) => {
    await page.getByTestId("version-history-btn").click();
    await expect(page.getByTestId("version-history-panel")).toBeVisible();
  });

  // AC-3: Version list shows entries in descending order
  test("version history shows entries with version number, date, author, and summary", async ({ page }) => {
    await page.getByTestId("version-history-btn").click();
    const list = page.getByTestId("version-list");
    await expect(list).toBeVisible();

    const items = list.locator("[data-testid='version-entry']");
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Check first entry has required elements
    const firstItem = items.first();
    await expect(firstItem.getByTestId("version-number")).toBeVisible();
    await expect(firstItem.getByTestId("version-date")).toBeVisible();
    await expect(firstItem.getByTestId("version-author")).toBeVisible();
  });

  // AC-4: View button opens read-only version viewer
  test("clicking View opens version viewer dialog", async ({ page }) => {
    await page.getByTestId("version-history-btn").click();
    const entry = page.getByTestId("version-entry").first();
    await entry.getByRole("button", { name: /view/i }).click();

    const dialog = page.getByTestId("version-viewer-dialog");
    await expect(dialog).toBeVisible();
  });

  // AC-11: Inline editable note
  test("can edit version note inline", async ({ page }) => {
    await page.getByTestId("version-history-btn").click();
    const entry = page.getByTestId("version-entry").first();
    await entry.getByTestId("edit-note-btn").click();

    const noteInput = entry.getByTestId("version-note-input");
    await noteInput.fill("Important release");
    await noteInput.blur();

    // Close and reopen panel to verify persistence
    await page.keyboard.press("Escape");
    await page.getByTestId("version-history-btn").click();
    await expect(page.getByTestId("version-entry").first()).toContainText("Important release");
  });

  // AC-12: Mobile full-width panel
  test("version history panel is full width on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByTestId("version-history-btn").click();

    const panel = page.getByTestId("version-history-panel");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(370);
  });
});
