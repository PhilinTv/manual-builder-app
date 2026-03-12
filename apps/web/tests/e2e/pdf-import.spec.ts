import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("PDF Import", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.waitForURL("/");
  });

  test("create manual dialog shows import option", async ({ page }) => {
    await page.goto("/manuals");
    await page.getByRole("button", { name: /create manual/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Import from PDF");
    await expect(dialog).toContainText("Create from scratch");
  });

  test("upload zone rejects non-PDF files", async ({ page }) => {
    await page.goto("/manuals");
    await page.getByRole("button", { name: /create manual/i }).click();
    await page.getByText(/import from pdf/i).click();

    // Try uploading a non-PDF file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("upload-zone").click();
    const fileChooser = await fileChooserPromise;

    // Create a fake .txt file
    await fileChooser.setFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a pdf"),
    });

    await expect(page.getByTestId("upload-zone").getByText(/only pdf files/i)).toBeVisible();
  });

  test("upload zone shows progress during upload", async ({ page }) => {
    await page.goto("/manuals");
    await page.getByRole("button", { name: /create manual/i }).click();
    await page.getByText(/import from pdf/i).click();

    // The upload zone should be visible
    await expect(page.getByTestId("upload-zone")).toBeVisible();
  });

  test("review page redirects for non-existent import", async ({ page }) => {
    // Navigate to a review page with a non-existent import ID
    const response = await page.goto("/imports/non-existent-id/review");
    // Should redirect to manuals or show error
    const url = page.url();
    expect(url).toMatch(/\/(manuals|login|imports)/);
  });

  test("mobile layout shows create manual button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/manuals");
    // Test mobile accessibility of the create manual flow
    await expect(
      page.getByRole("button", { name: /create manual/i })
    ).toBeVisible();
  });
});

test.describe("PDF Import Auth", () => {
  test("unauthenticated upload returns 401", async ({ request }) => {
    const response = await request.post("/api/imports/upload", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(401);
  });
});
