import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import path from "path";

const PDF_PATH = path.resolve(__dirname, "..", "bosch-machine-manual.pdf");

test.describe.serial("PDF Import — Create Manual from File", () => {
  test.afterEach(async ({ page }, testInfo) => {
    const slug = testInfo.title
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase()
      .slice(0, 60);
    const screenshotDir = path.resolve(__dirname, "..", "..", "..", "..", "tests", "screenshots");
    const screenshotPath = path.join(screenshotDir, `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    testInfo.attachments.push({
      name: "screenshot",
      path: screenshotPath,
      contentType: "image/png",
    });
  });

  test("AC-1: Navigate to manuals and open Create Manual dialog", async ({
    page,
  }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.getByRole("heading", { name: /manuals/i }).waitFor({ timeout: 15_000 });

    const createButton = page.getByRole("button", {
      name: /create manual|new manual/i,
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /create manual/i })
    ).toBeVisible();
  });

  test("AC-2: Import from PDF option is visible in create dialog", async ({
    page,
  }) => {
    await login(page, "admin@example.com", "admin123");
    await page.goto("/manuals");
    await page.getByRole("heading", { name: /manuals/i }).waitFor({ timeout: 15_000 });

    await page.getByRole("button", { name: /create manual|new manual/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText("Import from PDF")).toBeVisible();
    await expect(dialog.getByText("Create from scratch")).toBeVisible();
  });

  test("AC-3: Upload zone accepts PDF and shows upload progress", async ({
    page,
  }) => {
    await login(page, "admin@example.com", "admin123");

    // Clear any stuck imports via API
    const pending = await page.request.get("/api/imports/pending");
    if (pending.ok()) {
      const data = await pending.json();
      if (data.hasPending && data.importId) {
        await page.request.post(`/api/imports/${data.importId}/discard`);
      }
    }

    await page.goto("/manuals");
    await page.getByRole("heading", { name: /manuals/i }).waitFor({ timeout: 15_000 });

    // Open create dialog and select Import from PDF
    await page.getByRole("button", { name: /create manual|new manual/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Import from PDF").click();

    // Upload zone should be visible
    const uploadZone = dialog.getByTestId("upload-zone");
    await expect(uploadZone).toBeVisible();
    await expect(
      uploadZone.getByText(/drop your pdf here|click to browse/i)
    ).toBeVisible();

    // Set up file chooser and upload the PDF
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadZone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(PDF_PATH);

    // Should show uploading text or transition to processing
    await expect(
      dialog.getByText(/uploading|extracting content|processing/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("AC-4: Processing status shown while extracting", async ({ page }) => {
    test.setTimeout(90_000);

    // Listen to console and network for debugging
    const consoleLogs: string[] = [];
    page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    await login(page, "admin@example.com", "admin123");

    // Clear any stuck imports via direct DB-level API
    const pending = await page.request.get("/api/imports/pending");
    if (pending.ok()) {
      const data = await pending.json();
      if (data.hasPending && data.importId) {
        await page.request.post(`/api/imports/${data.importId}/discard`);
      }
    }

    await page.goto("/manuals");
    await page.getByRole("heading", { name: /manuals/i }).waitFor({ timeout: 15_000 });

    // Open create dialog
    await page.getByRole("button", { name: /create manual|new manual/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Click the "Import from PDF" option button
    await dialog.getByText("Import from PDF").click();

    // Wait for upload zone to appear (dialog transitions to "upload" step)
    const uploadZone = dialog.getByTestId("upload-zone");
    await expect(uploadZone).toBeVisible({ timeout: 5_000 });

    // Monitor the upload XHR response
    const uploadResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/imports/upload"),
      { timeout: 30_000 }
    );

    // Set up file chooser and upload
    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadZone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(PDF_PATH);

    // Wait for the upload API response
    const uploadResp = await uploadResponsePromise;
    const uploadStatus = uploadResp.status();
    const uploadBody = await uploadResp.text();
    console.log(`Upload response: ${uploadStatus} - ${uploadBody}`);

    // Expect 201 Created
    expect(uploadStatus).toBe(201);

    // After upload completes, dialog transitions to "processing" step
    // Should show "Extracting content..." or "Import failed" (if pipeline errors)
    await expect(
      dialog.getByText(/extracting content|import failed/i).first()
    ).toBeVisible({ timeout: 30_000 });

    // Verify "Extracting content..." specifically (pipeline working)
    const extractingText = dialog.getByText(/extracting content/i);
    await expect(extractingText).toBeVisible({ timeout: 5_000 });

    // Should also display the source filename being processed
    await expect(
      dialog.getByText(/bosch-machine-manual/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("AC-5: Review page loads with extracted data from the PDF", async ({
    page,
  }) => {
    test.skip(!process.env.OPENAI_API_KEY, "Requires OPENAI_API_KEY for LLM extraction");
    test.setTimeout(180_000); // LLM extraction can take significant time

    // After AC-4's heavy processing, the dev server may need a moment to stabilize.
    // Poll the server until it responds before attempting login.
    for (let i = 0; i < 10; i++) {
      try {
        const resp = await page.request.get("/login");
        if (resp.ok()) break;
      } catch {
        // Server not ready yet
      }
      await page.waitForTimeout(2_000);
    }

    await login(page, "admin@example.com", "admin123");

    // Clear any stuck imports
    const pending = await page.request.get("/api/imports/pending");
    if (pending.ok()) {
      const data = await pending.json();
      if (data.hasPending && data.importId) {
        await page.request.post(`/api/imports/${data.importId}/discard`);
      }
    }

    await page.goto("/manuals");
    await page.getByRole("heading", { name: /manuals/i }).waitFor({ timeout: 15_000 });

    // Open create dialog → Import from PDF → upload
    await page.getByRole("button", { name: /create manual|new manual/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByText("Import from PDF").click();

    const uploadZone = dialog.getByTestId("upload-zone");
    await expect(uploadZone).toBeVisible({ timeout: 5_000 });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await uploadZone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(PDF_PATH);

    // Wait for redirect to review page (upload + extraction + LLM processing)
    await page.waitForURL(/\/imports\/.*\/review/, { timeout: 180_000 });

    // Review page heading should be visible
    await expect(
      page.getByRole("heading", { name: /review import/i })
    ).toBeVisible({ timeout: 10_000 });

    // Should show the source filename somewhere on the page
    await expect(page.getByText(/bosch-machine-manual/i)).toBeVisible();

    // Review form should have the extracted product name input
    const productNameInput = page.getByLabel(/product name/i);
    await expect(productNameInput).toBeVisible();
    // The product name should have been extracted (non-empty)
    const value = await productNameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});
