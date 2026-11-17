import { describe, expect, it } from "vitest";
import { createBoard } from "./board";
import { focusView } from "./focusView";
import { fieldView } from "./sports";

describe("zooming a printed diagram to its drill", () => {
	it("shows the whole field for an empty board", () => {
		const board = createBoard("", { sport: "soccer", variant: "full" });
		expect(focusView(board)).toEqual(fieldView(board.pitch));
	});

	it("frames a small drill at 3:2, inside the field", () => {
		const board = createBoard("", { sport: "soccer", variant: "full" });
		board.nodes = [
			{ id: "a", kind: "cone", x: 0.4, y: 0.4, color: "#f80" },
			{ id: "b", kind: "cone", x: 0.5, y: 0.5, color: "#f80" },
		] as typeof board.nodes;
		const field = fieldView(board.pitch);
		const v = focusView(board);
		expect(v.width / v.height).toBeCloseTo(1.5);
		expect(v.width).toBeLessThan(field.width);
		expect(v.x).toBeGreaterThanOrEqual(field.x);
		expect(v.x + v.width).toBeLessThanOrEqual(field.x + field.width + 0.001);
	});
});
