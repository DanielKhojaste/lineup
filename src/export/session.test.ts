import { describe, expect, it } from "vitest";
import { pageBreaks } from "./session";

describe("splitting the session sheet into pages", () => {
	it("breaks between activities instead of through them", () => {
		const parts = [
			{ top: 0, bottom: 300 },
			{ top: 314, bottom: 700 },
			{ top: 714, bottom: 1150 }, // doesn't fit on page 1
			{ top: 1164, bottom: 1500 },
		];
		const pages = pageBreaks(parts, 1500, 1000, 1000);
		expect(pages[0]).toEqual({ start: 0, end: 708 });
		expect(pages[1].start).toBe(708);
		expect(pages[pages.length - 1].end).toBe(1500);
	});

	it("cuts a part that's taller than a page", () => {
		const pages = pageBreaks([{ top: 0, bottom: 2500 }], 2500, 1000, 1000);
		expect(pages.map((p) => p.end)).toEqual([1000, 2000, 2500]);
	});
});
