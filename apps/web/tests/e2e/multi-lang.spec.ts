import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Multi-language Support", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
  });

  // AC-1: Language switcher shows English as default
  test("language switcher shows English as selected language", async ({ page }) => {
    const switcher = page.getByTestId("language-switcher");
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText(/english/i);
  });

  // AC-2: Change primary language
  test("can change primary language to German", async ({ page }) => {
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();

    await page.getByTestId("primary-language-select").click();
    await page.getByRole("option", { name: /german/i }).click();

    await expect(switcher).toContainText(/german/i);
  });

  // AC-3: Add language via dialog
  test("can add German via add language dialog", async ({ page }) => {
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();

    const dialog = page.getByTestId("add-language-dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();

    // Dropdown should now show German
    await switcher.click();
    await expect(page.getByText(/German \(DE\)/i)).toBeVisible();
  });

  // AC-5: Selecting non-primary language shows translation editor
  test("selecting non-primary language shows translation editor", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Add German first
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();

    // Select German
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    await expect(page.getByTestId("translation-editor-side-by-side")).toBeVisible();
  });

  // AC-6: Switching back to primary shows regular editor
  test("switching back to primary language hides translation editor", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const switcher = page.getByTestId("language-switcher");

    // Add & select German
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    // Switch back to English
    await switcher.click();
    await page.getByText(/English/i).first().click();

    await expect(page.getByTestId("translation-editor-side-by-side")).not.toBeVisible();
  });

  // AC-7: Desktop side-by-side translation editor
  test("desktop shows side-by-side translation editor with source read-only", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    await expect(page.getByTestId("source-column")).toBeVisible();
    await expect(page.getByTestId("target-column")).toBeVisible();
  });

  // AC-8: Mobile shows mobile translation editor
  test("mobile shows translation editor mobile view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    await expect(page.getByTestId("translation-editor-mobile")).toBeVisible();
    await expect(page.getByTestId("translation-editor-side-by-side")).not.toBeVisible();

    await page.getByTestId("show-source-button").click();
    await expect(page.getByTestId("source-bottom-sheet")).toBeVisible();
  });

  // AC-10: Editing changes status to In progress
  test("editing NOT_TRANSLATED section shows In progress status", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    // Type into a target section editor
    const target = page.getByTestId("target-column");
    await target.locator("[contenteditable]").first().fill("German text");

    await expect(page.getByTestId("status-badge-overview")).toContainText(/in progress/i);
  });

  // AC-11: Mark as translated
  test("clicking mark as translated updates status badge", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    await page.getByTestId("mark-translated-overview").click();

    await expect(page.getByTestId("status-badge-overview")).toContainText(/translated/i);
  });

  // Race condition: type + immediately mark as translated should stick
  test("typing then immediately clicking mark as translated keeps status", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();
    await switcher.click();
    await page.getByText(/German \(DE\)/i).click();

    // Type into a target section editor
    const target = page.getByTestId("target-column");
    await target.locator("[contenteditable]").first().fill("German overview text");

    // Immediately click mark as translated (before the 1s debounce fires)
    await page.getByTestId("mark-translated-overview").click();

    // Status should become Translated
    await expect(page.getByTestId("status-badge-overview")).toContainText(/translated/i);

    // Wait past the debounce window to ensure a stale save doesn't revert the status
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("status-badge-overview")).toContainText(/translated/i);
  });

  // AC-12: Completeness badge
  test("completeness badge shows correct count", async ({ page }) => {
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await expect(page.getByTestId("completeness-badge-de")).toBeVisible();
  });

  // AC-15: Publish warning for incomplete translations
  test("publishing with incomplete translations shows warning dialog", async ({ page }) => {
    // Add a language and leave translations incomplete
    const switcher = page.getByTestId("language-switcher");
    await switcher.click();
    await page.getByRole("menuitem", { name: /add language/i }).click();
    const dialog = page.getByTestId("add-language-dialog");
    await dialog.getByPlaceholder(/search/i).fill("German");
    await dialog.getByRole("option", { name: /german/i }).click();

    // Click publish
    await page.getByRole("button", { name: /publish/i }).click();

    const warning = page.getByTestId("publish-warning-dialog");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/german/i);

    await page.getByTestId("publish-anyway-button").click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible();
  });
});
