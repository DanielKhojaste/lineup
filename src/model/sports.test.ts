import { describe, expect, it } from "vitest";
import { createEditorState, editorReducer } from "../state/editor";
import { createBoard } from "./board";
import { parseBoard, serializeBoard } from "./file";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./pitch";
import { fieldLayout, goalSize, SPORTS } from "./sports";

describe("sports", () => {
	it("draws a full soccer pitch exactly as before (10 units per metre)", () => {
		const layout = fieldLayout({ sport: "soccer", variant: "full" });
		expect(layout.scale).toBeCloseTo(10);
		expect(layout.x).toBeCloseTo(0);
		expect(layout.y).toBeCloseTo(0);
		expect(goalSize({ sport: "soccer", variant: "full" })?.width).toBeCloseTo(
			73.2,
		);
	});

	it("fits every sport's field, full and half, inside the board", () => {
		for (const sport of SPORTS) {
			for (const variant of ["full", "half"] as const) {
				const l = fieldLayout({ sport, variant });
				expect(l.x).toBeGreaterThanOrEqual(-0.001);
				expect(l.y).toBeGreaterThanOrEqual(-0.001);
				expect(l.x * 2 + l.across * l.scale).toBeCloseTo(BOARD_WIDTH);
				expect(l.y * 2 + l.down * l.scale).toBeCloseTo(BOARD_HEIGHT);
			}
		}
	});

	it("has no goals for basketball and volleyball", () => {
		expect(goalSize({ sport: "basketball", variant: "full" })).toBeNull();
		expect(goalSize({ sport: "volleyball", variant: "half" })).toBeNull();
	});

	it("starts new boards with a chosen sport, and saves it", () => {
		const board = createBoard("Press", {
			sport: "basketball",
			variant: "half",
		});
		expect(parseBoard(serializeBoard(board)).pitch).toEqual({
			sport: "basketball",
			variant: "half",
		});
	});

	it("opens older and unknown boards as a full soccer pitch", () => {
		const { pitch: _none, ...old } = createBoard();
		expect(parseBoard(JSON.stringify(old)).pitch).toEqual({
			sport: "soccer",
			variant: "full",
		});
		const future = {
			...createBoard(),
			pitch: { sport: "curling", variant: "third" },
		};
		expect(parseBoard(JSON.stringify(future)).pitch).toEqual({
			sport: "soccer",
			variant: "full",
		});
	});

	it("changes a board's sport as one undoable step", () => {
		let state = createEditorState(createBoard());
		state = editorReducer(state, {
			type: "updatePitch",
			patch: { sport: "volleyball" },
		});
		expect(state.board.pitch).toEqual({ sport: "volleyball", variant: "full" });
		state = editorReducer(state, {
			type: "updatePitch",
			patch: { sport: "volleyball" },
		});
		expect(state.past).toHaveLength(1);
		state = editorReducer(state, { type: "undo" });
		expect(state.board.pitch.sport).toBe("soccer");
	});

	it("turns goals placed on a half field to face down the field", () => {
		let state = createEditorState(
			createBoard("Half", { sport: "handball", variant: "half" }),
		);
		state = editorReducer(state, {
			type: "place",
			tool: "goal",
			x: 0.5,
			y: 0.08,
		});
		expect(state.board.nodes[0]).toMatchObject({ kind: "goal", rotation: 90 });
	});
});
