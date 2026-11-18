import { describe, expect, it } from "vitest";
import { sportLetters } from "./TeamField";

describe("sport letters", () => {
	it("uses one letter unless another sport starts with it", () => {
		expect(sportLetters("soccer")).toBe("S");
		expect(sportLetters("basketball")).toBe("B");
		expect(sportLetters("volleyball")).toBe("V");
		expect(sportLetters("handball")).toBe("H");
		expect(sportLetters("futsal")).toBe("FU");
		expect(sportLetters("hockey")).toBe("FH");
		expect(sportLetters("icehockey")).toBe("I");
	});
});
