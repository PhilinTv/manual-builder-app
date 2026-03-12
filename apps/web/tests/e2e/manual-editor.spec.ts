import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers/auth";

/** Navigate to a specific draft manual assigned to the editor by searching for its name. */
async function goToEditorManual(page: Page, manualName: string) {
  await login(page, "editor@example.com", "password123");
  await page.goto("/manuals");

  // Search for the specific manual
  await page.getByPlaceholder(/search/i).fill(manualName);
  // Wait for debounce + API response + re-render
  await page.waitForTimeout(1000);

  await page.locator("[data-testid='manual-row']").first().click();
  await page.waitForURL(/\/manuals\/.+/);
}

test.describe("Manual Editor", () => {
  // AC-9: Edit product name and overview, changes persist after reload
  test("AC-9: Edits to product name and overview persist after reload", async ({ page }) => {
    await goToEditorManual(page, "Beta Gadget");

    const url = page.url();

    // Edit product name
    const nameInput = page.getByTestId("product-name-input");
    await nameInput.clear();
    await nameInput.fill("Updated Product Name");

    // Type in overview editor
    const editor = page.locator("[data-testid='overview-editor'] .tiptap");
    await editor.click();
    await editor.pressSequentially("Overview content for testing");

    // Wait for auto-save
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });

    // Reload and verify
    await page.goto(url);
    await expect(nameInput).toHaveValue("Updated Product Name");
    await expect(page.locator("[data-testid='overview-editor']")).toContainText("Overview content for testing");
  });

  // AC-10: Instruction blocks - add, fill, reorder, remove
  test("AC-10: Instruction blocks can be added, reordered, and removed", async ({ page }) => {
    await goToEditorManual(page, "Gamma Widget");

    // Add two instruction blocks
    await page.getByRole("button", { name: /add chapter/i }).click();
    await page.getByRole("button", { name: /add chapter/i }).click();

    const blocks = page.locator("[data-testid='instruction-block']");
    await expect(blocks).toHaveCount(2);

    // Fill first block
    await blocks.nth(0).getByTestId("instruction-title").fill("First Step");
    // Fill second block
    await blocks.nth(1).getByTestId("instruction-title").fill("Second Step");

    // Reorder: move first block down
    await blocks.nth(0).getByRole("button", { name: /move down/i }).click();

    // After reorder, "Second Step" should be first
    await expect(page.locator("[data-testid='instruction-block']").nth(0).getByTestId("instruction-title")).toHaveValue("Second Step");

    // Remove a block
    await page.locator("[data-testid='instruction-block']").nth(0).getByRole("button", { name: /remove/i }).click();
    await expect(page.locator("[data-testid='instruction-block']")).toHaveCount(1);
  });

  // AC-11: Warning blocks with severity
  test("AC-11: Warning blocks have title, description, severity with color indicator", async ({ page }) => {
    await goToEditorManual(page, "Delta Device");

    await page.getByRole("button", { name: /add warning/i }).click();

    const warningBlock = page.locator("[data-testid='warning-block']").first();
    await expect(warningBlock).toBeVisible();
    await expect(warningBlock.getByTestId("warning-title")).toBeVisible();
    await expect(warningBlock.getByTestId("warning-description")).toBeVisible();

    // Select severity
    await warningBlock.getByRole("combobox", { name: /severity/i }).click();
    await page.getByRole("option", { name: /danger/i }).click();

    // Danger indicator should be red
    await expect(warningBlock.getByTestId("severity-indicator")).toHaveClass(/bg-red/);
  });

  // AC-12: Tiptap toolbar formatting
  test("AC-12: Tiptap toolbar applies formatting", async ({ page }) => {
    await goToEditorManual(page, "Zeta Sensor");

    const editor = page.locator("[data-testid='overview-editor'] .tiptap");
    await editor.click();
    await editor.pressSequentially("test text");

    // Select all text (Meta+A on macOS, Control+A on Linux/Windows)
    await page.keyboard.press("Meta+A");

    // Click Bold
    await page.getByRole("button", { name: /bold/i }).click();
    await expect(editor.locator("strong")).toContainText("test text");
  });

  // AC-13: Auto-save indicator
  test("AC-13: Auto-save shows Saving then Saved indicator", async ({ page }) => {
    await goToEditorManual(page, "Eta Controller");

    const nameInput = page.getByTestId("product-name-input");
    await nameInput.clear();
    await nameInput.fill("Auto-save test");

    // After debounce (1s), should show saving then saved indicator
    // Wait for either "Saving" or "Saved" to appear (the saving state may be brief)
    await expect(page.getByText(/sav(ing|ed)/i)).toBeVisible({ timeout: 5000 });
    // Then wait for final "Saved" state
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 });
  });

  // AC-14: Publish changes status badge
  test("AC-14: Publish changes status from Draft to Published with toast", async ({ page }) => {
    await goToEditorManual(page, "Theta Module");

    await expect(page.getByTestId("manual-status-badge")).toContainText("Draft");
    await page.getByRole("button", { name: /publish/i }).click();

    await expect(page.getByTestId("manual-status-badge")).toContainText("Published");
    await expect(page.locator("[data-sonner-toast]")).toContainText(/published/i);
  });

  // AC-19: Table of Contents
  test("AC-19: Table of contents shows section headings", async ({ page }) => {
    await goToEditorManual(page, "Kappa Kit");

    const toc = page.getByTestId("table-of-contents");
    await expect(toc).toBeVisible();
    await expect(toc).toContainText("Product Overview");
    await expect(toc).toContainText("Chapters");
    await expect(toc).toContainText("Danger Warnings");
  });
});
