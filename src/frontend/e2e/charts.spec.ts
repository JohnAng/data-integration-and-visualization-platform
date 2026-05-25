import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end smoke suite for the /charts playground.
 *
 * For every chart variant the suite:
 *   1. Navigates to the appropriate URL search param,
 *   2. Waits for the chart frame to either render an SVG canvas or
 *      surface the empty-state caption,
 *   3. Captures any console errors raised while the page settled,
 *   4. Stores a full-page screenshot for human / multimodal review.
 *
 * The screenshots land in ``e2e/screenshots`` and are committed to the
 * test results so visual regressions can be diffed against later runs.
 */

const CHART_VARIANTS: { key: string; label: string }[] = [
    { key: "subject_area_yearly", label: "subject-area-yearly" },
    { key: "for_yearly", label: "for-yearly" },
    { key: "venue_comparison", label: "venue-comparison" },
    { key: "publisher_quartile", label: "publisher-quartile" },
    { key: "venue_metrics", label: "venue-metrics" },
    { key: "authors_vs_articles", label: "authors-vs-articles" },
    { key: "journal_metrics", label: "journal-metrics" },
    { key: "subject_area_heatmap", label: "subject-area-heatmap" },
    { key: "for_heatmap", label: "for-heatmap" },
    { key: "publication_composition", label: "publication-composition" },
    { key: "cumulative_growth", label: "cumulative-growth" },
    { key: "top_publishers", label: "top-publishers" },
];

async function collectConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    });
    page.on("pageerror", (error) => {
        errors.push(`pageerror: ${error.message}`);
    });
    return errors;
}

async function waitForChartFrame(page: Page): Promise<void> {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    const figure = page.locator("figure").first();
    await figure.waitFor({ state: "visible", timeout: 15_000 });
}

test.describe("/charts variants render", () => {
    for (const variant of CHART_VARIANTS) {
        test(`${variant.label} renders without runtime errors`, async ({ page }, testInfo) => {
            const errors = await collectConsoleErrors(page);

            await page.goto(`/charts?chart=${variant.key}`);
            await waitForChartFrame(page);

            const errorCard = page.getByText(/something went wrong/i);
            await expect(errorCard).toHaveCount(0);

            await page.waitForTimeout(300);
            await page.locator("figure").first().screenshot({
                path: `e2e/screenshots/${variant.label}.png`,
            });

            testInfo.attach("console-errors", {
                body: errors.join("\n"),
                contentType: "text/plain",
            });
            expect(
                errors.filter(
                    (entry) =>
                        !entry.includes("ResizeObserver") &&
                        !entry.includes("[vite]") &&
                        !entry.toLowerCase().includes("favicon"),
                ),
            ).toEqual([]);
        });
    }
});

test.describe("/charts interactions", () => {
    test("granularity decade renders without runtime errors", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/charts?chart=subject_area_yearly&granularity=decade");
        await waitForChartFrame(page);
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: "e2e/screenshots/granularity-decade.png",
            fullPage: true,
        });
        expect(errors).toEqual([]);
    });

    test("clicking a legend entry toggles a series", async ({ page }) => {
        await page.goto("/charts?chart=cumulative_growth");
        await waitForChartFrame(page);
        await page.waitForLoadState("networkidle");
        const legendButton = page
            .getByRole("button", { name: /cumulative journals/i })
            .first();
        await legendButton.click();
        await page.waitForTimeout(300);
        await page.locator("figure").first().screenshot({
            path: "e2e/screenshots/legend-toggle.png",
        });
        await expect(legendButton).toHaveClass(/line-through/);
    });

    test("drag-to-zoom on a line chart shows the zoom range pill", async ({ page }) => {
        await page.goto("/charts?chart=cumulative_growth");
        await waitForChartFrame(page);
        await page.waitForLoadState("networkidle");
        const svg = page.locator("figure svg").first();
        const box = await svg.boundingBox();
        if (!box) throw new Error("chart svg has no bounding box");
        const startX = box.x + box.width * 0.4;
        const endX = box.x + box.width * 0.7;
        const midY = box.y + box.height / 2;
        await page.mouse.move(startX, midY);
        await page.mouse.down();
        await page.mouse.move(endX, midY, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        await expect(page.getByText(/^Zoomed$/i).first()).toBeVisible();
        await page.locator("figure").first().screenshot({
            path: "e2e/screenshots/zoom-applied.png",
        });
        const resetButton = page.getByRole("button", { name: /^Reset$/ }).first();
        await resetButton.click();
        await page.waitForTimeout(200);
        await expect(page.getByText(/drag to zoom/i).first()).toBeVisible();
    });

    test("zoom hint instructs how to operate the chart", async ({ page }) => {
        await page.goto("/charts?chart=subject_area_yearly");
        await waitForChartFrame(page);
        await expect(
            page.getByText(/drag to zoom · double-click to reset/i).first(),
        ).toBeVisible();
    });

    test("double-click on a zoomed chart resets it", async ({ page }) => {
        await page.goto("/charts?chart=cumulative_growth");
        await waitForChartFrame(page);
        await page.waitForLoadState("networkidle");
        const svg = page.locator("figure svg").first();
        const box = await svg.boundingBox();
        if (!box) throw new Error("chart svg has no bounding box");
        const startX = box.x + box.width * 0.4;
        const endX = box.x + box.width * 0.7;
        const midY = box.y + box.height / 2;
        await page.mouse.move(startX, midY);
        await page.mouse.down();
        await page.mouse.move(endX, midY, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        await expect(page.getByText(/^Zoomed$/i).first()).toBeVisible();
        const centerX = box.x + box.width / 2;
        await page.mouse.dblclick(centerX, midY);
        await page.waitForTimeout(200);
        await expect(page.getByText(/drag to zoom/i).first()).toBeVisible();
    });

    test("subject area checkbox list selects a single area", async ({ page }) => {
        await page.goto("/charts?chart=subject_area_yearly");
        await waitForChartFrame(page);
        const checkbox = page.locator('input[type="checkbox"]').first();
        await checkbox.check();
        await page.waitForLoadState("networkidle");
        await page.screenshot({
            path: "e2e/screenshots/subject-area-single-select.png",
            fullPage: true,
        });
        await expect(checkbox).toBeChecked();
    });
});
