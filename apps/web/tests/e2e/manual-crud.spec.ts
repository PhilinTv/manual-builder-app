import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Manual CRUD", () => {
  // AC-1: Admin creates new manual
  test("AC-1: Admin creates new manual from the manual list", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");

    await page.getByRole("button", { name: /new manual/i }).click();

    // Dialog appears — click "Create from scratch"
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByText(/create from scratch/i).click();

    await page.waitForURL(/\/manuals\/.+/);

    // Editor page loads with Draft badge
    await expect(page.getByTestId("manual-status-badge")).toContainText("Draft");
  });

  // AC-2: Editor does not see New Manual button
  test("AC-2: Editor does not see New Manual button", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");

    await expect(page.getByRole("button", { name: /new manual/i })).not.toBeVisible();
  });

  // AC-15: Admin can delete manual with confirmation
  test("AC-15: Admin deletes manual via confirmation dialog", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");

    // Navigate to an existing manual
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Click delete
    await page.getByRole("button", { name: /delete/i }).click();

    // Confirmation dialog appears
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("This manual will be deleted");

    // Confirm deletion
    await dialog.getByRole("button", { name: /confirm|delete/i }).click();

    // Toast appears and redirects to /manuals
    await expect(page.locator("[data-sonner-toast]")).toBeVisible();
    await page.waitForURL("/manuals");
  });

  // AC-15: Editor does not see Delete button
  test("AC-15: Editor does not see Delete button on manual page", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");

    const row = page.locator("[data-testid='manual-row']").first();
    if (await row.isVisible()) {
      await row.click();
      await page.waitForURL(/\/manuals\/.+/);
      await expect(page.getByRole("button", { name: /delete/i })).not.toBeVisible();
    }
  });

  // AC-20: Toast notifications on actions
  test("AC-20: Toast notification appears after publish action", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");

    // Filter to Draft manuals to find one that can be published
    await page.getByRole("button", { name: /draft/i }).click();
    await page.waitForTimeout(500);

    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Publish action should trigger toast
    await page.getByRole("button", { name: /publish/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible();
  });
});
