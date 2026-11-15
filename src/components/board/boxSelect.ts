import { markerScale } from "../../model/board";
import {
	BALL_RADIUS,
	BOARD_HEIGHT,
	BOARD_WIDTH,
	CONE_SIZE,
	PLAYER_RADIUS,
} from "../../model/pitch";
import { goalSize } from "../../model/sports";
import { Board, BoardNode, Drawing, Point } from "../../model/types";
import { textBox } from "./geometry";

/**
 * How a selection box picks things on the board. Two presets, one for players
 * and equipment and one for lines, zones and text: change them here.
 *
 * Drawings (lines, zones, text):
 * - `half`: half or more of the drawing is in the box
 * - `touch`: any part of it is in the box (a zone counts by its edge, so
 *   boxing players inside a zone doesn't pick the zone too)
 *
 * Markers (players and equipment):
 * - `touch`: any part of the marker is in the box
 * - `centre`: the marker's centre is in the box
 */
export type DrawingBoxMode = "half" | "touch";
export type MarkerBoxMode = "touch" | "centre";

export const BOX_SELECT: { drawings: DrawingBoxMode; markers: MarkerBoxMode } = {
	drawings: "half",
	markers: "touch",
};

export interface Box {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

const SAMPLES = 48;

function quadratic(a: Point, c: Point, b: Point, t: number): Point {
	const u = 1 - t;
	return [
		u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
		u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
	];
}

/** Points spread evenly along a path, so "half" means half its length. */
function resample(path: Point[], count = SAMPLES): Point[] {
	if (path.length < 2) return path;
	const lengths = [0];
	for (let i = 1; i < path.length; i++) {
		const [ax, ay] = path[i - 1];
		const [bx, by] = path[i];
		// Measure in board units so wide and tall boards count the same.
		lengths.push(
			lengths[i - 1] +
				Math.hypot((bx - ax) * BOARD_WIDTH, (by - ay) * BOARD_HEIGHT),
		);
	}
	const total = lengths[lengths.length - 1];
	if (total === 0) return [path[0]];
	const out: Point[] = [];
	let seg = 1;
	for (let i = 0; i < count; i++) {
		const target = (total * i) / (count - 1);
		while (seg < path.length - 1 && lengths[seg] < target) seg++;
		const span = lengths[seg] - lengths[seg - 1] || 1;
		const t = Math.min(1, Math.max(0, (target - lengths[seg - 1]) / span));
		const [ax, ay] = path[seg - 1];
		const [bx, by] = path[seg];
		out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
	}
	return out;
}

/** The outline of a drawing as points along it. */
export function outlinePoints(d: Drawing): Point[] {
	switch (d.kind) {
		case "line": {
			if (!d.control) return resample([d.from, d.to]);
			const curve: Point[] = [];
			for (let i = 0; i <= SAMPLES; i++)
				curve.push(quadratic(d.from, d.control, d.to, i / SAMPLES));
			return resample(curve);
		}
		case "pen":
			return resample(d.points);
		case "zone": {
			if (d.shape === "ellipse") {
				const cx = d.x + d.w / 2;
				const cy = d.y + d.h / 2;
				return Array.from({ length: SAMPLES }, (_, i) => {
					const a = (i / SAMPLES) * Math.PI * 2;
					return [cx + (Math.cos(a) * d.w) / 2, cy + (Math.sin(a) * d.h) / 2];
				});
			}
			const { x, y, w, h } = d;
			return resample([
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h],
				[x, y],
			]);
		}
		case "text": {
			const b = textBox(d);
			const x = b.x / BOARD_WIDTH;
			const y = b.y / BOARD_HEIGHT;
			const w = b.width / BOARD_WIDTH;
			const h = b.height / BOARD_HEIGHT;
			return resample([
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h],
				[x, y],
			]);
		}
	}
}

const inBox = (b: Box) => ([x, y]: Point) =>
	x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;

/**
 * True when the box sits inside a text label without touching its edge. Zones
 * don't count: they're often big areas with players inside, and boxing the
 * players shouldn't pick the zone too.
 */
function boxInsideText(d: Drawing, b: Box): boolean {
	if (d.kind !== "text") return false;
	const t = textBox(d);
	const x = ((b.x1 + b.x2) / 2) * BOARD_WIDTH;
	const y = ((b.y1 + b.y2) / 2) * BOARD_HEIGHT;
	return x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height;
}

/** Does the box pick this drawing? */
export function boxPicksDrawing(
	d: Drawing,
	box: Box,
	mode: DrawingBoxMode = BOX_SELECT.drawings,
): boolean {
	const points = outlinePoints(d);
	const inside = points.filter(inBox(box)).length;
	if (mode === "half") return inside >= points.length / 2;
	return inside > 0 || boxInsideText(d, box);
}

/** How far a marker reaches from its centre, in board units (roughly: a circle around it). */
function markerReach(node: BoardNode, board: Board): number {
	const scale = markerScale(node, board.display);
	switch (node.kind) {
		case "player":
			return PLAYER_RADIUS * scale;
		case "ball":
			return BALL_RADIUS * scale;
		case "cone":
			return (CONE_SIZE / 2) * scale;
		case "goal": {
			const size = goalSize(board.pitch);
			const width = (size?.width ?? 40) * (node.size === "mini" ? 0.5 : 1);
			return width / 2;
		}
		default:
			// Mannequins and poles: about a player's size.
			return PLAYER_RADIUS * 0.8 * scale;
	}
}

/** Does the box pick this marker? */
export function boxPicksMarker(
	node: BoardNode,
	box: Box,
	board: Board,
	mode: MarkerBoxMode = BOX_SELECT.markers,
): boolean {
	if (mode === "centre") return inBox(box)([node.x, node.y]);
	// The nearest point of the box to the marker's centre, measured in board units.
	const cx = node.x * BOARD_WIDTH;
	const cy = node.y * BOARD_HEIGHT;
	const nx = Math.min(Math.max(cx, box.x1 * BOARD_WIDTH), box.x2 * BOARD_WIDTH);
	const ny = Math.min(Math.max(cy, box.y1 * BOARD_HEIGHT), box.y2 * BOARD_HEIGHT);
	return Math.hypot(cx - nx, cy - ny) <= markerReach(node, board);
}
