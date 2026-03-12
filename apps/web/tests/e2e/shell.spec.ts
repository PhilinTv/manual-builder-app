import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Responsive App Shell", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.waitForURL("/");
  });

  test("AC-19: App shell sidebar is visible on desktop (>= 1024px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const sidebar = page.locator("nav");
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(200);
  });

  test("AC-20: App shell sidebar hidden on mobile, hamburger button visible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar should be hidden
    const sidebar = page.locator("nav.sidebar, aside nav");
    await expect(sidebar).not.toBeVisible();

    // Hamburger should be visible
    const hamburger = page.getByRole("button", { name: /menu/i });
    await expect(hamburger).toBeVisible();
  });

  test("AC-21: Mobile hamburger opens drawer with navigation, clicking link closes drawer", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const hamburger = page.getByRole("button", { name: /menu/i });
    await hamburger.click();

    // Drawer should be visible with nav links
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Dashboard");
    await expect(drawer).toContainText("Manuals");

    // Click a link and verify drawer closes
    await drawer.getByRole("link", { name: /dashboard/i }).click();
    await expect(drawer).not.toBeVisible();
  });
});
