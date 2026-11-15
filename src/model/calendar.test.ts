import { describe, expect, it } from "vitest";
import {
	createEntry,
	lastRunBySession,
	layOutSessions,
	monthGrid,
	parseCalendar,
	parseISODate,
	sortEntries,
	toISODate,
	weekdayIndex,
} from "./calendar";
import { createPlan, createTopic, parsePlan, planSessionIds } from "./plan";

describe("calendar dates", () => {
	it("reads and writes local dates", () => {
		const d = parseISODate("2026-03-03")!;
		expect(d.getDate()).toBe(3);
		expect(toISODate(d)).toBe("2026-03-03");
		expect(weekdayIndex(d)).toBe(1); // a Tuesday
		expect(parseISODate("2026-02-30")).toBeNull();
		expect(parseISODate("tomorrow")).toBeNull();
	});

	it("shows six weeks for a month, starting on a Monday", () => {
		const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
		expect(grid).toHaveLength(42);
		expect(toISODate(grid[0])).toBe("2026-10-26");
		expect(weekdayIndex(grid[0])).toBe(0);
		expect(grid.map(toISODate)).toContain("2026-11-30");
	});
});

describe("laying out a plan", () => {
	it("puts sessions on the chosen training days in order", () => {
		// From Monday 2 March 2026, on Tuesdays and Thursdays.
		const entries = layOutSessions(["a", "b", "c", "d"], "2026-03-02", [1, 3], {
			time: "18:00",
			team: "U12",
			planId: "p",
		});
		expect(entries.map((e) => [e.sessionId, e.date])).toEqual([
			["a", "2026-03-03"],
			["b", "2026-03-05"],
			["c", "2026-03-10"],
			["d", "2026-03-12"],
		]);
		expect(entries[0]).toMatchObject({
			time: "18:00",
			team: "U12",
			planId: "p",
			status: "planned",
		});
	});

	it("does nothing without training days or a start date", () => {
		expect(layOutSessions(["a"], "2026-03-02", [])).toEqual([]);
		expect(layOutSessions(["a"], "soon", [1])).toEqual([]);
	});
});

describe("calendar entries", () => {
	it("sorts by date then time, and finds when a session last ran", () => {
		const a = createEntry("s1", "2026-03-05", { time: "18:00", status: "done" });
		const b = createEntry("s1", "2026-03-12", { status: "done" });
		const c = createEntry("s1", "2026-03-19");
		const d = createEntry("s2", "2026-03-05", { time: "09:00" });
		expect(sortEntries([c, a, b, d]).map((e) => e.id)).toEqual([
			d.id,
			a.id,
			b.id,
			c.id,
		]);
		// On 15 March: the 19th hasn't happened yet, and s2's planned session on
		// the 5th has passed, so it counts as run.
		const last = lastRunBySession([a, b, c, d], "2026-03-15");
		expect(last.get("s1")).toBe("2026-03-12");
		expect(last.get("s2")).toBe("2026-03-05");
	});

	it("drops broken entries when reading the file", () => {
		const data = parseCalendar(
			JSON.stringify({
				version: 1,
				entries: [
					{ sessionId: "s", date: "2026-03-03", time: "25:00", status: "done" },
					{ sessionId: "s", date: "nope" },
					{ date: "2026-03-03" },
				],
			}),
		);
		expect(data.entries).toHaveLength(1);
		expect(data.entries[0]).toMatchObject({ time: null, status: "done" });
		expect(parseCalendar("{").entries).toEqual([]);
	});
});

describe("plans", () => {
	it("lists sessions topic by topic and survives a round trip", () => {
		const plan = createPlan("Autumn");
		plan.topics = [
			{ ...createTopic("Attacking transition"), sessionIds: ["a", "b"] },
			{ ...createTopic("Pressing"), sessionIds: ["c", "a"] },
		];
		expect(planSessionIds(plan)).toEqual(["a", "b", "c", "a"]);
		expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
		expect(() => parsePlan(JSON.stringify({ docType: "session" }))).toThrow();
	});
});

describe("describing days", () => {
	it("says how far away a day is", async () => {
		const { describeDay, lastRunByBoard } = await import("./calendar");
		const today = new Date(2026, 2, 15);
		expect(describeDay("2026-03-15", today)).toBe("today");
		expect(describeDay("2026-03-14", today)).toBe("yesterday");
		expect(describeDay("2026-03-03", today)).toBe("12 days ago");
		expect(describeDay("2026-03-18", today)).toBe("in 3 days");
		expect(describeDay("2025-12-01", today)).toMatch(/2025/);

		const runs = [
			createEntry("s1", "2026-03-03", { status: "done" }),
			createEntry("s2", "2026-03-10", { status: "done" }),
		];
		const boards: Record<string, string[]> = { s1: ["a", "b"], s2: ["b"] };
		const last = lastRunByBoard(runs, (id) => boards[id] ?? []);
		expect(last.get("a")).toBe("2026-03-03");
		expect(last.get("b")).toBe("2026-03-10");
	});
});

describe("a plan's weeks on the calendar", () => {
	it("puts each week's sessions on that week's training days", async () => {
		const { layOutWeeks } = await import("./calendar");
		// Starts Wednesday 4 March 2026; training on Tuesdays (1) and Thursdays (3).
		const entries = layOutWeeks([["a", "b"], [], ["c", "d", "e"]], "2026-03-04", [1, 3]);
		expect(entries.map((e) => [e.sessionId, e.date])).toEqual([
			// Week 1: Tuesday 3 March is before the start, so both go on Thursday.
			["a", "2026-03-05"],
			["b", "2026-03-05"],
			// Week 2 is empty. Week 3: Tuesday, Thursday, and the extra on Thursday.
			["c", "2026-03-17"],
			["d", "2026-03-19"],
			["e", "2026-03-19"],
		]);
	});
});

describe("sessions that have passed", () => {
	it("count as done unless cancelled, and only past ones count as run", async () => {
		const { createEntry, statusOf, lastRunBySession } = await import("./calendar");
		const past = createEntry("a", "2026-03-03");
		const cancelled = { ...createEntry("b", "2026-03-03"), status: "cancelled" as const };
		const future = { ...createEntry("a", "2026-03-20"), status: "done" as const };
		expect(statusOf(past, "2026-03-10")).toBe("done");
		expect(statusOf(cancelled, "2026-03-10")).toBe("cancelled");
		expect(statusOf(createEntry("c", "2026-03-10"), "2026-03-10")).toBe("planned");
		expect(lastRunBySession([past, cancelled, future], "2026-03-10").get("a")).toBe("2026-03-03");
		expect(lastRunBySession([past, cancelled, future], "2026-03-10").has("b")).toBe(false);
	});
});
