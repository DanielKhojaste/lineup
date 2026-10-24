import { newId } from "./board";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./pitch";
import { Board, BoardNode, Move, Point, Step } from "./types";

/** Seconds a new step takes to play. */
export const DEFAULT_STEP_DURATION = 1.5;
export const STEP_DURATIONS = [0.5, 1, 1.5, 2, 3, 4] as const;

export function createStep(duration = DEFAULT_STEP_DURATION): Step {
	return { id: newId(), duration, moves: {} };
}

type Pos = { x: number; y: number };

/**
 * Where every marker stands at a step: 0 is the starting position (the
 * board's own nodes), and step n applies the moves of steps 1 to n in turn.
 */
export function positionsAt(board: Board, step: number): Map<string, Pos> {
	const positions = new Map<string, Pos>(
		board.nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
	);
	const last = Math.min(step, board.steps.length);
	for (let i = 0; i < last; i++) {
		for (const [id, move] of Object.entries(board.steps[i].moves)) {
			if (positions.has(id)) positions.set(id, { x: move.x, y: move.y });
		}
	}
	return positions;
}

function withPositions(nodes: BoardNode[], positions: Map<string, Pos>) {
	return nodes.map((n) => {
		const p = positions.get(n.id);
		return p && (p.x !== n.x || p.y !== n.y) ? { ...n, x: p.x, y: p.y } : n;
	});
}

/** The board's markers as they stand at a step. */
export function nodesAtStep(board: Board, step: number): BoardNode[] {
	if (step <= 0 || board.steps.length === 0) return board.nodes;
	return withPositions(board.nodes, positionsAt(board, step));
}

/** The board with its markers moved to where they stand at a step. */
export function boardAtStep(board: Board, step: number): Board {
	const nodes = nodesAtStep(board, step);
	return nodes === board.nodes ? board : { ...board, nodes };
}

/**
 * The route a marker takes during a step (1-based): from where it stood, through
 * its waypoints, to where it ends up. Null when it doesn't move in that step.
 */
export function routeOf(
	board: Board,
	step: number,
	id: string,
): Point[] | null {
	const move = board.steps[step - 1]?.moves[id];
	if (!move) return null;
	const start = positionsAt(board, step - 1).get(id);
	if (!start) return null;
	return [[start.x, start.y], ...(move.via ?? []), [move.x, move.y]];
}

// ---------------------------------------------------------------------------
// Smooth routes. Routes are Catmull-Rom splines through their points, worked
// out in board units so a run looks the same whatever the board's shape.

type Vec = { x: number; y: number };
const toVec = (p: Point): Vec => ({
	x: p[0] * BOARD_WIDTH,
	y: p[1] * BOARD_HEIGHT,
});
const toPoint = (v: Vec): Point => [v.x / BOARD_WIDTH, v.y / BOARD_HEIGHT];

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
	const t2 = t * t;
	const t3 = t2 * t;
	const f = (a: number, b: number, c: number, d: number) =>
		0.5 *
		(2 * b +
			(-a + c) * t +
			(2 * a - 5 * b + 4 * c - d) * t2 +
			(-a + 3 * b - 3 * c + d) * t3);
	return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** A route as a dense polyline in board units, passing through every point. */
export function sampleRoute(route: Point[], step = 4): Vec[] {
	const pts = route.map(toVec);
	if (pts.length < 2) return pts;
	if (pts.length === 2) return pts;
	const out: Vec[] = [pts[0]];
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		const span = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const n = Math.max(2, Math.ceil(span / step));
		for (let k = 1; k <= n; k++) out.push(catmullRom(p0, p1, p2, p3, k / n));
	}
	return out;
}

/** The point a fraction `f` (0–1) of the way along a polyline, by distance. */
function along(line: Vec[], f: number): Vec {
	if (line.length === 1) return line[0];
	const lengths = [0];
	for (let i = 1; i < line.length; i++) {
		lengths.push(
			lengths[i - 1] +
				Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y),
		);
	}
	const total = lengths[lengths.length - 1];
	if (total === 0) return line[0];
	const target = Math.min(Math.max(f, 0), 1) * total;
	let i = 1;
	while (i < lengths.length - 1 && lengths[i] < target) i++;
	const segment = lengths[i] - lengths[i - 1];
	const k = segment === 0 ? 0 : (target - lengths[i - 1]) / segment;
	return {
		x: line[i - 1].x + (line[i].x - line[i - 1].x) * k,
		y: line[i - 1].y + (line[i].y - line[i - 1].y) * k,
	};
}

/** Ease in and out, so markers set off and arrive smoothly. */
export function ease(t: number): number {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Markers part-way through a step (1-based): `t` runs from 0 (start) to 1 (end). */
export function nodesDuringStep(
	board: Board,
	step: number,
	t: number,
): BoardNode[] {
	const before = positionsAt(board, step - 1);
	const moves = board.steps[step - 1]?.moves ?? {};
	const progress = ease(Math.min(Math.max(t, 0), 1));
	const positions = new Map(before);
	for (const [id, move] of Object.entries(moves)) {
		const start = before.get(id);
		if (!start) continue;
		const route: Point[] = [
			[start.x, start.y],
			...(move.via ?? []),
			[move.x, move.y],
		];
		const v = along(sampleRoute(route), progress);
		const [x, y] = toPoint(v);
		positions.set(id, { x, y });
	}
	return withPositions(board.nodes, positions);
}

/** Total playing time of the animation, in seconds. */
export function totalDuration(board: Board): number {
	return board.steps.reduce((sum, s) => sum + s.duration, 0);
}

/**
 * Which step is playing `time` seconds in, and how far through it (0–1).
 * Past the end, it's the last step, finished.
 */
export function stepAtTime(
	board: Board,
	time: number,
): { step: number; t: number } {
	let elapsed = 0;
	for (let i = 0; i < board.steps.length; i++) {
		const d = board.steps[i].duration;
		if (time < elapsed + d) return { step: i + 1, t: (time - elapsed) / d };
		elapsed += d;
	}
	return { step: board.steps.length, t: 1 };
}

/** Seconds from the start of the animation to the start of a step (1-based). */
export function startOfStep(board: Board, step: number): number {
	return board.steps.slice(0, step - 1).reduce((sum, s) => sum + s.duration, 0);
}

/** Drop moves for markers that no longer exist. */
export function pruneSteps(steps: Step[], nodeIds: Set<string>): Step[] {
	let changed = false;
	const next = steps.map((s) => {
		const ids = Object.keys(s.moves);
		if (ids.every((id) => nodeIds.has(id))) return s;
		changed = true;
		const moves: Record<string, Move> = {};
		for (const id of ids) if (nodeIds.has(id)) moves[id] = s.moves[id];
		return { ...s, moves };
	});
	return changed ? next : steps;
}
