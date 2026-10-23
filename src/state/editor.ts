import {
	clamp01,
	createBall,
	createBoard,
	createCone,
	createPlayer,
	newId,
	nextShirtNumber,
} from "../model/board";
import {
	Board,
	BoardDisplay,
	BoardMeta,
	BoardNode,
	DrillNotes,
	PlayerNode,
	TeamId,
	TeamStyle,
} from "../model/types";

export type PlaceTool =
	| "home"
	| "away"
	| "neutral"
	| "keeper"
	| "cone"
	| "ball";
export type Tool = "select" | PlaceTool;

export const HISTORY_LIMIT = 200;

/** How far (in normalised board units) a duplicate is offset from its original. */
export const DUPLICATE_OFFSET = { x: 0.02, y: 0.03 };

export interface EditorState {
	past: Board[];
	board: Board;
	future: Board[];
	selection: string[];
	tool: Tool;
	/**
	 * Snapshot taken when a gesture starts (dragging markers, editing a text
	 * field). Changes made during a gesture become a single undo step.
	 */
	gestureBase: Board | null;
}

export interface NodePatch {
	x?: number;
	y?: number;
	team?: TeamId;
	keeper?: boolean;
	number?: number;
	label?: string;
	name?: string;
	color?: string;
}

export type EditorAction =
	| { type: "setTool"; tool: Tool }
	| { type: "select"; ids: string[]; mode?: "replace" | "add" | "toggle" }
	| { type: "selectAll" }
	| { type: "clearSelection" }
	| { type: "place"; tool: PlaceTool; x: number; y: number }
	| { type: "addNodes"; nodes: BoardNode[] }
	| { type: "moveNodes"; ids: string[]; dx: number; dy: number }
	| { type: "dragNodes"; ids: string[]; dx: number; dy: number }
	| { type: "updateNodes"; ids: string[]; patch: NodePatch }
	| { type: "deleteNodes"; ids: string[] }
	| { type: "duplicateNodes"; ids: string[] }
	| { type: "reorderNodes"; ids: string[]; to: "front" | "back" }
	| { type: "updateMeta"; patch: Partial<BoardMeta> }
	| { type: "updateNotes"; patch: Partial<DrillNotes> }
	| { type: "updateTeam"; team: TeamId; patch: Partial<TeamStyle> }
	| { type: "updateDisplay"; patch: Partial<BoardDisplay> }
	| { type: "beginGesture" }
	| { type: "endGesture" }
	| { type: "cancelGesture" }
	| { type: "undo" }
	| { type: "redo" }
	| { type: "loadBoard"; board: Board };

export function createEditorState(board: Board = createBoard()): EditorState {
	return {
		past: [],
		board,
		future: [],
		selection: [],
		tool: "select",
		gestureBase: null,
	};
}

const PLAYER_KEYS = ["team", "keeper", "number", "label", "name"] as const;

function has<K extends keyof NodePatch>(patch: NodePatch, key: K): boolean {
	return Object.prototype.hasOwnProperty.call(patch, key);
}

function applyPatch(node: BoardNode, patch: NodePatch): BoardNode {
	let next: BoardNode = node;
	const set = (values: Partial<BoardNode>) => {
		next = { ...next, ...values } as BoardNode;
	};

	if (has(patch, "x")) set({ x: clamp01(patch.x!) });
	if (has(patch, "y")) set({ y: clamp01(patch.y!) });

	if (node.kind === "player") {
		for (const key of PLAYER_KEYS) {
			if (has(patch, key)) set({ [key]: patch[key] } as Partial<PlayerNode>);
		}
	}
	if (node.kind === "cone" && has(patch, "color")) set({ color: patch.color });

	return next;
}

/** Replace the board. Outside a gesture this records an undo step. */
function commit(state: EditorState, board: Board): EditorState {
	if (board === state.board) return state;
	if (state.gestureBase) return { ...state, board };

	return {
		...state,
		past: [...state.past, state.board].slice(-HISTORY_LIMIT),
		board,
		future: [],
	};
}

function withNodes(board: Board, nodes: BoardNode[]): Board {
	return { ...board, nodes };
}

function pruneSelection(selection: string[], board: Board): string[] {
	const ids = new Set(board.nodes.map((n) => n.id));
	const next = selection.filter((id) => ids.has(id));
	return next.length === selection.length ? selection : next;
}

/** Offset a group of nodes, keeping the whole group inside the board. */
function offsetNodes(
	nodes: BoardNode[],
	ids: string[],
	dx: number,
	dy: number,
): BoardNode[] {
	const targets = new Set(ids);
	const moving = nodes.filter((n) => targets.has(n.id));
	if (moving.length === 0) return nodes;

	const minX = Math.min(...moving.map((n) => n.x));
	const maxX = Math.max(...moving.map((n) => n.x));
	const minY = Math.min(...moving.map((n) => n.y));
	const maxY = Math.max(...moving.map((n) => n.y));
	const cdx = Math.min(1 - maxX, Math.max(-minX, dx));
	const cdy = Math.min(1 - maxY, Math.max(-minY, dy));
	if (cdx === 0 && cdy === 0) return nodes;

	return nodes.map((n) =>
		targets.has(n.id) ? { ...n, x: n.x + cdx, y: n.y + cdy } : n,
	);
}

function createForTool(
	tool: PlaceTool,
	x: number,
	y: number,
	nodes: BoardNode[],
): BoardNode {
	switch (tool) {
		case "home":
		case "away":
		case "neutral":
			return createPlayer(x, y, tool, {
				number: tool === "neutral" ? undefined : nextShirtNumber(nodes, tool),
			});
		case "keeper":
			return createPlayer(x, y, "home", {
				keeper: true,
				number: nextShirtNumber(nodes, "home", true),
			});
		case "cone":
			return createCone(x, y);
		case "ball":
			return createBall(x, y);
	}
}

export function editorReducer(
	state: EditorState,
	action: EditorAction,
): EditorState {
	const { board } = state;

	switch (action.type) {
		case "setTool":
			return state.tool === action.tool
				? state
				: { ...state, tool: action.tool };

		case "select": {
			const mode = action.mode ?? "replace";
			let selection: string[];
			if (mode === "replace") selection = action.ids;
			else if (mode === "add")
				selection = [...new Set([...state.selection, ...action.ids])];
			else {
				const current = new Set(state.selection);
				for (const id of action.ids) {
					if (current.has(id)) current.delete(id);
					else current.add(id);
				}
				selection = [...current];
			}
			return { ...state, selection: pruneSelection(selection, board) };
		}

		case "selectAll":
			return { ...state, selection: board.nodes.map((n) => n.id) };

		case "clearSelection":
			return state.selection.length === 0 ? state : { ...state, selection: [] };

		case "place": {
			const node = createForTool(
				action.tool,
				clamp01(action.x),
				clamp01(action.y),
				board.nodes,
			);
			return {
				...commit(state, withNodes(board, [...board.nodes, node])),
				selection: [node.id],
			};
		}

		case "addNodes": {
			if (action.nodes.length === 0) return state;
			const next = commit(
				state,
				withNodes(board, [...board.nodes, ...action.nodes]),
			);
			return { ...next, selection: action.nodes.map((n) => n.id) };
		}

		case "moveNodes": {
			const nodes = offsetNodes(board.nodes, action.ids, action.dx, action.dy);
			return nodes === board.nodes
				? state
				: commit(state, withNodes(board, nodes));
		}

		case "dragNodes": {
			// Offsets are relative to where the nodes were when the gesture began,
			// so the markers stay under the pointer even after hitting an edge.
			const base = state.gestureBase ?? board;
			const moved = offsetNodes(base.nodes, action.ids, action.dx, action.dy);
			const byId = new Map(moved.map((n) => [n.id, n]));
			const targets = new Set(action.ids);
			const nodes = board.nodes.map((n) => {
				if (!targets.has(n.id)) return n;
				const m = byId.get(n.id);
				return m && (m.x !== n.x || m.y !== n.y) ? { ...n, x: m.x, y: m.y } : n;
			});
			const changed = nodes.some((n, i) => n !== board.nodes[i]);
			return changed ? commit(state, withNodes(board, nodes)) : state;
		}

		case "updateNodes": {
			const targets = new Set(action.ids);
			let changed = false;
			const nodes = board.nodes.map((n) => {
				if (!targets.has(n.id)) return n;
				const next = applyPatch(n, action.patch);
				if (JSON.stringify(next) !== JSON.stringify(n)) {
					changed = true;
					return next;
				}
				return n;
			});
			return changed ? commit(state, withNodes(board, nodes)) : state;
		}

		case "deleteNodes": {
			const targets = new Set(action.ids);
			const nodes = board.nodes.filter((n) => !targets.has(n.id));
			if (nodes.length === board.nodes.length) return state;
			const next = commit(state, withNodes(board, nodes));
			return { ...next, selection: pruneSelection(next.selection, next.board) };
		}

		case "duplicateNodes": {
			const targets = new Set(action.ids);
			const originals = board.nodes.filter((n) => targets.has(n.id));
			if (originals.length === 0) return state;

			const copies = originals.map((n): BoardNode => ({ ...n, id: newId() }));
			const shifted = offsetNodes(
				copies,
				copies.map((c) => c.id),
				DUPLICATE_OFFSET.x,
				DUPLICATE_OFFSET.y,
			);

			// Give duplicated players fresh shirt numbers so two markers never share one.
			const all = [...board.nodes];
			for (let i = 0; i < shifted.length; i++) {
				const copy = shifted[i];
				if (copy.kind === "player" && copy.number !== undefined) {
					shifted[i] = {
						...copy,
						number: nextShirtNumber(all, copy.team, copy.keeper),
					};
				}
				all.push(shifted[i]);
			}

			const next = commit(
				state,
				withNodes(board, [...board.nodes, ...shifted]),
			);
			return { ...next, selection: shifted.map((n) => n.id) };
		}

		case "reorderNodes": {
			const targets = new Set(action.ids);
			const picked = board.nodes.filter((n) => targets.has(n.id));
			if (picked.length === 0) return state;
			const rest = board.nodes.filter((n) => !targets.has(n.id));
			const nodes =
				action.to === "front" ? [...rest, ...picked] : [...picked, ...rest];
			const same = nodes.every((n, i) => n === board.nodes[i]);
			return same ? state : commit(state, withNodes(board, nodes));
		}

		case "updateMeta":
			return commit(state, {
				...board,
				meta: { ...board.meta, ...action.patch },
			});

		case "updateNotes":
			return commit(state, {
				...board,
				notes: { ...board.notes, ...action.patch },
			});

		case "updateTeam":
			return commit(state, {
				...board,
				teams: {
					...board.teams,
					[action.team]: { ...board.teams[action.team], ...action.patch },
				},
			});

		case "updateDisplay":
			return commit(state, {
				...board,
				display: { ...board.display, ...action.patch },
			});

		case "beginGesture":
			return state.gestureBase ? state : { ...state, gestureBase: board };

		case "endGesture": {
			const base = state.gestureBase;
			if (!base) return state;
			if (base === board) return { ...state, gestureBase: null };
			return {
				...state,
				gestureBase: null,
				past: [...state.past, base].slice(-HISTORY_LIMIT),
				future: [],
			};
		}

		case "cancelGesture": {
			const base = state.gestureBase;
			if (!base) return state;
			return {
				...state,
				board: base,
				gestureBase: null,
				selection: pruneSelection(state.selection, base),
			};
		}

		case "undo": {
			if (state.gestureBase || state.past.length === 0) return state;
			const previous = state.past[state.past.length - 1];
			return {
				...state,
				past: state.past.slice(0, -1),
				board: previous,
				future: [board, ...state.future],
				selection: pruneSelection(state.selection, previous),
			};
		}

		case "redo": {
			if (state.gestureBase || state.future.length === 0) return state;
			const [next, ...future] = state.future;
			return {
				...state,
				past: [...state.past, board],
				board: next,
				future,
				selection: pruneSelection(state.selection, next),
			};
		}

		case "loadBoard":
			return createEditorState(action.board);
	}
}

export function selectedNodes(state: EditorState): BoardNode[] {
	const ids = new Set(state.selection);
	return state.board.nodes.filter((n) => ids.has(n.id));
}
