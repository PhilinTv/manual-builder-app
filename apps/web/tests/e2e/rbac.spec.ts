import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Role-Based Access Control", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.waitForURL("/");
  });

  test("AC-17: Editor cannot access /admin/users — redirected to dashboard", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL("/");
  });

  test("AC-18: Editor does not see User Management link in sidebar navigation", async ({ page }) => {
    const viewport = page.viewportSize();
    const isMobile = viewport ? viewport.width < 1024 : false;

    if (isMobile) {
      // On mobile, open the drawer to check navigation links
      const hamburger = page.getByRole("button", { name: /menu/i });
      await hamburger.click();
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      const nav = drawer.locator("nav");
      await expect(nav).toBeVisible();
      await expect(nav).not.toContainText("User Management");
    } else {
      const sidebar = page.locator("nav");
      await expect(sidebar).toBeVisible();
      await expect(sidebar).not.toContainText("User Management");
    }
  });
});
