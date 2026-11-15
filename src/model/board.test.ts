import { describe, expect, it } from "vitest";
import { createBoard, createPlayer, markerScale } from "./board";

describe("player sizes", () => {
	it("draws XL as the old L and L as the old M; M and S a bit bigger than the old S", () => {
		const board = createBoard("Sizes");
		const player = createPlayer(0.5, 0.5, "home");
		const at = (playerScale: number, scale?: number) =>
			markerScale({ ...player, scale }, { ...board.display, playerScale });
		expect(at(1.6)).toBeCloseTo(1.3);
		expect(at(1.3)).toBeCloseTo(1);
		// M and S are a little bigger than the old S and below.
		expect(at(1)).toBeCloseTo(0.82);
		expect(at(0.75)).toBeCloseTo(0.66);
		// A player's own size still goes on top.
		expect(at(1.3, 1.3)).toBeCloseTo(1.3);
	});
});
