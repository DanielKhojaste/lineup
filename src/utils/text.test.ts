import { describe, expect, it } from "vitest";
import { truncate } from "./text";

describe("truncate", () => {
	it("leaves short text alone", () => {
		expect(truncate("CAM · Bonmatí", 22)).toBe("CAM · Bonmatí");
	});

	it("cuts long text and adds an ellipsis", () => {
		const out = truncate("CAM · Maximilianoooooooooooooo", 22);
		expect(out).toBe("CAM · Maximilianooooo…");
		expect([...out]).toHaveLength(22);
	});

	it("does not leave a space before the ellipsis", () => {
		expect(truncate("Jo Smith-Wellington", 4)).toBe("Jo…");
	});
});
