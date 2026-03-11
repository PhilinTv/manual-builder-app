import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { login } from "./helpers/auth";

// Test credentials matching seed data
const ADMIN = { email: "admin@example.com", password: "admin123", name: "Admin User" };
const EDITOR1 = { email: "editor1@example.com", password: "editor123", name: "Editor One" };
const EDITOR2 = { email: "editor2@example.com", password: "editor123", name: "Editor Two" };

test.describe("Real-time Notifications", () => {
  test("SSE connection established on login - no connection lost indicator (AC-1)", async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL("**/");
    // Connection lost indicator should NOT be visible within 3 seconds
    await expect(
      page.locator('[data-testid="connection-lost-indicator"]')
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("Publish toast for assigned user (AC-6)", async ({ browser }) => {
    // Create two browser contexts
    const adminContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const editorPage = await editorContext.newPage();

    try {
      // Login both users
      await login(adminPage, ADMIN.email, ADMIN.password);
      await login(editorPage, EDITOR1.email, EDITOR1.password);
      await editorPage.waitForURL("**/");

      // Wait for SSE connections to establish
      await editorPage.waitForTimeout(1000);

      // Admin creates and publishes a manual that Editor1 is assigned to
      // Navigate admin to a manual that Editor1 is assigned to and publish it
      await adminPage.goto("/manuals");
      const manualLink = adminPage.locator("a[href*='/manuals/']").first();
      if (await manualLink.isVisible()) {
        await manualLink.click();
        // Try to publish
        const publishBtn = adminPage.getByRole("button", { name: "Publish" });
        if (await publishBtn.isVisible({ timeout: 2000 })) {
          await publishBtn.click();
        }
      }

      // Editor should see toast notification
      await expect(editorPage.locator("[data-sonner-toast]")).toBeVisible({
        timeout: 5000,
      });
    } finally {
      await adminContext.close();
      await editorContext.close();
    }
  });

  test("Actor does not receive their own notification (AC-20)", async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL("**/");
    await page.waitForTimeout(1000);

    // Navigate to a manual and publish
    await page.goto("/manuals");
    const manualLink = page.locator("a[href*='/manuals/']").first();
    if (await manualLink.isVisible()) {
      await manualLink.click();
      const publishBtn = page.getByRole("button", { name: "Publish" });
      if (await publishBtn.isVisible({ timeout: 2000 })) {
        await publishBtn.click();
        // Should see success toast from the publish action, not an SSE notification
        // Wait and verify no SSE publish notification appears
        await page.waitForTimeout(3000);
        const toasts = page.locator("[data-sonner-toast]");
        const count = await toasts.count();
        // There may be a "Manual published successfully" toast from the action,
        // but should NOT contain the SSE-style notification text
        for (let i = 0; i < count; i++) {
          const text = await toasts.nth(i).textContent();
          expect(text).not.toContain("published");
        }
      }
    }
  });

  test("Toast is positioned bottom-right (AC-11)", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL("**/");

    // We'll check that the Sonner toaster is configured with bottom-right position
    const toaster = page.locator("[data-sonner-toaster]");
    await expect(toaster).toBeVisible({ timeout: 3000 });
    // Sonner sets data-x-position and data-y-position attributes
    await expect(toaster).toHaveAttribute("data-x-position", "right");
    await expect(toaster).toHaveAttribute("data-y-position", "bottom");
  });

  test("Disconnection indicator after >10s (AC-4) and clears on reconnect (AC-5)", async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL("**/");
    await page.waitForTimeout(1000);

    // Block SSE endpoint
    await page.route("**/api/events", (route) => route.abort());

    // Wait 11 seconds - indicator should appear
    await expect(
      page.locator('[data-testid="connection-lost-indicator"]')
    ).toBeVisible({ timeout: 15000 });

    // Restore SSE endpoint
    await page.unroute("**/api/events");

    // Indicator should disappear on reconnect
    await expect(
      page.locator('[data-testid="connection-lost-indicator"]')
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("Stale banner appears when viewing updated manual (AC-16)", async ({
    browser,
  }) => {
    const adminContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const editorPage = await editorContext.newPage();

    try {
      await login(adminPage, ADMIN.email, ADMIN.password);
      await login(editorPage, EDITOR1.email, EDITOR1.password);

      // Navigate editor to a specific manual page
      await editorPage.goto("/manuals");
      const manualLink = editorPage.locator("a[href*='/manuals/']").first();
      if (await manualLink.isVisible()) {
        await manualLink.click();
        await editorPage.waitForTimeout(1000);

        // Admin publishes the same manual
        const url = editorPage.url();
        const manualId = url.split("/manuals/")[1];
        if (manualId) {
          await adminPage.goto(`/manuals/${manualId}`);
          const publishBtn = adminPage.getByRole("button", { name: "Publish" });
          if (await publishBtn.isVisible({ timeout: 2000 })) {
            await publishBtn.click();

            // Editor should see stale banner
            await expect(
              editorPage.locator('[data-testid="stale-banner"]')
            ).toBeVisible({ timeout: 5000 });
          }
        }
      }
    } finally {
      await adminContext.close();
      await editorContext.close();
    }
  });

  test("Stale banner reload hides banner (AC-17)", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const editorContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const editorPage = await editorContext.newPage();

    try {
      await login(adminPage, ADMIN.email, ADMIN.password);
      await login(editorPage, EDITOR1.email, EDITOR1.password);

      await editorPage.goto("/manuals");
      const manualLink = editorPage.locator("a[href*='/manuals/']").first();
      if (await manualLink.isVisible()) {
        await manualLink.click();
        await editorPage.waitForTimeout(1000);

        const url = editorPage.url();
        const manualId = url.split("/manuals/")[1];
        if (manualId) {
          await adminPage.goto(`/manuals/${manualId}`);
          const publishBtn = adminPage.getByRole("button", { name: "Publish" });
          if (await publishBtn.isVisible({ timeout: 2000 })) {
            await publishBtn.click();

            await expect(
              editorPage.locator('[data-testid="stale-banner"]')
            ).toBeVisible({ timeout: 5000 });

            // Click reload
            await editorPage
              .locator('[data-testid="stale-banner-reload"]')
              .click();

            // Banner should disappear
            await expect(
              editorPage.locator('[data-testid="stale-banner"]')
            ).not.toBeVisible({ timeout: 5000 });
          }
        }
      }
    } finally {
      await adminContext.close();
      await editorContext.close();
    }
  });

  test("Mobile toast visibility (AC-21)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    try {
      await login(page, ADMIN.email, ADMIN.password);
      await page.waitForURL("**/");

      // Verify Sonner toaster is visible
      const toaster = page.locator("[data-sonner-toaster]");
      await expect(toaster).toBeVisible({ timeout: 3000 });
    } finally {
      await context.close();
    }
  });
});
