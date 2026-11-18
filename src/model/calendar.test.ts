import { describe, expect, it } from "vitest";
import { createEntry, createEvent, daysBetween, eventTitle, lastRunBySession, layOutSessions, monthGrid, nextSession, parseCalendar, parseISODate, phaseOn, sampleSeason, seasonFor, shortDay, sortEntries, toISODate, weekdayIndex } from "./calendar";
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
		// A practice without a session is kept (sessions are optional).
		expect(data.entries).toHaveLength(2);
		expect(data.entries[0]).toMatchObject({ time: null, status: "done" });
		expect(data.entries[1]).toMatchObject({ kind: "session", sessionId: "" });
		expect(parseCalendar("{").entries).toEqual([]);
	});
});

describe("plans", () => {
	it("lists sessions topic by topic and survives a round trip", () => {
		const plan = createPlan("Autumn");
		plan.topics = [
			{ ...createTopic(["Attacking transition"]), sessionIds: ["a", "b"] },
			{ ...createTopic(["Pressing"]), sessionIds: ["c", "a"] },
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

describe("the next session, in a few characters", () => {
	const today = new Date(2026, 10, 16); // Monday 16 November 2026
	it("says today, tomorrow, the weekday within a week, then the date", () => {
		expect(shortDay("2026-11-16", today)).toBe("Today");
		expect(shortDay("2026-11-17", today)).toBe("Tomorrow");
		expect(shortDay("2026-11-19", today)).toBe("Thu 19");
		expect(shortDay("2026-12-03", today)).toBe("3 Dec");
	});

	it("skips past, done and cancelled sessions", () => {
		const entries = [
			createEntry("a", "2026-11-10"),
			createEntry("b", "2026-11-18", { status: "cancelled" }),
			createEntry("c", "2026-11-20", { time: "18:00" }),
			createEntry("d", "2026-11-19"),
		];
		expect(nextSession(entries, today)?.sessionId).toBe("d");
		expect(nextSession([], today)).toBeUndefined();
	});
});

describe("matches, events and seasons", () => {
	it("reads older calendars: every entry is a session, and there are no seasons", () => {
		const old = JSON.stringify({ version: 1, entries: [{ id: "a", date: "2026-11-03", sessionId: "s1" }] });
		const cal = parseCalendar(old);
		expect(cal.entries[0]).toMatchObject({ kind: "session", sessionId: "s1", label: "", away: false });
		expect(cal.seasons).toEqual([]);
	});

	it("keeps matches and events, which need no session", () => {
		const match = createEvent("match", "2026-11-21", "Riverside", { away: true, time: "10:00" });
		const event = createEvent("event", "2026-11-24", "Team photos");
		const cal = parseCalendar(JSON.stringify({ version: 1, entries: [match, event], seasons: [] }));
		expect(cal.entries.map(eventTitle)).toEqual(["@ Riverside", "Team photos"]);
		expect(eventTitle({ ...match, away: false })).toBe("vs Riverside");
		expect(cal.entries[0].time).toBe("10:00");
	});

	it("keeps seasons with their phases in order, and drops ones with impossible dates", () => {
		const season = sampleSeason(new Date(2026, 10, 16));
		const broken = { ...season, id: "x", start: "2027-08-01", end: "2027-07-01" };
		const cal = parseCalendar(
			JSON.stringify({ version: 1, entries: [], seasons: [{ ...season, phases: [...season.phases].reverse() }, broken] }),
		);
		expect(cal.seasons).toHaveLength(1);
		expect(cal.seasons[0].phases.map((p) => p.name)[0]).toBe("Pre-season");
		expect(season.name).toBe("Season 2026–27");
	});

	it("finds the season and phase around a date", () => {
		const season = sampleSeason(new Date(2026, 10, 16));
		expect(seasonFor([season], "2026-11-16")?.id).toBe(season.id);
		expect(phaseOn(season, "2026-11-16")?.name).toBe("In-season · Phase 1");
		expect(phaseOn(season, "2026-12-25")?.name).toBe("Winter break");
		expect(daysBetween("2026-11-16", "2026-11-22")).toBe(7);
	});
});
