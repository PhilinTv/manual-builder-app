import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Warning Library", () => {
  // AC-1: Admin creates a new warning with all fields
  test("admin can create a new warning", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    await page.getByRole("button", { name: /create warning/i }).click();

    // Fill form
    await page.getByLabel("Title").fill("Electric shock hazard");
    await page.getByLabel("Description").fill("Risk of electrocution");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /danger/i }).click();

    // Submit
    await page.getByRole("button", { name: /create/i }).click();

    // Verify toast
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning created");

    // Verify card appears
    const card = page.locator("[data-testid='warning-card']").filter({ hasText: "Electric shock hazard" });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-severity", "DANGER");
  });

  // AC-2: Admin edits a warning title
  test("admin can edit a warning title", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // Find the warning card and click Edit
    const card = page.locator("[data-testid='warning-card']").filter({ hasText: "Electric shock hazard" });
    await card.getByRole("button", { name: /edit/i }).click();

    // Update title
    await page.getByLabel("Title").clear();
    await page.getByLabel("Title").fill("High voltage hazard");

    // Save
    await page.getByRole("button", { name: /save/i }).click();

    // Verify toast
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning updated");

    // Verify updated card
    await expect(page.locator("[data-testid='warning-card']").filter({ hasText: "High voltage hazard" })).toBeVisible();
  });

  // AC-3: Admin deletes a warning with confirmation
  test("admin can delete a warning with confirmation", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // Create a warning to delete
    await page.getByRole("button", { name: /create warning/i }).click();
    await page.getByLabel("Title").fill("Warning to delete");
    await page.getByLabel("Description").fill("This will be deleted");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning created");

    // Click delete on the card
    const card = page.locator("[data-testid='warning-card']").filter({ hasText: "Warning to delete" });
    await card.getByRole("button", { name: /delete/i }).click();

    // Verify AlertDialog text
    await expect(page.getByText("permanently removed from all manuals")).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify toast
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning deleted");

    // Verify card is gone
    await expect(page.locator("[data-testid='warning-card']").filter({ hasText: "Warning to delete" })).toHaveCount(0);
  });

  // AC-10: Editor is redirected away from /warnings
  test("editor is redirected from /warnings to /", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/warnings");

    // Should be redirected to /
    await page.waitForURL("/");
    await expect(page).toHaveURL("/");
  });

  // AC-11: Editor does not see Warnings link in sidebar
  test("editor does not see Warnings link in sidebar", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar.getByText("Warnings")).toHaveCount(0);
  });

  // AC-12: Search filters warnings by title
  test("admin can search warnings by title", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // Ensure there are warnings to search through
    // Type search query
    await page.getByPlaceholder("Search warnings...").fill("Electric");

    // Wait for debounced search
    await page.waitForTimeout(500);

    // Only matching card should be visible
    const visibleCards = page.locator("[data-testid='warning-card']");
    for (const card of await visibleCards.all()) {
      await expect(card).toContainText(/electric/i);
    }
  });

  // AC-13: Severity filter chips
  test("admin can filter warnings by severity", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // Click Danger filter
    await page.getByTestId("filter-danger").click();

    // All visible cards should be DANGER
    const cards = page.locator("[data-testid='warning-card']");
    for (const card of await cards.all()) {
      await expect(card).toHaveAttribute("data-severity", "DANGER");
    }
  });

  // AC-14: Mobile viewport
  test("warning cards are visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // All cards should be visible
    const cards = page.locator("[data-testid='warning-card']");
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
    }

    // Create Warning button should be visible
    await expect(page.getByRole("button", { name: /create warning/i })).toBeVisible();
  });

  // AC-15: Empty state
  test("shows empty state when no warnings exist", async ({ page }) => {
    await login(page, "admin@example.com", "password123");

    // Use a search filter that returns no results
    await page.goto("/warnings");
    await page.getByPlaceholder("Search warnings...").fill("xyznonexistent999");
    await page.waitForTimeout(500);

    const emptyState = page.getByTestId("empty-state");
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("Create your first warning");
  });

  // AC-16: Toast messages for create/edit/delete
  test("shows appropriate toast messages for CRUD operations", async ({ page }) => {
    await login(page, "admin@example.com", "password123");
    await page.goto("/warnings");

    // Create
    await page.getByRole("button", { name: /create warning/i }).click();
    await page.getByLabel("Title").fill("Toast test warning");
    await page.getByLabel("Description").fill("Testing toasts");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning created");

    // Edit
    const card = page.locator("[data-testid='warning-card']").filter({ hasText: "Toast test warning" });
    await card.getByRole("button", { name: /edit/i }).click();
    await page.getByLabel("Title").clear();
    await page.getByLabel("Title").fill("Toast test updated");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning updated");

    // Delete
    const updatedCard = page.locator("[data-testid='warning-card']").filter({ hasText: "Toast test updated" });
    await updatedCard.getByRole("button", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning deleted");
  });
});
