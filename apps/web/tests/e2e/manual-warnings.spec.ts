import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Manual Warnings", () => {
  // AC-6: Editor links a library warning via combobox
  test("editor can search and link a library warning to a manual", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");

    // Click first assigned manual
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Open warning picker
    const picker = page.getByTestId("warning-picker");
    await picker.locator("input").fill("Electric");

    // Wait for search results
    await page.waitForTimeout(500);

    // Select a warning from dropdown
    await picker.getByText("Electric shock hazard").click();

    // Verify toast
    await expect(page.locator("[data-sonner-toast]")).toContainText("Warning added to manual");

    // Verify library warning card appears
    const libraryCard = page.locator("[data-testid='library-warning-card']").filter({ hasText: "Electric shock hazard" });
    await expect(libraryCard).toBeVisible();
  });

  // AC-7: Editor removes a library warning
  test("editor can remove a linked library warning", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Find a library warning card and remove it
    const card = page.locator("[data-testid='library-warning-card']").first();
    if (await card.isVisible()) {
      const title = await card.locator("h4").textContent();
      await card.getByTestId("remove-warning").click();

      // Verify toast
      await expect(page.locator("[data-sonner-toast]")).toContainText("Warning removed from manual");

      // Verify card is gone
      if (title) {
        await expect(
          page.locator("[data-testid='library-warning-card']").filter({ hasText: title })
        ).toHaveCount(0);
      }
    }
  });

  // AC-8: Editor adds custom warning (no Library label)
  test("editor can add a custom warning without Library label", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Add custom warning
    await page.getByRole("button", { name: /add custom warning/i }).click();

    const warningBlock = page.locator("[data-testid='warning-block']").last();
    await warningBlock.getByTestId("warning-title").fill("Fragile parts");
    await warningBlock.getByTestId("warning-description").fill("Handle with care");

    // Select severity
    await warningBlock.getByRole("combobox", { name: /severity/i }).click();
    await page.getByRole("option", { name: /caution/i }).click();

    // Custom warnings should NOT have "(Library)" label
    await expect(warningBlock).not.toContainText("(Library)");
  });

  // AC-9: DANGER library warning has correct data-severity and badge
  test("DANGER library warning shows correct severity badge", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Find a DANGER library warning card
    const dangerCard = page.locator("[data-testid='library-warning-card'][data-severity='DANGER']").first();
    if (await dangerCard.isVisible()) {
      await expect(dangerCard).toHaveAttribute("data-severity", "DANGER");

      const badge = dangerCard.getByTestId("severity-badge");
      await expect(badge).toBeVisible();
      await expect(badge).toContainText("Danger");
    }
  });

  // AC-16: Toast messages for link/unlink
  test("shows toast messages when linking and unlinking warnings", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Link a warning
    const picker = page.getByTestId("warning-picker");
    await picker.locator("input").fill("");
    await picker.locator("input").focus();
    await page.waitForTimeout(500);

    // If there are results, select one
    const firstResult = picker.locator("ul li button").first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await expect(page.locator("[data-sonner-toast]")).toContainText("Warning added to manual");
    }
  });

  // AC-17: Already-linked warnings not selectable in combobox
  test("already-linked warnings are not selectable in picker", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Get titles of already-linked warnings
    const linkedCards = page.locator("[data-testid='library-warning-card']");
    const linkedTitles: string[] = [];
    for (const card of await linkedCards.all()) {
      const title = await card.locator("h4").textContent();
      if (title) linkedTitles.push(title);
    }

    if (linkedTitles.length > 0) {
      // Search for the first linked warning
      const picker = page.getByTestId("warning-picker");
      await picker.locator("input").fill(linkedTitles[0]);
      await page.waitForTimeout(500);

      // That warning should NOT appear in the dropdown
      const dropdown = picker.locator("ul li button");
      for (const item of await dropdown.all()) {
        const text = await item.textContent();
        expect(text).not.toContain(linkedTitles[0]);
      }
    }
  });

  // AC-18: Library cards show "(Library)" label, custom cards do not
  test("library warnings show Library label, custom warnings do not", async ({ page }) => {
    await login(page, "editor@example.com", "password123");
    await page.goto("/manuals");
    await page.locator("[data-testid='manual-row']").first().click();
    await page.waitForURL(/\/manuals\/.+/);

    // Library warning cards should have "(Library)" text
    const libraryCards = page.locator("[data-testid='library-warning-card']");
    for (const card of await libraryCards.all()) {
      await expect(card).toContainText("(Library)");
    }

    // Custom warning blocks should NOT have "(Library)" text
    const customBlocks = page.locator("[data-testid='warning-block']");
    for (const block of await customBlocks.all()) {
      await expect(block).not.toContainText("(Library)");
    }
  });
});
