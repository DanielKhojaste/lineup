import { describe, expect, it } from "vitest";
import {
	createBoard,
	createCone,
	createPlayer,
	nextShirtNumber,
} from "../model/board";
import { Board, PlayerNode } from "../model/types";
import {
	createEditorState,
	EditorAction,
	EditorState,
	editorReducer,
	HISTORY_LIMIT,
} from "./editor";

function run(state: EditorState, ...actions: EditorAction[]): EditorState {
	return actions.reduce(editorReducer, state);
}

function boardWith(...nodes: Board["nodes"]): Board {
	return { ...createBoard("Test"), nodes };
}

describe("placing nodes", () => {
	it("places a player, selects it and gives it the next shirt number", () => {
		let state = createEditorState(boardWith());
		state = run(state, { type: "place", tool: "home", x: 0.5, y: 0.5 });
		state = run(state, { type: "place", tool: "home", x: 0.6, y: 0.5 });

		const players = state.board.nodes as PlayerNode[];
		expect(players.map((p) => p.number)).toEqual([2, 3]);
		expect(state.selection).toEqual([players[1].id]);
		expect(state.past).toHaveLength(2);
	});

	it("numbers keepers from 1 and leaves neutral players unnumbered", () => {
		const state = run(
			createEditorState(boardWith()),
			{ type: "place", tool: "keeper", x: 0.1, y: 0.5 },
			{ type: "place", tool: "neutral", x: 0.5, y: 0.5 },
		);
		const [keeper, neutral] = state.board.nodes as PlayerNode[];
		expect(keeper).toMatchObject({ keeper: true, number: 1, team: "home" });
		expect(neutral.number).toBeUndefined();
	});

	it("clamps placement to the board", () => {
		const state = run(createEditorState(boardWith()), {
			type: "place",
			tool: "cone",
			x: 1.4,
			y: -0.2,
		});
		expect(state.board.nodes[0]).toMatchObject({ x: 1, y: 0 });
	});
});

describe("nextShirtNumber", () => {
	it("fills gaps", () => {
		const nodes = [
			createPlayer(0, 0, "home", { number: 2 }),
			createPlayer(0, 0, "home", { number: 4 }),
		];
		expect(nextShirtNumber(nodes, "home")).toBe(3);
		expect(nextShirtNumber(nodes, "away")).toBe(2);
	});
});

describe("undo and redo", () => {
	it("undoes and redoes changes", () => {
		const cone = createCone(0.5, 0.5);
		let state = createEditorState(boardWith(cone));
		state = run(state, { type: "moveNodes", ids: [cone.id], dx: 0.1, dy: 0 });
		expect(state.board.nodes[0].x).toBeCloseTo(0.6);

		state = run(state, { type: "undo" });
		expect(state.board.nodes[0].x).toBeCloseTo(0.5);

		state = run(state, { type: "redo" });
		expect(state.board.nodes[0].x).toBeCloseTo(0.6);
	});

	it("clears the redo stack after a new change", () => {
		const cone = createCone(0.5, 0.5);
		const state = run(
			createEditorState(boardWith(cone)),
			{ type: "moveNodes", ids: [cone.id], dx: 0.1, dy: 0 },
			{ type: "undo" },
			{ type: "moveNodes", ids: [cone.id], dx: 0, dy: 0.1 },
		);
		expect(state.future).toHaveLength(0);
	});

	it("drops selection of nodes that no longer exist", () => {
		const state = run(
			createEditorState(boardWith()),
			{ type: "place", tool: "ball", x: 0.5, y: 0.5 },
			{ type: "undo" },
		);
		expect(state.board.nodes).toHaveLength(0);
		expect(state.selection).toEqual([]);
	});

	it("caps the history", () => {
		const cone = createCone(0.5, 0.5);
		let state = createEditorState(boardWith(cone));
		for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
			const dx = i % 2 === 0 ? 0.01 : -0.01;
			state = run(state, { type: "moveNodes", ids: [cone.id], dx, dy: 0 });
		}
		expect(state.past).toHaveLength(HISTORY_LIMIT);
	});

	it("does nothing with an empty history", () => {
		const state = createEditorState(boardWith());
		expect(run(state, { type: "undo" })).toBe(state);
		expect(run(state, { type: "redo" })).toBe(state);
	});
});

describe("gestures", () => {
	it("records a whole drag as one undo step", () => {
		const cone = createCone(0.5, 0.5);
		let state = run(
			createEditorState(boardWith(cone)),
			{ type: "beginGesture" },
			{ type: "dragNodes", ids: [cone.id], dx: 0.05, dy: 0 },
			{ type: "dragNodes", ids: [cone.id], dx: 0.1, dy: 0.05 },
			{ type: "endGesture" },
		);
		expect(state.board.nodes[0]).toMatchObject({ x: 0.6, y: 0.55 });
		expect(state.past).toHaveLength(1);

		state = run(state, { type: "undo" });
		expect(state.board.nodes[0]).toMatchObject({ x: 0.5, y: 0.5 });
	});

	it("keeps drag offsets relative to the start so the group stops at the edge", () => {
		const a = createCone(0.9, 0.5);
		const b = createCone(0.7, 0.5);
		const state = run(
			createEditorState(boardWith(a, b)),
			{ type: "beginGesture" },
			{ type: "dragNodes", ids: [a.id, b.id], dx: 0.5, dy: 0 },
			{ type: "dragNodes", ids: [a.id, b.id], dx: 0.05, dy: 0 },
		);
		expect(state.board.nodes[0].x).toBeCloseTo(0.95);
		expect(state.board.nodes[1].x).toBeCloseTo(0.75);
	});

	it("records nothing when the gesture changed nothing", () => {
		const state = run(
			createEditorState(boardWith()),
			{ type: "beginGesture" },
			{ type: "endGesture" },
		);
		expect(state.past).toHaveLength(0);
	});

	it("restores the board when a gesture is cancelled", () => {
		const cone = createCone(0.5, 0.5);
		const state = run(
			createEditorState(boardWith(cone)),
			{ type: "beginGesture" },
			{ type: "dragNodes", ids: [cone.id], dx: 0.2, dy: 0 },
			{ type: "cancelGesture" },
		);
		expect(state.board.nodes[0].x).toBe(0.5);
		expect(state.past).toHaveLength(0);
		expect(state.gestureBase).toBeNull();
	});

	it("turns typing into a single undo step", () => {
		let state = run(
			createEditorState(boardWith()),
			{ type: "beginGesture" },
			{ type: "updateMeta", patch: { title: "R" } },
			{ type: "updateMeta", patch: { title: "Ro" } },
			{ type: "updateMeta", patch: { title: "Rondo" } },
			{ type: "endGesture" },
		);
		expect(state.past).toHaveLength(1);
		state = run(state, { type: "undo" });
		expect(state.board.meta.title).toBe("Test");
	});
});

describe("editing nodes", () => {
	it("keeps a moved group inside the board", () => {
		const a = createCone(0.95, 0.5);
		const b = createCone(0.5, 0.5);
		const state = run(createEditorState(boardWith(a, b)), {
			type: "moveNodes",
			ids: [a.id, b.id],
			dx: 0.2,
			dy: 0,
		});
		expect(state.board.nodes[0].x).toBeCloseTo(1);
		expect(state.board.nodes[1].x).toBeCloseTo(0.55);
	});

	it("only applies patch fields that fit the node kind", () => {
		const player = createPlayer(0.5, 0.5, "home", { number: 7 });
		const cone = createCone(0.2, 0.2);
		const state = run(createEditorState(boardWith(player, cone)), {
			type: "updateNodes",
			ids: [player.id, cone.id],
			patch: { team: "away", color: "#000000" },
		});
		expect(state.board.nodes[0]).toMatchObject({ team: "away" });
		expect(state.board.nodes[0]).not.toHaveProperty("color");
		expect(state.board.nodes[1]).toMatchObject({ color: "#000000" });
		expect(state.board.nodes[1]).not.toHaveProperty("team");
	});

	it("can clear a shirt number", () => {
		const player = createPlayer(0.5, 0.5, "home", { number: 7 });
		const state = run(createEditorState(boardWith(player)), {
			type: "updateNodes",
			ids: [player.id],
			patch: { number: undefined },
		});
		expect((state.board.nodes[0] as PlayerNode).number).toBeUndefined();
	});

	it("does not record an update that changes nothing", () => {
		const player = createPlayer(0.5, 0.5, "home", { number: 7 });
		const state = createEditorState(boardWith(player));
		expect(
			run(state, {
				type: "updateNodes",
				ids: [player.id],
				patch: { number: 7 },
			}),
		).toBe(state);
	});

	it("deletes nodes and their selection", () => {
		const a = createCone(0.1, 0.1);
		const b = createCone(0.2, 0.2);
		const state = run(
			createEditorState(boardWith(a, b)),
			{ type: "select", ids: [a.id, b.id] },
			{ type: "deleteNodes", ids: [a.id] },
		);
		expect(state.board.nodes.map((n) => n.id)).toEqual([b.id]);
		expect(state.selection).toEqual([b.id]);
	});

	it("duplicates nodes with new ids, an offset and fresh shirt numbers", () => {
		const player = createPlayer(0.5, 0.5, "home", { number: 7, label: "RW" });
		const state = run(createEditorState(boardWith(player)), {
			type: "duplicateNodes",
			ids: [player.id],
		});
		const copy = state.board.nodes[1] as PlayerNode;

		expect(copy.id).not.toBe(player.id);
		expect(copy).toMatchObject({ label: "RW", team: "home", number: 2 });
		expect(copy.x).toBeGreaterThan(player.x);
		expect(state.selection).toEqual([copy.id]);
	});

	it("brings nodes to the front and sends them to the back", () => {
		const a = createCone(0.1, 0.1);
		const b = createCone(0.2, 0.2);
		const c = createCone(0.3, 0.3);
		let state = run(createEditorState(boardWith(a, b, c)), {
			type: "reorderNodes",
			ids: [a.id],
			to: "front",
		});
		expect(state.board.nodes.map((n) => n.id)).toEqual([b.id, c.id, a.id]);

		state = run(state, { type: "reorderNodes", ids: [c.id], to: "back" });
		expect(state.board.nodes.map((n) => n.id)).toEqual([c.id, b.id, a.id]);
	});
});

describe("selection", () => {
	it("supports replace, add and toggle", () => {
		const a = createCone(0.1, 0.1);
		const b = createCone(0.2, 0.2);
		let state = run(createEditorState(boardWith(a, b)), {
			type: "select",
			ids: [a.id],
		});
		expect(state.selection).toEqual([a.id]);

		state = run(state, { type: "select", ids: [b.id], mode: "add" });
		expect(state.selection).toEqual([a.id, b.id]);

		state = run(state, { type: "select", ids: [a.id], mode: "toggle" });
		expect(state.selection).toEqual([b.id]);

		state = run(state, { type: "selectAll" }, { type: "clearSelection" });
		expect(state.selection).toEqual([]);
	});

	it("ignores ids that are not on the board", () => {
		const state = run(createEditorState(boardWith()), {
			type: "select",
			ids: ["missing"],
		});
		expect(state.selection).toEqual([]);
	});
});

describe("board documents", () => {
	it("are plain JSON", () => {
		const state = run(
			createEditorState(boardWith()),
			{ type: "place", tool: "home", x: 0.5, y: 0.5 },
			{ type: "place", tool: "cone", x: 0.2, y: 0.2 },
			{ type: "updateNotes", patch: { coachingPoints: ["Scan early"] } },
		);
		expect(JSON.parse(JSON.stringify(state.board))).toEqual(state.board);
	});
});

describe("changing team", () => {
	it("renumbers players whose number is taken in the new team", () => {
		const home7 = createPlayer(0.5, 0.5, "home", { number: 7 });
		const away7 = createPlayer(0.6, 0.5, "away", { number: 7 });
		const away8 = createPlayer(0.7, 0.5, "away", { number: 8 });
		const state = run(createEditorState(boardWith(home7, away7, away8)), {
			type: "updateNodes",
			ids: [home7.id],
			patch: { team: "away" },
		});
		const moved = state.board.nodes[0] as PlayerNode;
		expect(moved.team).toBe("away");
		expect(moved.number).toBe(2);
		expect((state.board.nodes[1] as PlayerNode).number).toBe(7);
	});

	it("keeps the number when it is free in the new team", () => {
		const home7 = createPlayer(0.5, 0.5, "home", { number: 7 });
		const state = run(createEditorState(boardWith(home7)), {
			type: "updateNodes",
			ids: [home7.id],
			patch: { team: "away" },
		});
		expect((state.board.nodes[0] as PlayerNode).number).toBe(7);
	});
});
