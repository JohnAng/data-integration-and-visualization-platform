import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright runs against the locally running Vite dev server, so the
 * suite assumes ``pnpm dev`` is already up on port 5173 and the FastAPI
 * backend is reachable on port 8000. Screenshots and traces land in
 * ``e2e/screenshots`` and ``test-results`` respectively so the visual
 * artefacts can be reviewed alongside the run report.
 */
export default defineConfig({
    testDir: "./e2e",
    timeout: 30_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    reporter: [["list"]],
    use: {
        baseURL: "http://localhost:5173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        viewport: { width: 1440, height: 900 },
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
