import { defineConfig, devices } from "@playwright/test";

/**
 * Layout tests in a real browser: `npm run test:layout`. The first time,
 * install the browser with `npx playwright install chromium`.
 */
export default defineConfig({
	testDir: ".",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	reporter: [["list"]],
	use: {
		baseURL: "http://localhost:1420",
		...devices["Desktop Chrome"],
		// The full Chromium (not the headless shell), the same engine as in the app window.
		channel: "chromium",
	},
	webServer: {
		command: "npm run dev",
		url: "http://localhost:1420",
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
