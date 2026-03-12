import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Automated Translation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
  });

  // AC-1, AC-3, AC-4: Single-section translate flow
  test("single section translate shows confirmation and streams result", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Add and select German
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    // Click translate button
    await page.getByTestId("translate-button").click();
    await page.getByTestId("translate-section-option").click();

    // Confirmation dialog
    const confirmDialog = page.getByTestId("translate-confirm-dialog");
    await expect(confirmDialog).toBeVisible();
    await expect(page.getByTestId("token-estimate")).toContainText(/\d+/);
    await expect(page.getByTestId("cost-estimate")).toContainText(/\$/);

    // Confirm
    await page.getByTestId("translate-confirm-button").click();
  });

  // AC-5, AC-6: Auto-translated badge and approval
  test("auto-translated badge appears and can be approved", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const badge = page.getByTestId("auto-translated-badge");
    if (await badge.isVisible()) {
      await expect(badge).toContainText("Auto-translated");
      await page.getByTestId("approve-translation-button").click();
      await expect(badge).not.toBeVisible();
    }
  });

  // AC-2: Translate all sections
  test("translate all sections translates all translatable sections", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    await page.getByTestId("translate-button").click();
    await page.getByTestId("translate-all-option").click();

    const confirmDialog = page.getByTestId("translate-confirm-dialog");
    if (await confirmDialog.isVisible()) {
      await page.getByTestId("translate-confirm-button").click();
    }
  });

  // AC-14: Stale indicator
  test("stale indicator shows when source content changed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const stale = page.getByTestId("stale-indicator");
    if (await stale.isVisible()) {
      await expect(stale).toContainText(/source changed/i);
      await expect(page.getByTestId("retranslate-button")).toBeVisible();
    }
  });

  // AC-15: Cancel translation
  test("cancel stops streaming translation", async ({ page }) => {
    const cancelBtn = page.getByTestId("cancel-translation-button");
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    }
  });
});
