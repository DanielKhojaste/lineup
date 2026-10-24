import {
	HIGHLIGHTER_WIDTH,
	STROKE_WIDTHS,
	TEXT_SIZES,
} from "../../model/drawings";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";
import { LineDrawing, PenDrawing, Point, TextDrawing } from "../../model/types";

/** A point in board units (10 per metre). */
export interface Vec {
	x: number;
	y: number;
}

export const toUnits = (p: Point): Vec => ({
	x: p[0] * BOARD_WIDTH,
	y: p[1] * BOARD_HEIGHT,
});
export const toPoint = (v: Vec): Point => [
	v.x / BOARD_WIDTH,
	v.y / BOARD_HEIGHT,
];

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const length = (a: Vec): number => Math.hypot(a.x, a.y);
const unit = (a: Vec): Vec => {
	const l = length(a);
	return l === 0 ? { x: 1, y: 0 } : scale(a, 1 / l);
};
const perp = (a: Vec): Vec => ({ x: -a.y, y: a.x });
const fmt = (n: number) => Math.round(n * 10) / 10;

function quadratic(f: Vec, c: Vec, t: Vec, s: number): Vec {
	const u = 1 - s;
	return {
		x: u * u * f.x + 2 * u * s * c.x + s * s * t.x,
		y: u * u * f.y + 2 * u * s * c.y + s * s * t.y,
	};
}

/** The point halfway along a line (on the curve, not the control point). */
export function lineMidpoint(d: LineDrawing): Vec {
	const f = toUnits(d.from);
	const t = toUnits(d.to);
	if (!d.control) return scale(add(f, t), 0.5);
	return quadratic(f, toUnits(d.control), t, 0.5);
}

/** The control point that makes a quadratic curve pass through `mid` halfway along. */
export function controlFromMidpoint(from: Point, to: Point, mid: Vec): Point {
	const f = toUnits(from);
	const t = toUnits(to);
	return toPoint(sub(scale(mid, 2), scale(add(f, t), 0.5)));
}

/** Sample a straight or curved line into a polyline, roughly every `step` units. */
export function samplePolyline(d: LineDrawing, step = 3): Vec[] {
	const f = toUnits(d.from);
	const t = toUnits(d.to);
	if (!d.control) return [f, t];
	const c = toUnits(d.control);
	const approx = length(sub(c, f)) + length(sub(t, c));
	const n = Math.max(8, Math.ceil(approx / step));
	return Array.from({ length: n + 1 }, (_, i) => quadratic(f, c, t, i / n));
}

function polylineLength(points: Vec[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++)
		total += length(sub(points[i], points[i - 1]));
	return total;
}

/** Remove `amount` units from the start of a polyline. */
function trimStart(points: Vec[], amount: number): Vec[] {
	let remaining = amount;
	for (let i = 1; i < points.length; i++) {
		const seg = length(sub(points[i], points[i - 1]));
		if (seg >= remaining) {
			const cut = add(
				points[i - 1],
				scale(unit(sub(points[i], points[i - 1])), remaining),
			);
			return [cut, ...points.slice(i)];
		}
		remaining -= seg;
	}
	return [points[points.length - 1]];
}

const trimEnd = (points: Vec[], amount: number) =>
	trimStart([...points].reverse(), amount).reverse();

/** Direction the line travels at its end (or, reversed, at its start). */
function endDirection(points: Vec[], atStart: boolean): Vec {
	const pts = atStart ? [...points].reverse() : points;
	const tip = pts[pts.length - 1];
	// Look back a little way so the arrowhead follows the curve, not one tiny segment.
	for (let i = pts.length - 2; i >= 0; i--) {
		if (length(sub(tip, pts[i])) > 6 || i === 0) return unit(sub(tip, pts[i]));
	}
	return { x: 1, y: 0 };
}

function arrowHead(tip: Vec, direction: Vec, size: number): string {
	const back = sub(tip, scale(direction, size));
	const side = scale(perp(direction), size * 0.55);
	const a = add(back, side);
	const b = sub(back, side);
	return `M${fmt(tip.x)} ${fmt(tip.y)}L${fmt(a.x)} ${fmt(a.y)}L${fmt(
		b.x,
	)} ${fmt(b.y)}Z`;
}

function polylinePath(points: Vec[]): string {
	return points
		.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`)
		.join("");
}

/** Resample evenly and push points sideways along a sine wave (a dribble). */
function wave(points: Vec[], amplitude: number, wavelength: number): Vec[] {
	const total = polylineLength(points);
	if (total < 1) return points;
	const step = 2;
	const out: Vec[] = [];
	let segIndex = 1;
	let segStart = 0;
	for (let s = 0; s <= total; s += step) {
		while (
			segIndex < points.length - 1 &&
			segStart + length(sub(points[segIndex], points[segIndex - 1])) < s
		) {
			segStart += length(sub(points[segIndex], points[segIndex - 1]));
			segIndex++;
		}
		const a = points[segIndex - 1];
		const b = points[segIndex];
		const segLen = length(sub(b, a)) || 1;
		const along = add(
			a,
			scale(sub(b, a), Math.min(1, (s - segStart) / segLen)),
		);
		// Fade the wave in and out so the line meets its ends cleanly.
		const taper = Math.min(
			1,
			s / (wavelength / 2),
			(total - s) / (wavelength / 2),
		);
		const offset = amplitude * taper * Math.sin((2 * Math.PI * s) / wavelength);
		out.push(add(along, scale(perp(unit(sub(b, a))), offset)));
	}
	out.push(points[points.length - 1]);
	return out;
}

export interface LineGeometry {
	/** The stroked body of the line. */
	path: string;
	/** Filled arrowheads. */
	heads: string[];
	strokeWidth: number;
	dash?: string;
	/** A plain version of the line, used for a wide invisible hit area. */
	hitPath: string;
}

export function lineGeometry(d: LineDrawing): LineGeometry {
	const strokeWidth = STROKE_WIDTHS[d.width];
	const headSize = 9 + strokeWidth * 2.6;
	let points = samplePolyline(d);
	const total = polylineLength(points);
	const heads: string[] = [];
	const hitPath = polylinePath(points);

	// Leave room for arrowheads so the stroke doesn't poke through their tips.
	const showEnd = d.heads !== "none" && total > headSize;
	const showStart = d.heads === "both" && total > headSize * 2;
	if (showEnd) {
		heads.push(
			arrowHead(
				points[points.length - 1],
				endDirection(points, false),
				headSize,
			),
		);
		points = trimEnd(points, headSize * 0.8);
	}
	if (showStart) {
		heads.push(arrowHead(points[0], endDirection(points, true), headSize));
		points = trimStart(points, headSize * 0.8);
	}

	if (d.stroke === "wavy") {
		points = wave(points, 4 + strokeWidth, 20 + strokeWidth * 2);
	}

	return {
		path: polylinePath(points),
		heads,
		strokeWidth,
		dash:
			d.stroke === "dashed"
				? `${fmt(strokeWidth * 3 + 4)} ${fmt(strokeWidth * 2 + 5)}`
				: undefined,
		hitPath,
	};
}

export function penStrokeWidth(d: PenDrawing): number {
	return d.highlighter ? HIGHLIGHTER_WIDTH : STROKE_WIDTHS[d.width];
}

/** A smooth path through freehand points (quadratic curves through midpoints). */
export function penPath(d: PenDrawing): string {
	const pts = d.points.map(toUnits);
	if (pts.length === 0) return "";
	if (pts.length === 1) return `M${fmt(pts[0].x)} ${fmt(pts[0].y)}l0.01 0`;
	let path = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
	for (let i = 1; i < pts.length - 1; i++) {
		const mid = scale(add(pts[i], pts[i + 1]), 0.5);
		path += `Q${fmt(pts[i].x)} ${fmt(pts[i].y)} ${fmt(mid.x)} ${fmt(mid.y)}`;
	}
	const last = pts[pts.length - 1];
	return `${path}L${fmt(last.x)} ${fmt(last.y)}`;
}

/** Ramer–Douglas–Peucker simplification, in board units. */
export function simplify(points: Point[], tolerance = 1.2): Point[] {
	if (points.length < 3) return points;
	const units = points.map(toUnits);
	const keep = new Array(points.length).fill(false);
	keep[0] = keep[points.length - 1] = true;

	const stack: [number, number][] = [[0, points.length - 1]];
	while (stack.length) {
		const [first, last] = stack.pop()!;
		const a = units[first];
		const b = units[last];
		const ab = sub(b, a);
		const abLen = length(ab) || 1;
		let maxDist = 0;
		let index = -1;
		for (let i = first + 1; i < last; i++) {
			const dist =
				Math.abs(ab.x * (a.y - units[i].y) - ab.y * (a.x - units[i].x)) / abLen;
			if (dist > maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		if (index !== -1 && maxDist > tolerance) {
			keep[index] = true;
			stack.push([first, index], [index, last]);
		}
	}
	return points.filter((_, i) => keep[i]);
}

export function textLines(d: TextDrawing): string[] {
	return d.text.split("\n");
}

/** Approximate text box in board units (no DOM measuring, so it works anywhere). */
export function textBox(d: TextDrawing) {
	const size = TEXT_SIZES[d.size];
	const lines = textLines(d);
	const longest = Math.max(1, ...lines.map((l) => [...l].length));
	const width = longest * size * 0.56 + size * 0.6;
	const lineHeight = size * 1.25;
	const height = lines.length * lineHeight + size * 0.3;
	const centre = toUnits([d.x, d.y]);
	return {
		x: centre.x - width / 2,
		y: centre.y - lineHeight / 2 - size * 0.15,
		width,
		height,
		size,
		lineHeight,
	};
}
