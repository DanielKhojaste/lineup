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

export type BoardNode = PlayerNode | ConeNode | BallNode;
export type NodeKind = BoardNode["kind"];

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
}
