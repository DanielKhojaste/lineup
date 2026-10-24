import { describe, expect, it } from "vitest";
import {
	createLine,
	createText,
	DEFAULT_TOOL_STYLES,
} from "../../model/drawings";
import { Point } from "../../model/types";
import {
	controlFromMidpoint,
	lineGeometry,
	lineMidpoint,
	simplify,
	textBox,
	toUnits,
} from "./geometry";

const style = DEFAULT_TOOL_STYLES.line;

describe("line geometry", () => {
	it("draws one arrowhead for runs and passes, none for plain lines, two for double arrows", () => {
		const run = createLine("run", [0.2, 0.5], [0.6, 0.5], style);
		expect(lineGeometry(run).heads).toHaveLength(1);
		expect(lineGeometry({ ...run, heads: "none" }).heads).toHaveLength(0);
		expect(lineGeometry({ ...run, heads: "both" }).heads).toHaveLength(2);
	});

	it("dashes passes", () => {
		expect(
			lineGeometry(createLine("pass", [0.2, 0.5], [0.6, 0.5], style)).dash,
		).toBeDefined();
		expect(
			lineGeometry(createLine("run", [0.2, 0.5], [0.6, 0.5], style)).dash,
		).toBeUndefined();
	});

	it("makes dribbles wavy", () => {
		const dribble = lineGeometry(
			createLine("dribble", [0.2, 0.5], [0.6, 0.5], style),
		);
		const ys = [...dribble.path.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) =>
			Number(m[1]),
		);
		const centre = toUnits([0, 0.5]).y;
		expect(Math.max(...ys) - centre).toBeGreaterThan(3);
		expect(centre - Math.min(...ys)).toBeGreaterThan(3);
	});

	it("stops the stroke short of the arrowhead tip", () => {
		const run = createLine("run", [0.2, 0.5], [0.6, 0.5], style);
		const xs = [...lineGeometry(run).path.matchAll(/[ML]([\d.]+) /g)].map((m) =>
			Number(m[1]),
		);
		expect(Math.max(...xs)).toBeLessThan(toUnits([0.6, 0.5]).x - 5);
	});

	it("skips arrowheads on lines too short to hold them", () => {
		const tiny = createLine("run", [0.5, 0.5], [0.505, 0.5], style);
		expect(lineGeometry(tiny).heads).toHaveLength(0);
	});
});

describe("curves", () => {
	it("passes through the midpoint it was bent to", () => {
		const from: Point = [0.2, 0.5];
		const to: Point = [0.6, 0.5];
		const mid = toUnits([0.4, 0.3]);
		const control = controlFromMidpoint(from, to, mid);
		const curve = { ...createLine("run", from, to, style), control };
		const onCurve = lineMidpoint(curve);
		expect(onCurve.x).toBeCloseTo(mid.x);
		expect(onCurve.y).toBeCloseTo(mid.y);
	});
});

describe("simplify", () => {
	it("keeps the ends and drops points on a straight run", () => {
		const points: Point[] = Array.from({ length: 50 }, (_, i) => [
			0.1 + i * 0.01,
			0.5,
		]);
		const out = simplify(points);
		expect(out).toEqual([points[0], points[49]]);
	});

	it("keeps corners", () => {
		const points: Point[] = [
			[0.1, 0.1],
			[0.2, 0.1],
			[0.3, 0.1],
			[0.3, 0.2],
			[0.3, 0.3],
		];
		expect(simplify(points)).toEqual([
			[0.1, 0.1],
			[0.3, 0.1],
			[0.3, 0.3],
		]);
	});
});

describe("text", () => {
	it("grows its box with longer and multi-line text", () => {
		const short = textBox(createText(0.5, 0.5, "Go", DEFAULT_TOOL_STYLES.text));
		const long = textBox(
			createText(0.5, 0.5, "Press high\nand early", DEFAULT_TOOL_STYLES.text),
		);
		expect(long.width).toBeGreaterThan(short.width);
		expect(long.height).toBeGreaterThan(short.height);
	});
});
