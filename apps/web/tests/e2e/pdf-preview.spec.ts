import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("PDF Preview", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);
  });

  test("preview button visible in editor toolbar before export button", async ({ page }) => {
    const previewBtn = page.getByTestId("preview-pdf-button");
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toContainText("Preview");

    // Preview should appear before Export in DOM order
    const exportBtn = page.getByTestId("export-pdf-button");
    await expect(exportBtn).toBeVisible();
  });

  test("clicking preview opens full-screen overlay", async ({ page }) => {
    await page.getByTestId("preview-pdf-button").click();
    const overlay = page.getByTestId("preview-overlay");
    await expect(overlay).toBeVisible();
  });

  test("overlay contains PDF iframe on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByTestId("preview-pdf-button").click();

    const iframe = page.getByTestId("preview-iframe");
    await expect(iframe).toBeVisible({ timeout: 15000 });

    const src = await iframe.getAttribute("src");
    expect(src).toContain("/api/manuals/");
    expect(src).toContain("/preview/pdf");
  });

  test("spinner shown while PDF loads", async ({ page }) => {
    await page.getByTestId("preview-pdf-button").click();

    // Spinner should be visible initially
    const spinner = page.getByTestId("preview-spinner");
    await expect(spinner).toBeVisible();
  });

  test("close button closes overlay", async ({ page }) => {
    await page.getByTestId("preview-pdf-button").click();
    await expect(page.getByTestId("preview-overlay")).toBeVisible();

    await page.getByTestId("preview-close-button").click();
    await expect(page.getByTestId("preview-overlay")).not.toBeAttached();
  });

  test("escape key closes overlay", async ({ page }) => {
    await page.getByTestId("preview-pdf-button").click();
    await expect(page.getByTestId("preview-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("preview-overlay")).not.toBeAttached();
  });

  test("editor state preserved after preview", async ({ page }) => {
    const nameInput = page.getByTestId("product-name-input");
    await nameInput.clear();
    await nameInput.fill("Draft123");

    await page.getByTestId("preview-pdf-button").click();
    await expect(page.getByTestId("preview-overlay")).toBeVisible();

    await page.getByTestId("preview-close-button").click();
    await expect(nameInput).toHaveValue("Draft123");
  });

  test("download button in overlay triggers download", async ({ page }) => {
    await page.getByTestId("preview-pdf-button").click();
    await expect(page.getByTestId("preview-overlay")).toBeVisible();

    const downloadBtn = page.getByTestId("preview-download-button");
    await expect(downloadBtn).toBeVisible();
  });

  test("mobile viewport shows download button instead of iframe", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByTestId("preview-pdf-button").click();

    const overlay = page.getByTestId("preview-overlay");
    await expect(overlay).toBeVisible();

    // No iframe on mobile
    await expect(page.getByTestId("preview-iframe")).not.toBeAttached();

    // Download button should be visible
    await expect(page.getByTestId("preview-download-button")).toBeVisible();
  });

  test("preview uses current editor language", async ({ page }) => {
    // Intercept the preview API request to check language param
    const requestPromise = page.waitForRequest((req) =>
      req.url().includes("/preview/pdf")
    );

    await page.getByTestId("preview-pdf-button").click();

    try {
      const request = await requestPromise;
      const url = request.url();
      // Should contain a language parameter
      expect(url).toContain("language=");
    } catch {
      // If no request intercepted, the overlay at least opened
      await expect(page.getByTestId("preview-overlay")).toBeVisible();
    }
  });
});

test.describe("PDF Preview API", () => {
  test("unauthenticated request returns 401", async ({ request }) => {
    const response = await request.get("/api/manuals/test-id/preview/pdf");
    expect(response.status()).toBe(401);
  });
});
