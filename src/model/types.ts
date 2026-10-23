/**
 * Board documents are plain, JSON-serialisable data. Everything that ends up
 * in a saved `.lineup` file is described here, so keep these types free of
 * class instances, functions and DOM references.
 */

export const SCHEMA_VERSION = 1;

export type TeamId = "home" | "away" | "neutral";

export interface TeamStyle {
	name: string;
	color: string;
	keeperColor: string;
}

interface NodeBase {
	id: string;
	/** Horizontal centre, normalised to the board width (0 = left edge, 1 = right edge). */
	x: number;
	/** Vertical centre, normalised to the board height (0 = top edge, 1 = bottom edge). */
	y: number;
}

export interface PlayerNode extends NodeBase {
	kind: "player";
	team: TeamId;
	keeper: boolean;
	number?: number;
	/** Short position label shown under the marker, e.g. "RW". */
	label?: string;
	name?: string;
}

export interface ConeNode extends NodeBase {
	kind: "cone";
	color: string;
}

export interface BallNode extends NodeBase {
	kind: "ball";
}

export interface GoalNode extends NodeBase {
	kind: "goal";
	size: "full" | "mini";
	/** Degrees clockwise. At 0 the goal mouth faces right. */
	rotation: number;
}

export interface MannequinNode extends NodeBase {
	kind: "mannequin";
	color: string;
	/** Degrees clockwise. At 0 the mannequin faces right. */
	rotation: number;
}

export interface PoleNode extends NodeBase {
	kind: "pole";
	color: string;
}

export type BoardNode =
	| PlayerNode
	| ConeNode
	| BallNode
	| GoalNode
	| MannequinNode
	| PoleNode;
export type NodeKind = BoardNode["kind"];

/** A point in normalised board coordinates: [x, y], each 0–1. */
export type Point = [number, number];

interface DrawingBase {
	id: string;
	color: string;
}

export type LineStroke = "solid" | "dashed" | "wavy";
export type ArrowHeads = "none" | "end" | "both";
export type StrokeWidth = "thin" | "medium" | "thick";

/**
 * Straight or curved lines and arrows. Run = solid, pass = dashed,
 * dribble = wavy. `control` bends the line (quadratic curve).
 */
export interface LineDrawing extends DrawingBase {
	kind: "line";
	from: Point;
	to: Point;
	control?: Point;
	stroke: LineStroke;
	heads: ArrowHeads;
	width: StrokeWidth;
}

export interface ZoneDrawing extends DrawingBase {
	kind: "zone";
	shape: "rect" | "ellipse";
	/** Top-left corner. */
	x: number;
	y: number;
	w: number;
	h: number;
	dashed: boolean;
}

export interface PenDrawing extends DrawingBase {
	kind: "pen";
	points: Point[];
	width: StrokeWidth;
	highlighter: boolean;
}

export type TextSize = "small" | "medium" | "large";

export interface TextDrawing extends DrawingBase {
	kind: "text";
	/** Centre of the first line. */
	x: number;
	y: number;
	text: string;
	size: TextSize;
	background: boolean;
}

export type Drawing = LineDrawing | ZoneDrawing | PenDrawing | TextDrawing;
export type DrawingKind = Drawing["kind"];

/** Anything on the board that can be selected. */
export type BoardItem = BoardNode | Drawing;

export interface DrillNotes {
	category: string;
	ageGroup: string;
	duration: string;
	players: string;
	area: string;
	equipment: string;
	description: string;
	coachingPoints: string[];
}

export interface BoardMeta {
	title: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface BoardDisplay {
	/** Show position labels and names under player markers. */
	showLabels: boolean;
}

export interface PitchSettings {
	sport: "soccer";
	variant: "full";
}

export interface Board {
	schemaVersion: typeof SCHEMA_VERSION;
	id: string;
	meta: BoardMeta;
	notes: DrillNotes;
	pitch: PitchSettings;
	teams: Record<TeamId, TeamStyle>;
	display: BoardDisplay;
	/** Draw order: later nodes are drawn on top. */
	nodes: BoardNode[];
	/**
	 * Lines, zones, ink and text. Drawn under the markers, except text, which
	 * sits on top. Later drawings are drawn on top of earlier ones.
	 */
	drawings: Drawing[];
}
