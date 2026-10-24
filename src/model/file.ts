import { createBoard, newId } from "./board";
import {
	Board,
	BoardNode,
	Drawing,
	Point,
	SCHEMA_VERSION,
	TeamStyle,
} from "./types";

/** Saved boards are JSON files with this extension. */
export const FILE_EXTENSION = "lineup";

export class BoardFileError extends Error {}

export function serializeBoard(board: Board): string {
	return JSON.stringify(board, null, "\t");
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === "object" && !Array.isArray(v);
const isNum = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isPoint = (v: unknown): v is Point =>
	Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const point = (p: Point): Point => [clamp01(p[0]), clamp01(p[1])];

const NODE_KINDS = new Set([
	"player",
	"cone",
	"ball",
	"goal",
	"mannequin",
	"pole",
]);
const DRAWING_KINDS = new Set(["line", "zone", "pen", "text"]);

function cleanNode(raw: unknown): BoardNode | null {
	if (!isObject(raw) || !isStr(raw.kind) || !NODE_KINDS.has(raw.kind))
		return null;
	if (!isNum(raw.x) || !isNum(raw.y)) return null;
	const base = {
		...raw,
		id: isStr(raw.id) ? raw.id : newId(),
		x: clamp01(raw.x),
		y: clamp01(raw.y),
	};
	switch (raw.kind) {
		case "player":
			return {
				...base,
				kind: "player",
				team: raw.team === "away" || raw.team === "neutral" ? raw.team : "home",
				keeper: raw.keeper === true,
				number: isNum(raw.number) ? raw.number : undefined,
				label: isStr(raw.label) ? raw.label : undefined,
				name: isStr(raw.name) ? raw.name : undefined,
				color: isStr(raw.color) ? raw.color : undefined,
			} as BoardNode;
		case "cone":
		case "pole":
			return {
				...base,
				kind: raw.kind,
				color: isStr(raw.color) ? raw.color : "#FF8A00",
			} as BoardNode;
		case "mannequin":
			return {
				...base,
				kind: "mannequin",
				color: isStr(raw.color) ? raw.color : "#F5D90A",
				rotation: isNum(raw.rotation) ? raw.rotation : 0,
			} as BoardNode;
		case "goal":
			return {
				...base,
				kind: "goal",
				size: raw.size === "mini" ? "mini" : "full",
				rotation: isNum(raw.rotation) ? raw.rotation : 0,
			} as BoardNode;
		default:
			return { ...base, kind: "ball" } as BoardNode;
	}
}

function cleanDrawing(raw: unknown): Drawing | null {
	if (!isObject(raw) || !isStr(raw.kind) || !DRAWING_KINDS.has(raw.kind))
		return null;
	const base = {
		...raw,
		id: isStr(raw.id) ? raw.id : newId(),
		color: isStr(raw.color) ? raw.color : "#FFFFFF",
	};
	switch (raw.kind) {
		case "line":
			if (!isPoint(raw.from) || !isPoint(raw.to)) return null;
			return {
				...base,
				kind: "line",
				from: point(raw.from),
				to: point(raw.to),
				control: isPoint(raw.control) ? point(raw.control) : undefined,
				stroke:
					raw.stroke === "dashed" || raw.stroke === "wavy"
						? raw.stroke
						: "solid",
				heads: raw.heads === "none" || raw.heads === "both" ? raw.heads : "end",
				width:
					raw.width === "thin" || raw.width === "thick" ? raw.width : "medium",
			} as Drawing;
		case "zone":
			if (![raw.x, raw.y, raw.w, raw.h].every(isNum)) return null;
			return {
				...base,
				kind: "zone",
				shape: raw.shape === "ellipse" ? "ellipse" : "rect",
				dashed: raw.dashed !== false,
			} as Drawing;
		case "pen": {
			const points = Array.isArray(raw.points)
				? raw.points.filter(isPoint).map(point)
				: [];
			if (points.length === 0) return null;
			return {
				...base,
				kind: "pen",
				points,
				width:
					raw.width === "thin" || raw.width === "thick" ? raw.width : "medium",
				highlighter: raw.highlighter === true,
			} as Drawing;
		}
		default:
			if (!isNum(raw.x) || !isNum(raw.y)) return null;
			return {
				...base,
				kind: "text",
				text: isStr(raw.text) ? raw.text : "",
				size:
					raw.size === "small" || raw.size === "large" ? raw.size : "medium",
				background: raw.background !== false,
			} as Drawing;
	}
}

/** Keeps a team's name and colour; anything else (like old keeper colours) is dropped. */
function cleanTeam(raw: unknown, fallback: TeamStyle): TeamStyle {
	const team = isObject(raw) ? raw : {};
	return {
		name: isStr(team.name) ? team.name : fallback.name,
		color: isStr(team.color) ? team.color : fallback.color,
	};
}

/**
 * Read a board from file contents. Unknown or broken items are dropped rather
 * than failing the whole file, and missing fields get defaults, so files from
 * older versions still open.
 */
export function parseBoard(text: string): Board {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new BoardFileError(
			"This file isn't a Lineup board (it isn't valid JSON).",
		);
	}
	if (
		!isObject(raw) ||
		!isNum(raw.schemaVersion) ||
		!Array.isArray(raw.nodes)
	) {
		throw new BoardFileError("This file isn't a Lineup board.");
	}
	if (raw.schemaVersion > SCHEMA_VERSION) {
		throw new BoardFileError(
			"This board was made with a newer version of Lineup. Update the app to open it.",
		);
	}

	const fresh = createBoard();
	const meta = isObject(raw.meta) ? raw.meta : {};
	const notes = isObject(raw.notes) ? raw.notes : {};
	const teams = isObject(raw.teams) ? raw.teams : {};
	const display = isObject(raw.display) ? raw.display : {};

	return {
		...fresh,
		id: isStr(raw.id) ? raw.id : fresh.id,
		meta: {
			...fresh.meta,
			title:
				isStr(meta.title) && meta.title.trim() ? meta.title : "Untitled board",
			tags: Array.isArray(meta.tags) ? meta.tags.filter(isStr) : [],
			folder: isStr(meta.folder) ? meta.folder : "",
			createdAt: isStr(meta.createdAt) ? meta.createdAt : fresh.meta.createdAt,
			updatedAt: isStr(meta.updatedAt) ? meta.updatedAt : fresh.meta.updatedAt,
		},
		notes: {
			...fresh.notes,
			...Object.fromEntries(
				Object.entries(notes).filter(([k, v]) => k in fresh.notes && isStr(v)),
			),
			coachingPoints: Array.isArray(notes.coachingPoints)
				? notes.coachingPoints.filter(isStr)
				: [],
		},
		teams: {
			home: cleanTeam(teams.home, fresh.teams.home),
			away: cleanTeam(teams.away, fresh.teams.away),
			neutral: cleanTeam(teams.neutral, fresh.teams.neutral),
		},
		display: { ...fresh.display, showLabels: display.showLabels !== false },
		nodes: raw.nodes.map(cleanNode).filter((n): n is BoardNode => n !== null),
		drawings: Array.isArray(raw.drawings)
			? raw.drawings.map(cleanDrawing).filter((d): d is Drawing => d !== null)
			: [],
	};
}

/** A safe file name for a board title. */
export function fileNameFor(title: string, extension: string): string {
	const base = title
		.trim()
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
		.replace(/\s+/g, " ")
		.slice(0, 80)
		.trim();
	return `${base || "Untitled board"}.${extension}`;
}
