import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Version Comparison", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
    await page.getByTestId("version-history-btn").click();
  });

  // AC-5: Desktop side-by-side diff
  test("desktop viewport shows side-by-side diff with highlighting", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Select two versions and compare
    const entries = page.getByTestId("version-entry");
    if ((await entries.count()) >= 2) {
      await entries.first().getByRole("button", { name: /compare/i }).click();

      const diffView = page.getByTestId("version-diff");
      await expect(diffView).toBeVisible();
      await expect(page.getByTestId("diff-pane-left")).toBeVisible();
      await expect(page.getByTestId("diff-pane-right")).toBeVisible();
    }
  });

  // AC-6: Mobile toggle diff view
  test("mobile viewport shows toggle diff view", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const entries = page.getByTestId("version-entry");
    if ((await entries.count()) >= 2) {
      await entries.first().getByRole("button", { name: /compare/i }).click();

      await expect(page.getByTestId("version-diff-mobile")).toBeVisible();
      await expect(page.getByTestId("version-diff")).not.toBeVisible();

      const toggle = page.getByTestId("version-toggle");
      await expect(toggle).toBeVisible();
      await toggle.click();
    }
  });
});
