import { describe, expect, it } from "vitest";
import { parseTime, showTime } from "./TimeCombo";

describe("typing a time", () => {
	it("understands the usual ways of writing one", () => {
		expect(parseTime("6pm")).toBe("18:00");
		expect(parseTime("6p")).toBe("18:00");
		expect(parseTime("6:30 PM")).toBe("18:30");
		expect(parseTime("630")).toBe("18:30");
		expect(parseTime("6.30")).toBe("18:30");
		expect(parseTime("18:30")).toBe("18:30");
		expect(parseTime("9am")).toBe("09:00");
		expect(parseTime("12pm")).toBe("12:00");
		expect(parseTime("12am")).toBe("00:00");
	});

	it("takes 1 to 7 as the evening and 8 to 11 as the morning when AM or PM is left out", () => {
		expect(parseTime("7")).toBe("19:00");
		expect(parseTime("9")).toBe("09:00");
		expect(parseTime("10:15")).toBe("10:15");
	});

	it("says no to things that aren't times", () => {
		expect(parseTime("25")).toBeNull();
		expect(parseTime("6:75")).toBeNull();
		expect(parseTime("soon")).toBeNull();
	});

	it("shows times the way the computer does", () => {
		expect(showTime("18:30", true)).toBe("6:30 PM");
		expect(showTime("00:15", true)).toBe("12:15 AM");
		expect(showTime("18:30", false)).toBe("18:30");
	});
});
