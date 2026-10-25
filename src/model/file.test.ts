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

	it("keeps a player's own colour and drops old keeper colours", () => {
		const board = {
			...createBoard(),
			teams: {
				...createBoard().teams,
				home: { name: "Reds", color: "#ED1B24", keeperColor: "#22C55E" },
			},
			nodes: [{ ...createPlayer(0.5, 0.5, "home"), color: "#F5C518" }],
		};
		const parsed = parseBoard(JSON.stringify(board));
		expect(parsed.teams.home).toEqual({ name: "Reds", color: "#ED1B24" });
		expect(parsed.nodes[0]).toMatchObject({ color: "#F5C518" });
	});

	it("keeps striped kits for teams and players", () => {
		const board = createBoard();
		board.teams.home = { name: "Barça", color: "#004D98", stripes: "#A50044" };
		board.nodes = [
			{
				...createPlayer(0.5, 0.5, "away"),
				color: "#FFFFFF",
				stripes: "#15181B",
			},
			// Stripes without a colour of the player's own mean nothing, so they go.
			{ ...createPlayer(0.4, 0.5, "home"), stripes: "#FF0000" },
		];
		const parsed = parseBoard(JSON.stringify(board));
		expect(parsed.teams.home).toEqual(board.teams.home);
		expect(parsed.nodes[0]).toMatchObject({
			color: "#FFFFFF",
			stripes: "#15181B",
		});
		expect((parsed.nodes[1] as { stripes?: string }).stripes).toBeUndefined();
	});

	it("keeps animation steps and drops moves for missing markers", () => {
		const player = createPlayer(0.2, 0.5, "home");
		const board = {
			...createBoard(),
			nodes: [player],
			steps: [
				{
					id: "s1",
					duration: 2,
					moves: {
						[player.id]: {
							x: 0.6,
							y: 0.4,
							via: [[0.4, 0.2] as [number, number]],
						},
						ghost: { x: 0.1, y: 0.1 },
					},
				},
			],
		};
		const parsed = parseBoard(JSON.stringify(board));
		expect(parsed.steps).toEqual([
			{
				id: "s1",
				duration: 2,
				moves: { [player.id]: { x: 0.6, y: 0.4, via: [[0.4, 0.2]] } },
			},
		]);
	});

	it("opens version 1 boards with no steps", () => {
		const { steps: _none, ...old } = { ...createBoard(), schemaVersion: 1 };
		expect(parseBoard(JSON.stringify(old)).steps).toEqual([]);
	});

	it("keeps marker sizes within limits, and defaults old boards to normal", () => {
		const board = createBoard();
		board.display = { showLabels: true, playerScale: 1.3, equipmentScale: 9 };
		expect(parseBoard(JSON.stringify(board)).display).toEqual({
			showLabels: true,
			playerScale: 1.3,
			equipmentScale: 2,
		});
		const { display: _none, ...old } = createBoard();
		expect(parseBoard(JSON.stringify(old)).display).toMatchObject({
			playerScale: 1,
			equipmentScale: 1,
		});
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
