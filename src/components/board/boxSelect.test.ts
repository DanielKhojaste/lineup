import { describe, expect, it } from "vitest";
import { createBoard, createCone, createPlayer } from "../../model/board";
import { BOARD_WIDTH } from "../../model/pitch";
import { LineDrawing, ZoneDrawing } from "../../model/types";
import { BOX_SELECT, boxPicksDrawing, boxPicksMarker } from "./boxSelect";

const line = {
	id: "l",
	kind: "line",
	from: [0.1, 0.5],
	to: [0.5, 0.5],
	stroke: "solid",
	heads: "end",
	width: "medium",
} as LineDrawing;

const zone = {
	id: "z",
	kind: "zone",
	shape: "rect",
	x: 0.2,
	y: 0.2,
	w: 0.4,
	h: 0.4,
	dashed: false,
} as ZoneDrawing;

// Covers the left 60% of the line, and only its left end.
const mostOfIt = { x1: 0, y1: 0.4, x2: 0.34, y2: 0.6 };
const aBit = { x1: 0, y1: 0.4, x2: 0.15, y2: 0.6 };

describe("selection box", () => {
	it("uses half for drawings and touch for markers", () => {
		expect(BOX_SELECT).toEqual({ drawings: "half", markers: "touch" });
	});

	it("half: half or more of a line", () => {
		expect(boxPicksDrawing(line, mostOfIt)).toBe(true);
		expect(boxPicksDrawing(line, aBit)).toBe(false);
	});

	it("touch (kept as a preset): any part, but not a zone the box sits inside", () => {
		expect(boxPicksDrawing(line, aBit, "touch")).toBe(true);
		expect(boxPicksDrawing(zone, { x1: 0.3, y1: 0.3, x2: 0.4, y2: 0.4 }, "touch")).toBe(false);
		expect(boxPicksDrawing(zone, { x1: 0.1, y1: 0.3, x2: 0.25, y2: 0.4 }, "touch")).toBe(true);
	});

	it("markers: picked when the box touches any part of them", () => {
		const board = createBoard("Box");
		const player = createPlayer(0.5, 0.5, "home");
		const cone = createCone(0.5, 0.5);
		// A box whose edge stops just short of the centre, but over the marker's edge.
		const nearEdge = 6 / BOARD_WIDTH;
		const box = { x1: 0.2, y1: 0.4, x2: 0.5 - nearEdge, y2: 0.6 };
		expect(boxPicksMarker(player, box, board)).toBe(true);
		expect(boxPicksMarker(player, box, board, "centre")).toBe(false);
		expect(boxPicksMarker(cone, box, board)).toBe(true);
		const farAway = { x1: 0, y1: 0, x2: 0.3, y2: 0.3 };
		expect(boxPicksMarker(player, farAway, board)).toBe(false);
	});
});
