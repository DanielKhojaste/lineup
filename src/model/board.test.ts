import { describe, expect, it } from "vitest";
import { createBoard, createPlayer, markerScale } from "./board";

describe("player sizes", () => {
	it("draws each size as the one below it used to be (XL is the old L)", () => {
		const board = createBoard("Sizes");
		const player = createPlayer(0.5, 0.5, "home");
		const at = (playerScale: number, scale?: number) =>
			markerScale({ ...player, scale }, { ...board.display, playerScale });
		expect(at(1.6)).toBeCloseTo(1.3);
		expect(at(1.3)).toBeCloseTo(1);
		expect(at(1)).toBeCloseTo(0.75);
		expect(at(0.75)).toBeLessThan(0.75);
		// A player's own size still goes on top.
		expect(at(1.3, 1.3)).toBeCloseTo(1.3);
	});
});
