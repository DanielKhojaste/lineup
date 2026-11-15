import { describe, expect, it } from "vitest";
import { nextInterfaceScale, scaleLabel } from "./interfaceScale";

describe("interface size steps", () => {
	it("goes up and down one size, and stops at the ends", () => {
		expect(nextInterfaceScale(1, 1)).toBe(1.1);
		expect(nextInterfaceScale(1.1, -1)).toBe(1);
		expect(nextInterfaceScale(1.5, 1)).toBe(1.5);
		expect(nextInterfaceScale(0.9, -1)).toBe(0.9);
		expect(scaleLabel(1.25)).toBe("125%");
	});
});
