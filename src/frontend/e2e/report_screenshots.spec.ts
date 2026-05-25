import { test, type Page } from "@playwright/test";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dedicated Playwright suite that captures full-page screenshots for the
 * LaTeX report. The captures land directly inside
 * ``deliverables/report/figures/screenshots`` with file names that match
 * the ``\includegraphics`` calls in ``chapters/04_qa_samples.tex``.
 *
 * Assumes both the FastAPI back-end and the Vite dev server are running.
 * Probe IDs are pinned to entries that exist in the local database; if
 * the database is re-seeded, update the constants below.
 */

const REPORT_FIGURES = path.resolve(
    HERE,
    "..",
    "..",
    "..",
    "deliverables",
    "report",
    "figures",
    "screenshots",
);

const JOURNAL_ID = 727;
const CONFERENCE_ID = 1118;
const AUTHOR_ID = 433654;
const YEAR = 2010;

async function settle(page: Page): Promise<void> {
    await page.waitForLoadState("networkidle", { timeout: 20_000 });
    // Wait an extra tick for the chart libraries to finalise tooltips
    // and any async font load that might shift baselines.
    await page.waitForTimeout(500);
}

async function captureFullPage(
    page: Page,
    fileName: string,
): Promise<void> {
    await page.screenshot({
        path: path.join(REPORT_FIGURES, fileName),
        fullPage: true,
    });
}

test.describe.configure({ mode: "serial" });

test.describe("report screenshots", () => {
    test("landing page", async ({ page }) => {
        await page.goto("/");
        await settle(page);
        await captureFullPage(page, "landing.png");
    });

    test("dashboard", async ({ page }) => {
        await page.goto("/dashboard");
        await settle(page);
        await captureFullPage(page, "dashboard.png");
    });

    test("journals list", async ({ page }) => {
        await page.goto("/journals");
        await settle(page);
        await captureFullPage(page, "journals_list.png");
    });

    test("journal profile", async ({ page }) => {
        await page.goto(`/journals/${JOURNAL_ID}`);
        await settle(page);
        await captureFullPage(page, "journal_profile.png");
    });

    test("conferences list", async ({ page }) => {
        await page.goto("/conferences");
        await settle(page);
        await captureFullPage(page, "conferences_list.png");
    });

    test("conference profile", async ({ page }) => {
        await page.goto(`/conferences/${CONFERENCE_ID}`);
        await settle(page);
        await captureFullPage(page, "conference_profile.png");
    });

    test("authors list", async ({ page }) => {
        await page.goto("/authors");
        await settle(page);
        await captureFullPage(page, "authors_list.png");
    });

    test("author profile", async ({ page }) => {
        await page.goto(`/authors/${AUTHOR_ID}`);
        await settle(page);
        await captureFullPage(page, "author_profile.png");
    });

    test("years list", async ({ page }) => {
        await page.goto("/years");
        await settle(page);
        await captureFullPage(page, "years_list.png");
    });

    test("year detail", async ({ page }) => {
        await page.goto(`/years/${YEAR}`);
        await settle(page);
        await captureFullPage(page, "year_detail.png");
    });

    test("charts subject area yearly", async ({ page }) => {
        await page.goto("/charts?chart=subject_area_yearly");
        await settle(page);
        await captureFullPage(page, "charts_subject_area.png");
    });

    test("charts publisher quartile", async ({ page }) => {
        await page.goto("/charts?chart=publisher_quartile");
        await settle(page);
        await captureFullPage(page, "charts_publisher_quartile.png");
    });

    test("charts journal metrics scatter", async ({ page }) => {
        await page.goto("/charts?chart=journal_metrics");
        await settle(page);
        await captureFullPage(page, "charts_journal_metrics_scatter.png");
    });

    test("charts subject area heatmap", async ({ page }) => {
        await page.goto("/charts?chart=subject_area_heatmap");
        await settle(page);
        await captureFullPage(page, "charts_heatmap.png");
    });

    test("charts cumulative growth", async ({ page }) => {
        await page.goto("/charts?chart=cumulative_growth");
        await settle(page);
        await captureFullPage(page, "charts_cumulative_growth.png");
    });
});
