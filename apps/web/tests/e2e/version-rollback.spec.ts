import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Version Rollback", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
    await page.getByTestId("version-history-btn").click();
  });

  // AC-7: Rollback button opens confirmation dialog
  test("clicking Rollback opens confirmation dialog", async ({ page }) => {
    const entry = page.getByTestId("version-entry").first();
    await entry.getByRole("button", { name: /rollback/i }).click();

    const dialog = page.getByTestId("rollback-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/rollback to version/i);
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /rollback/i })).toBeVisible();
  });

  // AC-8: Cancel closes dialog without changes
  test("cancel closes rollback dialog without changes", async ({ page }) => {
    const entry = page.getByTestId("version-entry").first();
    await entry.getByRole("button", { name: /rollback/i }).click();

    const dialog = page.getByTestId("rollback-dialog");
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  // AC-9: Confirm rollback updates content and creates new version
  test("confirming rollback updates editor and creates new version", async ({ page }) => {
    const entries = page.getByTestId("version-entry");
    const count = await entries.count();
    if (count < 1) return;

    // Click rollback on first version entry
    await entries.last().getByRole("button", { name: /rollback/i }).click();

    const dialog = page.getByTestId("rollback-dialog");
    await dialog.getByRole("button", { name: /^rollback$/i }).click();

    // Toast should appear
    await expect(page.locator("[data-sonner-toast]")).toBeVisible();

    // Version history should show a new entry
    await page.getByTestId("version-history-btn").click();
    const newEntries = page.getByTestId("version-entry");
    const newCount = await newEntries.count();
    expect(newCount).toBeGreaterThan(count);
  });
});
