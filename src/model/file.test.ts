import { describe, expect, it } from "vitest";
import { createBoard, createCone, createPlayer } from "./board";
import { createLine, createText, DEFAULT_TOOL_STYLES } from "./drawings";
import {
	BoardFileError,
	fileNameFor,
	parseBoard,
	serializeBoard,
} from "./file";

describe("board files", () => {
	it("round-trips a board", () => {
		const board = {
			...createBoard("Rondo"),
			nodes: [
				createPlayer(0.5, 0.5, "home", { number: 8, label: "CM" }),
				createCone(0.2, 0.2),
			],
			drawings: [
				createLine("pass", [0.1, 0.1], [0.3, 0.3], DEFAULT_TOOL_STYLES.line),
				createText(0.5, 0.2, "Scan!", DEFAULT_TOOL_STYLES.text),
			],
		};
		board.notes.coachingPoints = ["Open body shape"];
		expect(parseBoard(serializeBoard(board))).toEqual(
			JSON.parse(serializeBoard(board)),
		);
	});

	it("rejects files that aren't boards", () => {
		expect(() => parseBoard("not json")).toThrow(BoardFileError);
		expect(() => parseBoard('{"hello": 1}')).toThrow(BoardFileError);
	});

	it("refuses boards from a newer version", () => {
		const board = { ...createBoard(), schemaVersion: 99 };
		expect(() => parseBoard(JSON.stringify(board))).toThrow(/newer version/);
	});

	it("fills in missing fields and drops broken items", () => {
		const board = parseBoard(
			JSON.stringify({
				schemaVersion: 1,
				nodes: [
					{ kind: "player", x: 0.5, y: 2, team: "martians" },
					{ kind: "dragon", x: 0.1, y: 0.1 },
					{ kind: "cone", x: "left" },
				],
				drawings: [
					{ kind: "line", from: [0, 0] },
					{ kind: "pen", points: [[0.1, 0.1], "x"] },
				],
			}),
		);
		expect(board.meta.title).toBe("Untitled board");
		expect(board.teams.home.color).toBeDefined();
		expect(board.nodes).toHaveLength(1);
		expect(board.nodes[0]).toMatchObject({
			kind: "player",
			team: "home",
			y: 1,
			keeper: false,
		});
		expect(board.nodes[0].id).toBeTruthy();
		expect(board.drawings).toHaveLength(1);
		expect(board.drawings[0]).toMatchObject({
			kind: "pen",
			points: [[0.1, 0.1]],
		});
	});
});

describe("file names", () => {
	it("strips characters Windows doesn't allow", () => {
		expect(fileNameFor('Rondo: 4v2 / "switch"?', "lineup")).toBe(
			"Rondo 4v2 switch.lineup",
		);
		expect(fileNameFor("   ", "png")).toBe("Untitled board.png");
	});
});
