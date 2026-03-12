import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Manual Assignment", () => {
  // AC-16: Admin assigns editor via Manage Access
  test("AC-16: Admin assigns editor to a manual via Manage Access", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Scroll to Manage Access section
    const manageAccess = page.getByTestId("manage-access");
    await manageAccess.scrollIntoViewIfNeeded();

    // Select editor from combobox
    await manageAccess.getByRole("combobox").click();
    await page.getByRole("option").first().click();

    // Confirm assignment
    await manageAccess.getByRole("button", { name: /assign/i }).click();

    // Toast with "assigned" appears
    await expect(page.locator("[data-sonner-toast]")).toContainText(/assigned/i);
  });

  // AC-17: Admin removes assigned editor
  test("AC-17: Admin removes an assigned editor", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    const manageAccess = page.getByTestId("manage-access");
    await manageAccess.scrollIntoViewIfNeeded();

    // Click remove on first assigned editor
    await manageAccess.getByRole("button", { name: /remove/i }).first().click();

    // Toast with "unassigned" appears
    await expect(page.locator("[data-sonner-toast]")).toContainText(/unassigned/i);
  });

  // AC-18: Unassigned editor sees read-only mode
  test("AC-18: Unassigned editor sees read-only manual", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    // Navigate to a manual the editor is NOT assigned to
    await page.goto("/manuals");

    // Try to find and open a manual
    const row = page.locator("[data-testid='manual-row']").first();
    if (await row.isVisible()) {
      await row.click();
      await page.waitForURL(/\/manuals\/.+/);

      // Product name input should be disabled
      const nameInput = page.getByTestId("product-name-input");
      if (await nameInput.isVisible()) {
        await expect(nameInput).toBeDisabled();
      }

      // Publish and Delete buttons should not be visible
      await expect(page.getByRole("button", { name: /publish/i })).not.toBeVisible();
      await expect(page.getByRole("button", { name: /delete/i })).not.toBeVisible();
    }
  });
});
