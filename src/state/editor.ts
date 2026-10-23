import {
	clamp01,
	createBall,
	createBoard,
	createCone,
	createGoal,
	createMannequin,
	createPlayer,
	createPole,
	newId,
	nextShirtNumber,
} from "../model/board";
import {
	DEFAULT_TOOL_STYLES,
	DrawTool,
	drawingPoints,
	isDrawing,
	offsetDrawing,
	ToolStyles,
} from "../model/drawings";
import {
	ArrowHeads,
	Board,
	BoardDisplay,
	BoardItem,
	BoardMeta,
	BoardNode,
	DrillNotes,
	Drawing,
	LineStroke,
	PlayerNode,
	Point,
	StrokeWidth,
	TeamId,
	TeamStyle,
	TextSize,
} from "../model/types";

export type PlaceTool =
	| "home"
	| "away"
	| "neutral"
	| "keeper"
	| "cone"
	| "ball"
	| "goal"
	| "mannequin"
	| "pole";
export type Tool = "select" | PlaceTool | DrawTool;

export const HISTORY_LIMIT = 200;

/** How far (in normalised board units) a duplicate is offset from its original. */
export const DUPLICATE_OFFSET = { x: 0.02, y: 0.03 };

export interface EditorState {
	past: Board[];
	board: Board;
	future: Board[];
	selection: string[];
	tool: Tool;
	/** Style given to new drawings. Not part of the board, so not undoable. */
	toolStyles: ToolStyles;
	/**
	 * Snapshot taken when a gesture starts (dragging, drawing, editing a text
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
	size?: "full" | "mini";
	rotation?: number;
}

/** Style changes that can be applied to several drawings at once. */
export interface DrawingPatch {
	color?: string;
	stroke?: LineStroke;
	heads?: ArrowHeads;
	width?: StrokeWidth;
	shape?: "rect" | "ellipse";
	dashed?: boolean;
	highlighter?: boolean;
	size?: TextSize;
	background?: boolean;
	/** Remove a line's bend. */
	straighten?: boolean;
}

export type EditorAction =
	| { type: "setTool"; tool: Tool }
	| {
			type: "setToolStyle";
			key: keyof ToolStyles;
			patch: Partial<ToolStyles[keyof ToolStyles]>;
	  }
	| { type: "select"; ids: string[]; mode?: "replace" | "add" | "toggle" }
	| { type: "selectAll" }
	| { type: "clearSelection" }
	| { type: "place"; tool: PlaceTool; x: number; y: number }
	| { type: "addNodes"; nodes: BoardNode[] }
	| { type: "addDrawing"; drawing: Drawing; select?: boolean }
	| { type: "moveItems"; ids: string[]; dx: number; dy: number }
	| { type: "dragItems"; ids: string[]; dx: number; dy: number }
	| { type: "updateNodes"; ids: string[]; patch: NodePatch }
	| { type: "rotateNodes"; ids: string[]; by: number }
	| { type: "updateDrawing"; id: string; changes: Partial<Drawing> }
	| { type: "updateDrawings"; ids: string[]; patch: DrawingPatch }
	| { type: "deleteItems"; ids: string[] }
	| { type: "duplicateItems"; ids: string[] }
	| { type: "reorderItems"; ids: string[]; to: "front" | "back" }
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
		toolStyles: structuredClone(DEFAULT_TOOL_STYLES),
		gestureBase: null,
	};
}

function has<T extends object>(patch: T, key: keyof T): boolean {
	return Object.prototype.hasOwnProperty.call(patch, key);
}

const PLAYER_KEYS = ["team", "keeper", "number", "label", "name"] as const;

function applyNodePatch(node: BoardNode, patch: NodePatch): BoardNode {
	let next: BoardNode = node;
	const set = (values: object) => {
		next = { ...next, ...values } as BoardNode;
	};

	if (has(patch, "x")) set({ x: clamp01(patch.x!) });
	if (has(patch, "y")) set({ y: clamp01(patch.y!) });

	if (node.kind === "player") {
		for (const key of PLAYER_KEYS) {
			if (has(patch, key)) set({ [key]: patch[key] } as Partial<PlayerNode>);
		}
	}
	if (
		(node.kind === "cone" ||
			node.kind === "mannequin" ||
			node.kind === "pole") &&
		has(patch, "color")
	) {
		set({ color: patch.color });
	}
	if (node.kind === "goal" && has(patch, "size")) set({ size: patch.size });
	if (
		(node.kind === "goal" || node.kind === "mannequin") &&
		has(patch, "rotation")
	) {
		set({ rotation: normalizeAngle(patch.rotation!) });
	}

	return next;
}

const DRAWING_STYLE_KEYS: Record<Drawing["kind"], (keyof DrawingPatch)[]> = {
	line: ["color", "stroke", "heads", "width"],
	zone: ["color", "shape", "dashed"],
	pen: ["color", "width", "highlighter"],
	text: ["color", "size", "background"],
};

function applyDrawingPatch(drawing: Drawing, patch: DrawingPatch): Drawing {
	let next: Drawing = drawing;
	for (const key of DRAWING_STYLE_KEYS[drawing.kind]) {
		if (has(patch, key)) next = { ...next, [key]: patch[key] } as Drawing;
	}
	if (patch.straighten && next.kind === "line" && next.control) {
		const { control: _removed, ...rest } = next;
		next = rest;
	}
	return next;
}

export function normalizeAngle(degrees: number): number {
	return ((Math.round(degrees) % 360) + 360) % 360;
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

export function allItems(board: Board): BoardItem[] {
	return [...board.drawings, ...board.nodes];
}

function pruneSelection(selection: string[], board: Board): string[] {
	const ids = new Set(allItems(board).map((item) => item.id));
	const next = selection.filter((id) => ids.has(id));
	return next.length === selection.length ? selection : next;
}

function itemPoints(item: BoardItem): Point[] {
	return isDrawing(item) ? drawingPoints(item) : [[item.x, item.y]];
}

/**
 * Offset the given items of `source`, keeping the whole group inside the
 * board. Returns null when nothing moves.
 */
function offsetItems(
	source: Board,
	ids: string[],
	dx: number,
	dy: number,
): Board | null {
	const targets = new Set(ids);
	const moving = allItems(source).filter((item) => targets.has(item.id));
	if (moving.length === 0) return null;

	const points = moving.flatMap(itemPoints);
	const minX = Math.min(...points.map((p) => p[0]));
	const maxX = Math.max(...points.map((p) => p[0]));
	const minY = Math.min(...points.map((p) => p[1]));
	const maxY = Math.max(...points.map((p) => p[1]));
	const cdx = Math.min(Math.max(0, 1 - maxX), Math.max(Math.min(0, -minX), dx));
	const cdy = Math.min(Math.max(0, 1 - maxY), Math.max(Math.min(0, -minY), dy));
	if (cdx === 0 && cdy === 0) return null;

	return {
		...source,
		nodes: source.nodes.map((n) =>
			targets.has(n.id) ? { ...n, x: n.x + cdx, y: n.y + cdy } : n,
		),
		drawings: source.drawings.map((d) =>
			targets.has(d.id) ? offsetDrawing(d, cdx, cdy) : d,
		),
	};
}

/**
 * After players change team, give any whose shirt number is already taken in
 * their new team the next free number. Mutates `nodes` (a fresh array).
 */
function renumberClashes(nodes: BoardNode[], changedIds: Set<string>) {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (
			node.kind !== "player" ||
			!changedIds.has(node.id) ||
			node.number === undefined
		)
			continue;
		const clash = nodes.some(
			(other) =>
				other !== node &&
				other.kind === "player" &&
				other.team === node.team &&
				other.number === node.number,
		);
		if (clash) {
			const others = nodes.filter((n) => n !== node);
			nodes[i] = {
				...node,
				number: nextShirtNumber(others, node.team, node.keeper),
			};
		}
	}
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
		case "goal":
			return createGoal(x, y);
		case "mannequin":
			return createMannequin(x, y);
		case "pole":
			return createPole(x, y);
	}
}

function reorder<T extends { id: string }>(
	list: T[],
	targets: Set<string>,
	to: "front" | "back",
): T[] {
	const picked = list.filter((item) => targets.has(item.id));
	if (picked.length === 0) return list;
	const rest = list.filter((item) => !targets.has(item.id));
	const next = to === "front" ? [...rest, ...picked] : [...picked, ...rest];
	return next.every((item, i) => item === list[i]) ? list : next;
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

		case "setToolStyle":
			return {
				...state,
				toolStyles: {
					...state.toolStyles,
					[action.key]: { ...state.toolStyles[action.key], ...action.patch },
				},
			};

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
			return { ...state, selection: allItems(board).map((item) => item.id) };

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
				...commit(state, { ...board, nodes: [...board.nodes, node] }),
				selection: [node.id],
			};
		}

		case "addNodes": {
			if (action.nodes.length === 0) return state;
			const next = commit(state, {
				...board,
				nodes: [...board.nodes, ...action.nodes],
			});
			return { ...next, selection: action.nodes.map((n) => n.id) };
		}

		case "addDrawing": {
			const next = commit(state, {
				...board,
				drawings: [...board.drawings, action.drawing],
			});
			return action.select === false
				? next
				: { ...next, selection: [action.drawing.id] };
		}

		case "moveItems": {
			const moved = offsetItems(board, action.ids, action.dx, action.dy);
			return moved ? commit(state, moved) : state;
		}

		case "dragItems": {
			// Offsets are relative to where the items were when the gesture began,
			// so they stay under the pointer even after hitting an edge.
			const base = state.gestureBase ?? board;
			const moved = offsetItems(base, action.ids, action.dx, action.dy) ?? base;
			const targets = new Set(action.ids);
			const nodeById = new Map(moved.nodes.map((n) => [n.id, n]));
			const drawingById = new Map(moved.drawings.map((d) => [d.id, d]));
			const nodes = board.nodes.map((n) =>
				targets.has(n.id) ? nodeById.get(n.id) ?? n : n,
			);
			const drawings = board.drawings.map((d) =>
				targets.has(d.id) ? drawingById.get(d.id) ?? d : d,
			);
			const changed =
				nodes.some((n, i) => n !== board.nodes[i]) ||
				drawings.some((d, i) => d !== board.drawings[i]);
			return changed ? commit(state, { ...board, nodes, drawings }) : state;
		}

		case "updateNodes": {
			const targets = new Set(action.ids);
			let changed = false;
			const nodes = board.nodes.map((n) => {
				if (!targets.has(n.id)) return n;
				const next = applyNodePatch(n, action.patch);
				if (JSON.stringify(next) !== JSON.stringify(n)) {
					changed = true;
					return next;
				}
				return n;
			});
			if (!changed) return state;
			if (action.patch.team !== undefined) renumberClashes(nodes, targets);
			return commit(state, { ...board, nodes });
		}

		case "rotateNodes": {
			const targets = new Set(action.ids);
			let changed = false;
			const nodes = board.nodes.map((n) => {
				if (!targets.has(n.id) || (n.kind !== "goal" && n.kind !== "mannequin"))
					return n;
				changed = true;
				return { ...n, rotation: normalizeAngle(n.rotation + action.by) };
			});
			return changed ? commit(state, { ...board, nodes }) : state;
		}

		case "updateDrawing": {
			const index = board.drawings.findIndex((d) => d.id === action.id);
			if (index === -1) return state;
			const current = board.drawings[index];
			const next = {
				...current,
				...action.changes,
				id: current.id,
				kind: current.kind,
			} as Drawing;
			const drawings = [...board.drawings];
			drawings[index] = next;
			return commit(state, { ...board, drawings });
		}

		case "updateDrawings": {
			const targets = new Set(action.ids);
			let changed = false;
			const drawings = board.drawings.map((d) => {
				if (!targets.has(d.id)) return d;
				const next = applyDrawingPatch(d, action.patch);
				if (next !== d && JSON.stringify(next) !== JSON.stringify(d)) {
					changed = true;
					return next;
				}
				return d;
			});
			return changed ? commit(state, { ...board, drawings }) : state;
		}

		case "deleteItems": {
			const targets = new Set(action.ids);
			const nodes = board.nodes.filter((n) => !targets.has(n.id));
			const drawings = board.drawings.filter((d) => !targets.has(d.id));
			if (
				nodes.length === board.nodes.length &&
				drawings.length === board.drawings.length
			)
				return state;
			const next = commit(state, { ...board, nodes, drawings });
			return { ...next, selection: pruneSelection(next.selection, next.board) };
		}

		case "duplicateItems": {
			const targets = new Set(action.ids);
			const nodeCopies = board.nodes
				.filter((n) => targets.has(n.id))
				.map((n): BoardNode => ({ ...n, id: newId() }));
			const drawingCopies = board.drawings
				.filter((d) => targets.has(d.id))
				.map((d): Drawing => ({ ...d, id: newId() }));
			if (nodeCopies.length === 0 && drawingCopies.length === 0) return state;

			const copies: Board = {
				...board,
				nodes: nodeCopies,
				drawings: drawingCopies,
			};
			const copyIds = [...nodeCopies, ...drawingCopies].map((c) => c.id);
			const shifted =
				offsetItems(copies, copyIds, DUPLICATE_OFFSET.x, DUPLICATE_OFFSET.y) ??
				copies;

			// Give duplicated players fresh shirt numbers so two markers never share one.
			const all = [...board.nodes];
			const newNodes = shifted.nodes.map((copy) => {
				const numbered =
					copy.kind === "player" && copy.number !== undefined
						? { ...copy, number: nextShirtNumber(all, copy.team, copy.keeper) }
						: copy;
				all.push(numbered);
				return numbered;
			});

			const next = commit(state, {
				...board,
				nodes: [...board.nodes, ...newNodes],
				drawings: [...board.drawings, ...shifted.drawings],
			});
			return { ...next, selection: copyIds };
		}

		case "reorderItems": {
			const targets = new Set(action.ids);
			const nodes = reorder(board.nodes, targets, action.to);
			const drawings = reorder(board.drawings, targets, action.to);
			if (nodes === board.nodes && drawings === board.drawings) return state;
			return commit(state, { ...board, nodes, drawings });
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
			// A gesture that ended where it started (e.g. a text box opened and closed
			// empty) records nothing.
			if (base === board || JSON.stringify(base) === JSON.stringify(board)) {
				return { ...state, board: base, gestureBase: null };
			}
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
			return {
				...createEditorState(action.board),
				toolStyles: state.toolStyles,
			};
	}
}

export function selectedNodes(state: EditorState): BoardNode[] {
	const ids = new Set(state.selection);
	return state.board.nodes.filter((n) => ids.has(n.id));
}

export function selectedDrawings(state: EditorState): Drawing[] {
	const ids = new Set(state.selection);
	return state.board.drawings.filter((d) => ids.has(d.id));
}
