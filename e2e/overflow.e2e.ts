/**
 * No unexpected scrollbars: every screen, filled with the longest titles,
 * team names, folders and the most topics, must fit the window sideways.
 * Long text wraps or ends in "…"; nothing pushes the page wider.
 *
 * Scrolling up and down in lists is expected and not checked. Scrollbars at
 * a large interface size (Settings › Interface size) are fine too, so this
 * runs at 100%.
 */
import { expect, Page, test } from "@playwright/test";
import { stressLibrary } from "./stress-library";

const library = stressLibrary();
const { ids } = library;

/** Window sizes to check: a laptop, and the smallest window Lineup is made for. */
const SIZES = [
	{ width: 1440, height: 900 },
	{ width: 1100, height: 720 },
];

test.beforeEach(async ({ page }) => {
	await page.addInitScript((storage) => {
		// Only once per test, so changes made during the test stay.
		if (sessionStorage.getItem("seeded")) return;
		localStorage.clear();
		for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
		sessionStorage.setItem("seeded", "1");
	}, library.storage);
});

/**
 * Anything wider than its box that would show a sideways scrollbar: the page
 * itself, or any element that scrolls sideways (overflow-x auto or scroll).
 */
async function sidewaysOverflow(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const found: string[] = [];
		const name = (el: Element) => {
			const cls = [...el.classList].slice(0, 2).join(".");
			return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
		};
		const root = document.scrollingElement ?? document.documentElement;
		if (root.scrollWidth > root.clientWidth + 1) found.push(`the page (${root.scrollWidth} > ${root.clientWidth})`);
		for (const el of document.querySelectorAll<HTMLElement>("body *")) {
			const x = getComputedStyle(el).overflowX;
			if ((x === "auto" || x === "scroll") && el.scrollWidth > el.clientWidth + 1)
				found.push(`${name(el)} (${el.scrollWidth} > ${el.clientWidth})`);
		}
		return found;
	});
}

async function expectFits(page: Page, where: string) {
	await page.waitForTimeout(250);
	expect(await sidewaysOverflow(page), `sideways scrollbars on ${where}`).toEqual([]);
}

for (const size of SIZES) {
	test.describe(`${size.width}×${size.height}`, () => {
		test.use({ viewport: size });

		test("library: boards, sessions, plans and a folder", async ({ page }) => {
			await page.goto("/");
			for (const view of ["Boards", "Sessions", "Plans"]) {
				await page.locator(".library__nav").getByText(view, { exact: true }).click();
				await expectFits(page, `the library (${view})`);
			}
			await page.locator(".library__nav").getByText(/Autumn block/).first().click();
			await expectFits(page, "a folder");
		});

		test("board editor", async ({ page }) => {
			await page.goto(`/board/${ids.board}`);
			await page.waitForSelector(".board");
			await expectFits(page, "the board editor");
		});

		test("session editor and preview", async ({ page }) => {
			await page.goto(`/session/${ids.cool}`);
			await page.waitForTimeout(500);
			await expectFits(page, "the session editor");
			await page.goto(`/session/${ids.cool}/preview`);
			await page.waitForTimeout(500);
			await expectFits(page, "the session preview");
		});

		test("plan: one week and all weeks", async ({ page }) => {
			await page.goto(`/plan/${ids.plan}`);
			await page.waitForSelector(".plan-outline");
			for (let i = 0; i < 3; i++) {
				await page.locator(".plan-outline__pick").nth(i).click();
				await expectFits(page, `the plan (week ${i + 1})`);
			}
			await page.locator(".plan-outline__all").click();
			await expectFits(page, "the plan (all weeks)");
		});

		test("calendar: month, week, matches and the pickers", async ({ page }) => {
			await page.goto("/calendar");
			await page.getByRole("radio", { name: "Month" }).click();
			await expectFits(page, "the calendar (month)");
			await page.getByRole("radio", { name: "Week" }).click();
			await expectFits(page, "the calendar (week)");
			await page.getByRole("button", { name: "Add a practice" }).click();
			await page.waitForSelector(".dialog--item");
			await expectFits(page, "the new item window");
			await page.getByRole("button", { name: "Attach a session or board…" }).click();
			await page.waitForSelector(".dialog--picker");
			await expectFits(page, "the session picker");
		});

		test("new board and settings", async ({ page }) => {
			await page.goto("/");
			await page.getByRole("button", { name: /New board/ }).first().click();
			await page.waitForSelector("dialog[open]");
			await expectFits(page, "New board");
			await page.keyboard.press("Escape");
			await page.getByRole("button", { name: /Settings/ }).first().click();
			await page.waitForSelector("dialog[open]");
			await expectFits(page, "Settings");
		});
	});
}

test("long text ends in an ellipsis instead of widening its card", async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 720 });
	await page.goto("/");
	await page.locator(".library__nav").getByText("Sessions", { exact: true }).click();
	const title = page.locator(".board-card", { hasText: "Playing out from the back" }).locator(".board-card__title").first();
	const style = await title.evaluate((el) => {
		const s = getComputedStyle(el);
		return { ellipsis: s.textOverflow, cut: el.scrollWidth > el.clientWidth, fits: el.getBoundingClientRect().right <= (el.closest(".board-card")!.getBoundingClientRect().right + 1) };
	});
	expect(style.ellipsis).toBe("ellipsis");
	expect(style.cut).toBe(true);
	expect(style.fits).toBe(true);
});

/** What the preview's key hints show: groups fully in view, and any cut in half. */
async function keyHints(page: Page) {
	return page.evaluate(() => {
		const keys = document.querySelector(".session-preview__keys")!;
		const box = keys.getBoundingClientRect();
		const groups = [...keys.querySelectorAll(".session-preview__keygroup")].map((g) => g.getBoundingClientRect());
		const inside = (r: DOMRect) =>
			r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5 && r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
		const outside = (r: DOMRect) => r.top >= box.bottom - 0.5 || r.left >= box.right - 0.5 || r.right <= box.left + 0.5;
		const bar = document.querySelector(".topbar")!;
		return {
			shown: groups.filter(inside).length,
			cut: groups.filter((r) => !inside(r) && !outside(r)).length,
			barOverflows: bar.scrollWidth > bar.clientWidth + 1,
		};
	});
}

test.describe("session preview key hints", () => {
	for (const size of [{ width: 960, height: 600 }, ...SIZES]) {
		test(`show when there's room, never cut in half (${size.width}×${size.height})`, async ({ page }) => {
			await page.setViewportSize(size);
			await page.goto(`/session/${ids.cool}/preview`);
			await page.waitForSelector(".session-preview__keys");
			const normal = await keyHints(page);
			expect(normal.barOverflows, "the top bar overflows").toBe(false);
			expect(normal.cut, "a key hint is cut in half").toBe(0);
			// A title of ordinary length leaves room for all three (Blocks, Steps, Play).
			expect(normal.shown, "key hints shown with a short title").toBe(3);

			await page.goto(`/session/${ids.long}/preview`);
			await page.waitForSelector(".session-preview__keys");
			const long = await keyHints(page);
			expect(long.barOverflows, "the top bar overflows (long title)").toBe(false);
			expect(long.cut, "a key hint is cut in half (long title)").toBe(0);
		});
	}
});
