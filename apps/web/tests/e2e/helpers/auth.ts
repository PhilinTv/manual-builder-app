import { type Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login", { timeout: 30_000 });

  // Wait for the Sign In button to be visible — page has rendered
  const signInBtn = page.getByRole("button", { name: /sign in/i });
  await signInBtn.waitFor({ state: "visible", timeout: 30_000 });

  // Wait for React hydration: check that the button's form has a JS submit handler.
  // We do this by waiting for Next.js client-side JS to load (the button becomes interactive).
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    // After hydration, React attaches event listeners. We can't directly detect them,
    // but we can check that __next_f (Next.js flight data) is present as a hydration signal.
    return btn && (window as unknown as Record<string, unknown>).__next_f !== undefined;
  }, { timeout: 30_000 });

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  // Click and wait for the auth callback response (JS-handled form submit)
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes("/api/auth/callback/credentials"),
      { timeout: 15_000 }
    ),
    signInBtn.click(),
  ]);

  // Wait for navigation away from login page
  await page.waitForURL(/\/(?!login)/, { timeout: 15_000 });
}
