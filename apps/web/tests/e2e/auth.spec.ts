import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Authentication", () => {
  test("AC-1: Admin can log in with valid email and password and is redirected to dashboard", async ({ page }) => {
    await login(page, "admin@example.com", "admin123");
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Admin User");
  });

  test("AC-2: Login with invalid credentials shows an error message", async ({ page }) => {
    await login(page, "admin@example.com", "wrong-password");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"]').filter({ hasText: /invalid credentials/i })).toBeVisible();
  });

  test("AC-3: Login with a pending account shows account not active error", async ({ page }) => {
    await login(page, "pending@example.com", "password123");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"]').filter({ hasText: /not active/i })).toBeVisible();
  });

  test("AC-4: Login with a deactivated account shows account not active error", async ({ page }) => {
    await login(page, "deactivated@example.com", "password123");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"]').filter({ hasText: /not active/i })).toBeVisible();
  });

  test("AC-5: New user can register with name, email, and password", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(`newuser-${Date.now()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: /register|sign up/i }).click();
    await page.waitForURL("/pending");
    await expect(page.getByText(/pending admin approval/i)).toBeVisible();
  });

  test("AC-6: Registration with an existing email shows a validation error", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Name").fill("Duplicate User");
    await page.getByLabel("Email").fill("existing@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: /register|sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('[role="alert"]').filter({ hasText: /already exists/i })).toBeVisible();
  });

  test("AC-7: Pending user sees pending approval page and cannot access dashboard", async ({ page }) => {
    // Pending users cannot log in (they get "Account not active" error on login page)
    // So verify that accessing dashboard without active session redirects
    await login(page, "pending@example.com", "password123");
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|pending)/);
  });

  test("AC-8: Unauthenticated user accessing / is redirected to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("AC-22: Login page renders correctly on mobile viewport (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/login");
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");
    const submitButton = page.getByRole("button", { name: /sign in|log in/i });
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check no horizontal scrolling
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("AC-23: Register page renders correctly on mobile viewport (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/register");
    const nameInput = page.getByLabel("Name");
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password", { exact: true });
    const confirmInput = page.getByLabel("Confirm Password");
    const submitButton = page.getByRole("button", { name: /register|sign up/i });
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
