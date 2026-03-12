import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Admin User Management", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.waitForURL("/");
    await page.goto("/admin/users");
  });

  test("AC-9: Admin can view a list of all users with name, email, role, and status", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible();

    // Check column headers
    await expect(table.locator("th")).toContainText(["Name", "Email", "Role", "Status"]);

    // Check that rows exist
    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("AC-10: Admin can filter user list by status (Pending)", async ({ page }) => {
    // Wait for initial table load
    await page.locator("tbody tr").first().waitFor({ timeout: 10000 });

    // Click status filter and wait for the filtered API response
    await page.getByRole("combobox", { name: /status/i }).click();
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/users") && resp.url().includes("status=PENDING") && resp.status() === 200
    );
    await page.getByRole("option", { name: /pending/i }).click();
    await responsePromise;

    // Wait for React re-render
    await page.waitForTimeout(500);

    // All visible status cells should say Pending
    const statusCells = page.locator("tbody tr td:nth-child(4)");
    const count = await statusCells.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toContainText("Pending");
    }
  });

  test("AC-11: Admin can approve a pending user, changing their status to Active", async ({ page }) => {
    // Find a row with "Pending" status
    const pendingRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(4)", { hasText: "Pending" }),
    }).first();
    await pendingRow.waitFor({ timeout: 10000 });

    // Use email (unique) for re-identification after table refresh
    const userEmail = await pendingRow.locator("td:nth-child(2)").textContent();
    await pendingRow.getByRole("button", { name: /approve/i }).click();

    // After table refreshes, find the row by email and verify status changed
    const updatedRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(2)", { hasText: userEmail!.trim() }),
    });
    await expect(updatedRow.locator("td:nth-child(4)")).toContainText("Active");
  });

  test("AC-12: Admin can reject a pending user, changing their status to Deactivated", async ({ page }) => {
    // Find a row with "Pending" status
    const pendingRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(4)", { hasText: "Pending" }),
    }).first();
    await pendingRow.waitFor({ timeout: 10000 });

    const userEmail = await pendingRow.locator("td:nth-child(2)").textContent();
    await pendingRow.getByRole("button", { name: /reject/i }).click();

    const updatedRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(2)", { hasText: userEmail!.trim() }),
    });
    await expect(updatedRow.locator("td:nth-child(4)")).toContainText("Deactivated");
  });

  test("AC-13: Admin can deactivate an active user", async ({ page }) => {
    // Find an active editor row (with Deactivate button visible)
    const activeEditorRow = page.locator("tbody tr")
      .filter({ has: page.locator("td:nth-child(4)", { hasText: "Active" }) })
      .filter({ has: page.getByRole("button", { name: /deactivate/i }) })
      .first();
    await activeEditorRow.waitFor({ timeout: 10000 });

    const userEmail = await activeEditorRow.locator("td:nth-child(2)").textContent();
    await activeEditorRow.getByRole("button", { name: /deactivate/i }).click();

    const updatedRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(2)", { hasText: userEmail!.trim() }),
    });
    await expect(updatedRow.locator("td:nth-child(4)")).toContainText("Deactivated");
  });

  test("AC-14: Admin can reactivate a deactivated user", async ({ page }) => {
    // Find a row with "Deactivated" status
    const deactivatedRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(4)", { hasText: "Deactivated" }),
    }).first();
    await deactivatedRow.waitFor({ timeout: 10000 });

    const userEmail = await deactivatedRow.locator("td:nth-child(2)").textContent();
    await deactivatedRow.getByRole("button", { name: /reactivate/i }).click();

    const updatedRow = page.locator("tbody tr").filter({
      has: page.locator("td:nth-child(2)", { hasText: userEmail!.trim() }),
    });
    await expect(updatedRow.locator("td:nth-child(4)")).toContainText("Active");
  });

  test("AC-15: Admin can create a new user with a specified role", async ({ page }) => {
    await page.getByRole("button", { name: /create user/i }).click();

    // Dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Name").fill("Created User");
    await dialog.getByLabel("Email").fill(`created-${Date.now()}@example.com`);
    await dialog.getByLabel("Password").fill("password123");

    // Select role
    await dialog.getByRole("combobox", { name: /role/i }).click();
    await page.getByRole("option", { name: /editor/i }).click();

    await dialog.getByRole("button", { name: /create|submit/i }).click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();

    // New row appears in table
    await expect(page.locator("tbody")).toContainText("Created User");
  });

  test("AC-16: Admin can change a user's role between Admin and Editor", async ({ page }) => {
    // Find an active editor user row
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const roleCell = row.locator("td:nth-child(3)");
      if ((await roleCell.textContent())?.includes("Editor")) {
        // Click role change control
        await row.getByRole("combobox", { name: /role/i }).click();
        await page.getByRole("option", { name: /admin/i }).click();

        await expect(roleCell).toContainText("Admin");
        break;
      }
    }
  });
});
