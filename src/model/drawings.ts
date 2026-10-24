import { newId } from "./board";
import {
	ArrowHeads,
	Drawing,
	LineDrawing,
	LineStroke,
	PenDrawing,
	Point,
	StrokeWidth,
	TextDrawing,
	TextSize,
	ZoneDrawing,
} from "./types";

export const DRAW_COLORS = [
	"#FFFFFF",
	"#15181B",
	"#FFE14D",
	"#FF5C5C",
	"#4CC9F0",
	"#FF8A00",
	"#7CE38B",
] as const;

export type LineTool = "run" | "pass" | "dribble" | "line";
export type DrawTool = LineTool | "zone" | "pen" | "text" | "eraser";

export const LINE_TOOLS: Record<
	LineTool,
	{ stroke: LineStroke; heads: ArrowHeads }
> = {
	run: { stroke: "solid", heads: "end" },
	pass: { stroke: "dashed", heads: "end" },
	dribble: { stroke: "wavy", heads: "end" },
	line: { stroke: "solid", heads: "none" },
};

export function isLineTool(tool: string): tool is LineTool {
	return tool in LINE_TOOLS;
}

/** The style new drawings get. Changed from the inspector while a draw tool is active. */
export interface ToolStyles {
	line: { color: string; width: StrokeWidth };
	zone: { color: string; shape: ZoneDrawing["shape"]; dashed: boolean };
	pen: { color: string; width: StrokeWidth; highlighter: boolean };
	text: { color: string; size: TextSize; background: boolean };
}

export const DEFAULT_TOOL_STYLES: ToolStyles = {
	line: { color: "#FFFFFF", width: "medium" },
	zone: { color: "#FFE14D", shape: "rect", dashed: true },
	pen: { color: "#FFE14D", width: "medium", highlighter: false },
	text: { color: "#FFFFFF", size: "medium", background: true },
};

/** Stroke widths in board units (10 per metre). */
export const STROKE_WIDTHS: Record<StrokeWidth, number> = {
	thin: 2,
	medium: 3.5,
	thick: 6,
};
export const HIGHLIGHTER_WIDTH = 18;
export const TEXT_SIZES: Record<TextSize, number> = {
	small: 18,
	medium: 26,
	large: 38,
};

export function createLine(
	tool: LineTool,
	from: Point,
	to: Point,
	style: ToolStyles["line"],
): LineDrawing {
	return {
		id: newId(),
		kind: "line",
		from,
		to,
		color: style.color,
		width: style.width,
		...LINE_TOOLS[tool],
	};
}

export function createZone(
	x: number,
	y: number,
	w: number,
	h: number,
	style: ToolStyles["zone"],
): ZoneDrawing {
	return { id: newId(), kind: "zone", x, y, w, h, ...style };
}

export function createPen(
	points: Point[],
	style: ToolStyles["pen"],
): PenDrawing {
	return { id: newId(), kind: "pen", points, ...style };
}

export function createText(
	x: number,
	y: number,
	text: string,
	style: ToolStyles["text"],
): TextDrawing {
	return { id: newId(), kind: "text", x, y, text, ...style };
}

const DRAWING_KINDS = new Set<string>(["line", "zone", "pen", "text"]);

export function isDrawing(item: { kind: string }): item is Drawing {
	return DRAWING_KINDS.has(item.kind);
}

/** Every point that defines a drawing's extent, for bounds and selection boxes. */
export function drawingPoints(d: Drawing): Point[] {
	switch (d.kind) {
		case "line":
			return d.control ? [d.from, d.to, d.control] : [d.from, d.to];
		case "zone":
			return [
				[d.x, d.y],
				[d.x + d.w, d.y + d.h],
			];
		case "pen":
			return d.points;
		case "text":
			return [[d.x, d.y]];
	}
}

export function offsetDrawing<T extends Drawing>(
	d: T,
	dx: number,
	dy: number,
): T {
	const move = (p: Point): Point => [p[0] + dx, p[1] + dy];
	switch (d.kind) {
		case "line":
			return {
				...d,
				from: move(d.from),
				to: move(d.to),
				control: d.control && move(d.control),
			};
		case "zone":
		case "text":
			return { ...d, x: d.x + dx, y: d.y + dy };
		case "pen":
			return { ...d, points: d.points.map(move) };
	}
}

export interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function boundsOf(points: Point[]): Bounds {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const [x, y] of points) {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}
	return { minX, minY, maxX, maxY };
}
