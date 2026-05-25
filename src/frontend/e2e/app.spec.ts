import { expect, test, type Page } from "@playwright/test";

/**
 * Cross-cutting smoke suite covering the list pages, profile pages
 * and table interactions for journals, conferences, authors and years.
 *
 * Each test uses the IDs returned by the running backend at the time
 * the suite is authored. If the database is rebuilt with fresh
 * identifiers, update the constants below.
 */

const JOURNAL_ID = 727;
const CONFERENCE_ID = 1118;
const AUTHOR_ID = 433654;
const YEAR = 2010;

const PAGES: { path: string; expectText: RegExp }[] = [
    { path: "/", expectText: /MYE030/i },
    { path: "/dashboard", expectText: /At a glance/i },
    { path: "/journals", expectText: /Browse journals/i },
    { path: "/conferences", expectText: /Browse conferences/i },
    { path: "/authors", expectText: /Search authors/i },
    { path: "/years", expectText: /Publications by year/i },
    { path: "/charts", expectText: /Visualization playground/i },
    { path: `/journals/${JOURNAL_ID}`, expectText: /journal/i },
    { path: `/conferences/${CONFERENCE_ID}`, expectText: /conference/i },
    { path: `/authors/${AUTHOR_ID}`, expectText: /author/i },
    { path: `/years/${YEAR}`, expectText: new RegExp(`${YEAR}`) },
];

function collectErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
        if (response.status() >= 500) {
            errors.push(`HTTP ${response.status()} ${response.url()}`);
        }
    });
    return errors;
}

test.describe("application routes render", () => {
    for (const route of PAGES) {
        test(`${route.path} loads without runtime errors`, async ({ page }) => {
            const errors = collectErrors(page);
            await page.goto(route.path);
            await page.waitForLoadState("networkidle", { timeout: 15_000 });
            await expect(page.getByText(route.expectText).first()).toBeVisible();
            expect(errors).toEqual([]);
        });
    }
});

test.describe("list page interactions", () => {
    test("journals table search filters rows", async ({ page }) => {
        await page.goto("/journals");
        await page.waitForLoadState("networkidle");
        const searchInput = page.getByPlaceholder(/search title/i);
        await searchInput.fill("data");
        await page.waitForLoadState("networkidle");
        const rows = page.locator("tbody tr").count();
        expect(await rows).toBeGreaterThan(0);
    });

    test("journals table sort cycles a column", async ({ page }) => {
        await page.goto("/journals");
        await page.waitForLoadState("networkidle");
        const titleHeader = page
            .locator("th button")
            .filter({ hasText: /Title/i })
            .first();
        await titleHeader.click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/order_by=title/);
    });

    test("conferences ranked-only checkbox narrows the list", async ({ page }) => {
        await page.goto("/conferences");
        await page.waitForLoadState("networkidle");
        const baselineTotal = await page
            .getByText(/indexed across/i)
            .first()
            .textContent();
        const rankedCheckbox = page
            .getByRole("checkbox", { name: /icore-ranked/i })
            .first();
        await rankedCheckbox.check();
        await page.waitForLoadState("networkidle");
        const filteredTotal = await page
            .getByText(/indexed across/i)
            .first()
            .textContent();
        expect(filteredTotal).not.toEqual(baselineTotal);
    });

    test("authors list defaults to authors with at least one article", async ({
        page,
    }) => {
        await page.goto("/authors");
        await page.waitForLoadState("networkidle");
        await expect(
            page.getByText(/authors with at least one indexed publication/i).first(),
        ).toBeVisible();
    });

    test("year detail tabs swap content", async ({ page }) => {
        await page.goto(`/years/${YEAR}`);
        await page.waitForLoadState("networkidle");
        await page.getByRole("tab", { name: /journals/i }).click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/tab=journals/);
        await page.getByRole("tab", { name: /conferences/i }).click();
        await page.waitForLoadState("networkidle");
        await expect(page).toHaveURL(/tab=conferences/);
    });
});

test.describe("filter-options endpoint only offers values with data", () => {
    test("subject area list does not include empty categories", async ({ page }) => {
        await page.goto("/charts?chart=for_yearly");
        await page.waitForLoadState("networkidle");
        // The FoR list should be much smaller than the full 90+ ANZSRC
        // taxonomy since only a handful of codes have conferences in our
        // corpus. We assert "Applications in health" is not present
        // because the user reported it as a no-op option.
        await expect(
            page.getByText(/Applications in health/i),
        ).toHaveCount(0);
    });
});
