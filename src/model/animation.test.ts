import { describe, expect, it } from "vitest";
import {
	createEditorState,
	EditorAction,
	editorReducer,
} from "../state/editor";
import {
	nodesAtStep,
	nodesDuringStep,
	routeOf,
	sampleRoute,
	stepAtTime,
	totalDuration,
} from "./animation";
import { createBall, createBoard, createPlayer } from "./board";
import { Board } from "./types";

function boardWith(...nodes: Board["nodes"]): Board {
	return { ...createBoard("Test"), nodes, drawings: [] };
}

const run = (board: Board, ...actions: EditorAction[]) =>
	actions.reduce(editorReducer, createEditorState(board));

describe("animation", () => {
	const player = createPlayer(0.2, 0.5, "home");
	const ball = createBall(0.25, 0.5);

	it("moves markers on a step without changing the starting position", () => {
		let state = run(boardWith(player, ball), { type: "addStep" });
		expect(state.step).toBe(1);
		state = editorReducer(state, {
			type: "moveItems",
			ids: [player.id],
			dx: 0.3,
			dy: 0,
		});
		expect(state.board.nodes[0].x).toBeCloseTo(0.2);
		expect(state.board.steps[0].moves[player.id].x).toBeCloseTo(0.5);
		expect(nodesAtStep(state.board, 1)[0].x).toBeCloseTo(0.5);
		// The ball didn't move, so it isn't part of the step.
		expect(state.board.steps[0].moves[ball.id]).toBeUndefined();
	});

	it("carries positions on from step to step", () => {
		let state = run(boardWith(player, ball), { type: "addStep" });
		state = editorReducer(state, {
			type: "moveItems",
			ids: [player.id],
			dx: 0.3,
			dy: 0,
		});
		state = editorReducer(state, { type: "addStep" });
		expect(state.step).toBe(2);
		state = editorReducer(state, {
			type: "moveItems",
			ids: [ball.id],
			dx: 0.1,
			dy: 0,
		});
		const at2 = nodesAtStep(state.board, 2);
		expect(at2[0].x).toBeCloseTo(0.5);
		expect(at2[1].x).toBeCloseTo(0.35);
		expect(routeOf(state.board, 2, player.id)).toBeNull();
		expect(routeOf(state.board, 1, player.id)).toEqual([
			[0.2, 0.5],
			[0.5, 0.5],
		]);
	});

	it("dragging on a step is one undo step and keeps the start", () => {
		let state = run(boardWith(player), { type: "addStep" });
		state = editorReducer(state, { type: "beginGesture" });
		for (const dx of [0.05, 0.1, 0.2]) {
			state = editorReducer(state, {
				type: "dragItems",
				ids: [player.id],
				dx,
				dy: 0,
			});
		}
		state = editorReducer(state, { type: "endGesture" });
		expect(state.board.nodes[0].x).toBeCloseTo(0.2);
		expect(state.board.steps[0].moves[player.id].x).toBeCloseTo(0.4);
		state = editorReducer(state, { type: "undo" });
		expect(state.board.steps[0].moves[player.id]).toBeUndefined();
	});

	it("runs through waypoints, easing in and out", () => {
		let state = run(boardWith(player), { type: "addStep" });
		state = editorReducer(state, {
			type: "setMove",
			id: player.id,
			move: { x: 0.6, y: 0.5, via: [[0.4, 0.2]] },
		});
		const board = state.board;
		const start = nodesDuringStep(board, 1, 0)[0];
		const middle = nodesDuringStep(board, 1, 0.5)[0];
		const end = nodesDuringStep(board, 1, 1)[0];
		expect(start).toMatchObject({ x: 0.2, y: 0.5 });
		expect(end.x).toBeCloseTo(0.6);
		expect(end.y).toBeCloseTo(0.5);
		// Halfway along a symmetric route is its top, near the waypoint.
		expect(middle.y).toBeLessThan(0.3);
		const route = sampleRoute(routeOf(board, 1, player.id)!);
		expect(route.length).toBeGreaterThan(10);
	});

	it("finds the step playing at a given time", () => {
		let state = run(
			boardWith(player),
			{ type: "addStep" },
			{ type: "addStep" },
		);
		state = editorReducer(state, {
			type: "setStepDuration",
			step: 1,
			duration: 2,
		});
		expect(totalDuration(state.board)).toBeCloseTo(3.5);
		expect(stepAtTime(state.board, 1)).toEqual({ step: 1, t: 0.5 });
		expect(stepAtTime(state.board, 2.75)).toEqual({ step: 2, t: 0.5 });
		expect(stepAtTime(state.board, 99)).toEqual({ step: 2, t: 1 });
	});

	it("inserts steps after the current one and deletes them", () => {
		let state = run(
			boardWith(player),
			{ type: "addStep" },
			{ type: "addStep" },
		);
		const [first, second] = state.board.steps;
		state = editorReducer(state, { type: "setStep", step: 1 });
		state = editorReducer(state, { type: "addStep" });
		expect(state.step).toBe(2);
		expect(state.board.steps[0]).toBe(first);
		expect(state.board.steps[2]).toBe(second);
		state = editorReducer(state, { type: "deleteStep", step: 3 });
		expect(state.board.steps).toHaveLength(2);
		expect(state.step).toBe(2);
	});

	it("forgets moves of deleted markers, and keeps the step in range on undo", () => {
		let state = run(boardWith(player, ball), { type: "addStep" });
		state = editorReducer(state, {
			type: "moveItems",
			ids: [player.id, ball.id],
			dx: 0.1,
			dy: 0,
		});
		state = editorReducer(state, { type: "deleteItems", ids: [ball.id] });
		expect(Object.keys(state.board.steps[0].moves)).toEqual([player.id]);
		state = editorReducer(state, { type: "undo" });
		state = editorReducer(state, { type: "undo" });
		state = editorReducer(state, { type: "undo" });
		expect(state.board.steps).toHaveLength(0);
		expect(state.step).toBe(0);
	});
});
