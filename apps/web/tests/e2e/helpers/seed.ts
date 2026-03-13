import { execSync } from "child_process";

/**
 * Seeds the test database with known users for E2E testing.
 * Called in test setup/beforeAll blocks.
 */
export function seedTestDatabase() {
  execSync("pnpm --filter @app/db db:seed", {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "pipe",
  });
}
