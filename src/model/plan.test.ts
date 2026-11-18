import { describe, expect, it } from "vitest";
import { createPlan, parsePlan, weekLabel } from "./plan";

describe("plan weeks", () => {
	it("reads a week's one topic from older plans as its first topic", () => {
		const plan = { ...createPlan(), topics: [{ id: "w1", title: "Pressing", notes: "", sessionIds: [] }] };
		expect(parsePlan(JSON.stringify(plan)).topics[0].topics).toEqual(["Pressing"]);
	});

	it("keeps a week's topics, without repeats or empties", () => {
		const plan = {
			...createPlan(),
			topics: [{ id: "w1", topics: ["Pressing", " ", "Pressing", "Transition"], notes: "", sessionIds: [] }],
		};
		expect(parsePlan(JSON.stringify(plan)).topics[0].topics).toEqual(["Pressing", "Transition"]);
	});

	it("labels a week with its topics", () => {
		expect(weekLabel(2, [])).toBe("Week 2");
		expect(weekLabel(2, ["Pressing", "Transition"])).toBe("Week 2 · Pressing, Transition");
	});
});
