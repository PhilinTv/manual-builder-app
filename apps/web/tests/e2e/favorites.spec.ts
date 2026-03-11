import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Favorites", () => {
  // AC-1: Click star on unfavorited manual -> data-favorited="true"
  test("clicking star on unfavorited manual sets data-favorited to true", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");
    await expect(starBtn).toHaveAttribute("data-favorited", "false");

    await starBtn.click();
    await expect(starBtn).toHaveAttribute("data-favorited", "true");
  });

  // AC-2: Click filled star on favorited manual -> data-favorited="false"
  test("clicking star on favorited manual sets data-favorited to false", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");

    // Favorite it first
    if ((await starBtn.getAttribute("data-favorited")) === "false") {
      await starBtn.click();
      await expect(starBtn).toHaveAttribute("data-favorited", "true");
    }

    // Now unfavorite
    await starBtn.click();
    await expect(starBtn).toHaveAttribute("data-favorited", "false");
  });

  // AC-3: Click star in editor header -> data-favorited="true"
  test("clicking star in editor header sets data-favorited to true", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Navigate to first manual
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForSelector("[data-testid='product-name-input']");

    const starBtn = page.locator("button[data-favorited]");
    // Ensure it starts unfavorited
    if ((await starBtn.getAttribute("data-favorited")) === "true") {
      await starBtn.click();
      await expect(starBtn).toHaveAttribute("data-favorited", "false");
    }

    await starBtn.click();
    await expect(starBtn).toHaveAttribute("data-favorited", "true");
  });

  // AC-4: Click filled star in editor header -> data-favorited="false"
  test("clicking filled star in editor header sets data-favorited to false", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForSelector("[data-testid='product-name-input']");

    const starBtn = page.locator("button[data-favorited]");
    // Ensure it is favorited
    if ((await starBtn.getAttribute("data-favorited")) === "false") {
      await starBtn.click();
      await expect(starBtn).toHaveAttribute("data-favorited", "true");
    }

    await starBtn.click();
    await expect(starBtn).toHaveAttribute("data-favorited", "false");
  });

  // AC-5: Optimistic UI - data-favorited flips immediately before API resolves
  test("optimistic UI: data-favorited flips immediately before API response", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Intercept toggle API with 3-second delay
    await page.route("**/api/manuals/*/favorite", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ favorited: true }),
      });
    });

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");

    // Ensure unfavorited
    if ((await starBtn.getAttribute("data-favorited")) === "true") {
      await page.unroute("**/api/manuals/*/favorite");
      await starBtn.click();
      await page.waitForTimeout(500);
      await page.route("**/api/manuals/*/favorite", async (route) => {
        await new Promise((r) => setTimeout(r, 3000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ favorited: true }),
        });
      });
    }

    await starBtn.click();
    // Should flip immediately
    await expect(starBtn).toHaveAttribute("data-favorited", "true");
  });

  // AC-6: Rollback on API error + toast
  test("rollback on API error and shows toast", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Intercept toggle API to return 500
    await page.route("**/api/manuals/*/favorite", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");
    const original = await starBtn.getAttribute("data-favorited");

    await starBtn.click();

    // Wait for rollback
    await expect(starBtn).toHaveAttribute("data-favorited", original!);

    // Toast should appear
    const toast = page.locator('[role="status"], [class*="toast"]');
    await expect(toast.first()).toBeVisible();
  });

  // AC-7: Favorites chip visible in filter bar
  test("Favorites chip is visible in filter bar", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const chip = page.getByRole("button", { name: /favorites/i });
    await expect(chip).toBeVisible();
  });

  // AC-8: Favorite 2 of 5 manuals, click Favorites chip -> 2 rows
  test("Favorites filter shows only favorited manuals", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const rows = page.locator("[data-testid='manual-row']");
    const totalCount = await rows.count();

    // Favorite first two manuals
    for (let i = 0; i < 2 && i < totalCount; i++) {
      const starBtn = rows.nth(i).locator("button[data-favorited]");
      if ((await starBtn.getAttribute("data-favorited")) === "false") {
        await starBtn.click();
        await expect(starBtn).toHaveAttribute("data-favorited", "true");
      }
    }

    // Click Favorites chip
    await page.getByRole("button", { name: /favorites/i }).click();

    // Should show exactly 2 rows
    await expect(rows).toHaveCount(2);
  });

  // AC-9: Click Favorites chip again -> all rows shown
  test("clicking Favorites chip again shows all manuals", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const rows = page.locator("[data-testid='manual-row']");
    const totalBefore = await rows.count();

    // Activate filter
    await page.getByRole("button", { name: /favorites/i }).click();
    // Deactivate filter
    await page.getByRole("button", { name: /favorites/i }).click();

    await expect(rows).toHaveCount(totalBefore);
  });

  // AC-10: Filter persists across page reload
  test("Favorites filter persists after page reload", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Favorite first manual
    const firstStar = page.locator("[data-testid='manual-row']").first().locator("button[data-favorited]");
    if ((await firstStar.getAttribute("data-favorited")) === "false") {
      await firstStar.click();
      await expect(firstStar).toHaveAttribute("data-favorited", "true");
    }

    // Activate Favorites filter
    const chip = page.getByRole("button", { name: /favorites/i });
    await chip.click();

    const countBefore = await page.locator("[data-testid='manual-row']").count();

    // Reload page
    await page.reload();
    await page.waitForSelector("[data-testid='manual-row']");

    // Filter should still be active
    const countAfter = await page.locator("[data-testid='manual-row']").count();
    expect(countAfter).toBe(countBefore);
  });

  // AC-11: Favorites filter active with no favorites -> empty state
  test("shows No favorites yet empty state when filter active with no favorites", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Unfavorite all manuals
    const rows = page.locator("[data-testid='manual-row']");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const starBtn = rows.nth(i).locator("button[data-favorited]");
      if ((await starBtn.getAttribute("data-favorited")) === "true") {
        await starBtn.click();
        await expect(starBtn).toHaveAttribute("data-favorited", "false");
      }
    }

    // Activate Favorites filter
    await page.getByRole("button", { name: /favorites/i }).click();

    await expect(page.getByText("No favorites yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /browse all manuals/i })).toBeVisible();
  });

  // AC-12: Click "Browse all manuals" clears filter
  test("Browse all manuals button clears Favorites filter", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    // Unfavorite all manuals first
    const rows = page.locator("[data-testid='manual-row']");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const starBtn = rows.nth(i).locator("button[data-favorited]");
      if ((await starBtn.getAttribute("data-favorited")) === "true") {
        await starBtn.click();
        await expect(starBtn).toHaveAttribute("data-favorited", "false");
      }
    }

    // Activate Favorites filter -> empty state
    await page.getByRole("button", { name: /favorites/i }).click();
    await expect(page.getByText("No favorites yet")).toBeVisible();

    // Click "Browse all manuals"
    await page.getByRole("button", { name: /browse all manuals/i }).click();

    // All manuals should be visible again
    await expect(page.locator("[data-testid='manual-row']").first()).toBeVisible();
  });

  // AC-14: Mobile viewport - stars and chip visible
  test("mobile viewport: star icons and Favorites chip visible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");
    await expect(starBtn).toBeVisible();

    const chip = page.getByRole("button", { name: /favorites/i });
    await expect(chip).toBeVisible();
  });

  // AC-15: Clicking star in list row does not navigate away
  test("clicking star in list row does not navigate", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.waitForSelector("[data-testid='manual-row']");

    const firstRow = page.locator("[data-testid='manual-row']").first();
    const starBtn = firstRow.locator("button[data-favorited]");

    await starBtn.click();

    expect(page.url()).toContain("/manuals");
    expect(page.url()).not.toMatch(/\/manuals\/.+/);
  });
});
