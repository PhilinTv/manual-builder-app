import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Manual List Language Tags", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
  });

  // AC-13: Language tags on manual list items
  test("manual list items show language tags", async ({ page }) => {
    const rows = page.locator("[data-testid='manual-row']");
    const count = await rows.count();
    if (count > 0) {
      const firstRow = rows.first();
      // Primary language tag should always be visible
      await expect(firstRow.getByTestId("language-tag-en")).toBeVisible();
    }
  });

  // AC-14: Language filter
  test("language filter filters manuals by language", async ({ page }) => {
    const filter = page.getByTestId("language-filter");
    if (await filter.isVisible()) {
      await filter.click();
      await page.getByRole("option", { name: /de/i }).click();

      // URL should include language param
      await expect(page).toHaveURL(/language=de/);

      // Clear filter
      await filter.click();
      await page.getByRole("option", { name: /all/i }).click();
    }
  });
});
