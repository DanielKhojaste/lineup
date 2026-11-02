import { describe, expect, it } from "vitest";
import {
	blockTimes,
	createBreakBlock,
	createCustomBlock,
	createDrillBlock,
	createSession,
	decodeSessionFile,
	encodeSessionFile,
	formatMinutes,
	parseSession,
	sessionBoardIds,
	totalMinutes,
} from "./session";
import {
	createSessionState,
	SessionAction,
	sessionReducer,
	SessionState,
} from "../state/session";

function sampleSession() {
	const session = createSession("Tuesday");
	session.blocks = [
		createDrillBlock("board-a", 12),
		createBreakBlock("Water break", 2),
		createDrillBlock("board-b", 20),
		createCustomBlock("Cool-down", 5),
		createDrillBlock("board-a", 10),
	];
	return session;
}

describe("session timings", () => {
	it("adds up the blocks and shows clock times from the start time", () => {
		const session = sampleSession();
		expect(totalMinutes(session)).toBe(49);
		expect(blockTimes(session).map((t) => t.clock)).toEqual([
			null,
			null,
			null,
			null,
			null,
		]);

		session.startTime = "18:00";
		expect(blockTimes(session).map((t) => t.clock)).toEqual([
			"18:00–18:12",
			"18:12–18:14",
			"18:14–18:34",
			"18:34–18:39",
			"18:39–18:49",
		]);
	});

	it("wraps past midnight and formats durations", () => {
		const session = createSession();
		session.startTime = "23:50";
		session.blocks = [createDrillBlock("x", 20)];
		expect(blockTimes(session)[0].clock).toBe("23:50–0:10");
		expect(formatMinutes(45)).toBe("45 min");
		expect(formatMinutes(75)).toBe("1 h 15 min");
		expect(formatMinutes(120)).toBe("2 h");
	});

	it("lists the boards a session uses once each", () => {
		expect(sessionBoardIds(sampleSession())).toEqual(["board-a", "board-b"]);
	});
});

describe("session files", () => {
	it("round-trips through a compressed file", () => {
		const session = sampleSession();
		session.header.focusPoints = ["Scanning", "First touch"];
		session.header.sport = "futsal";
		const bytes = encodeSessionFile(session);
		expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("LNUP");
		expect(decodeSessionFile(bytes)).toEqual(session);
	});

	it("drops broken blocks and fills in missing fields", () => {
		const session = parseSession(
			JSON.stringify({
				schemaVersion: 1,
				docType: "session",
				id: "s1",
				header: { plannedMinutes: 90, sport: "curling" },
				startTime: "25:00",
				blocks: [
					{ kind: "drill", boardId: "b", minutes: 12.4 },
					{ kind: "drill" },
					{ kind: "break", minutes: -3 },
					{ kind: "lunch", minutes: 30 },
				],
			}),
		);
		expect(session.meta.title).toBe("Untitled session");
		expect(session.header.plannedMinutes).toBe(90);
		expect(session.header.sport).toBe("");
		expect(session.startTime).toBeNull();
		expect(session.blocks.map((b) => [b.kind, b.minutes])).toEqual([
			["drill", 12],
			["break", 0],
		]);
	});

	it("refuses boards and newer sessions", () => {
		expect(() => parseSession(JSON.stringify({ schemaVersion: 2, nodes: [] }))).toThrow(
			/isn't a Lineup session/,
		);
		expect(() =>
			parseSession(JSON.stringify({ schemaVersion: 9, docType: "session" })),
		).toThrow(/newer version/);
	});
});

describe("editing a session", () => {
	const run = (state: SessionState, ...actions: SessionAction[]) =>
		actions.reduce(sessionReducer, state);

	it("adds, moves, duplicates and removes blocks, with undo", () => {
		const a = createDrillBlock("a");
		const b = createBreakBlock();
		const c = createCustomBlock("Talk");
		let state = createSessionState(createSession());
		state = run(
			state,
			{ type: "addBlocks", blocks: [a, c] },
			{ type: "addBlocks", blocks: [b], index: 1 },
		);
		expect(state.session.blocks.map((x) => x.id)).toEqual([a.id, b.id, c.id]);

		state = run(state, { type: "moveBlock", id: c.id, index: 0 });
		expect(state.session.blocks.map((x) => x.id)).toEqual([c.id, a.id, b.id]);

		state = run(state, { type: "duplicateBlock", id: a.id });
		expect(state.session.blocks).toHaveLength(4);
		expect(state.session.blocks[2]).toMatchObject({ kind: "drill", boardId: "a" });

		state = run(state, { type: "removeBlock", id: b.id }, { type: "undo" });
		expect(state.session.blocks).toHaveLength(4);
		state = run(state, { type: "undo" }, { type: "undo" });
		expect(state.session.blocks.map((x) => x.id)).toEqual([a.id, b.id, c.id]);
		state = run(state, { type: "redo" });
		expect(state.session.blocks[0].id).toBe(c.id);
	});

	it("keeps minutes whole and in range, and labels only where they belong", () => {
		const drill = createDrillBlock("a");
		let state = run(createSessionState(createSession()), {
			type: "addBlocks",
			blocks: [drill],
		});
		state = run(state, {
			type: "updateBlock",
			id: drill.id,
			patch: { minutes: 999.6, label: "nope" },
		});
		expect(state.session.blocks[0]).toEqual({ ...drill, minutes: 240 });
	});

	it("records typing in a field as one undo step", () => {
		let state = createSessionState(createSession());
		state = run(
			state,
			{ type: "beginGesture" },
			{ type: "updateHeader", patch: { team: "U" } },
			{ type: "updateHeader", patch: { team: "U1" } },
			{ type: "updateHeader", patch: { team: "U12" } },
			{ type: "endGesture" },
		);
		expect(state.past).toHaveLength(1);
		state = run(state, { type: "undo" });
		expect(state.session.header.team).toBe("");
	});
});

describe("durations from drill notes", () => {
	it("reads minutes from the board's duration note", async () => {
		const { minutesFromText } = await import("./session");
		expect(minutesFromText("15 min")).toBe(15);
		expect(minutesFromText("15")).toBe(15);
		expect(minutesFromText("20'")).toBe(20);
		expect(minutesFromText("1 h 5 min")).toBe(65);
		expect(minutesFromText("1.5 hours")).toBe(90);
		expect(minutesFromText("")).toBeNull();
		expect(minutesFromText("long")).toBeNull();
	});
});
