import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";
import { createBoard, newId } from "./board";
import { isSport } from "./sports";
import {
	Board,
	BoardNode,
	Drawing,
	Move,
	Point,
	SCHEMA_VERSION,
	Step,
	TeamStyle,
} from "./types";

/** Saved boards are JSON files with this extension. */
export const FILE_EXTENSION = "lineup";

export class BoardFileError extends Error {}

/** A board as JSON text: how the library keeps boards in a browser. */
export function serializeBoard(board: Board): string {
	return JSON.stringify(board, null, "\t");
}

/**
 * Board files start with these bytes ("LNUP") and a format number, followed by
 * the board as gzip-compressed JSON. That keeps files small and stops them
 * reading as plain text; it isn't encryption.
 */
const MAGIC = [0x4c, 0x4e, 0x55, 0x50];
const FILE_FORMAT = 1;

/** A board as the bytes of a `.lineup` file. */
export function encodeBoardFile(board: Board): Uint8Array {
	const body = gzipSync(strToU8(JSON.stringify(board)), { level: 9, mtime: 0 });
	const file = new Uint8Array(MAGIC.length + 1 + body.length);
	file.set(MAGIC);
	file[MAGIC.length] = FILE_FORMAT;
	file.set(body, MAGIC.length + 1);
	return file;
}

function isBoardFile(bytes: Uint8Array): boolean {
	return MAGIC.every((b, i) => bytes[i] === b);
}

/**
 * Read a `.lineup` file. Files saved before v0.7.0 are plain JSON text, and
 * still open.
 */
export function decodeBoardFile(bytes: Uint8Array): Board {
	if (!isBoardFile(bytes)) return parseBoard(strFromU8(bytes));
	if (bytes[MAGIC.length] > FILE_FORMAT) {
		throw new BoardFileError(
			"This board was made with a newer version of Lineup. Update the app to open it.",
		);
	}
	let text: string;
	try {
		text = strFromU8(gunzipSync(bytes.subarray(MAGIC.length + 1)));
	} catch {
		throw new BoardFileError("This board file is damaged and can't be opened.");
	}
	return parseBoard(text);
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
				stripes:
					isStr(raw.color) && isStr(raw.stripes) ? raw.stripes : undefined,
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

/** A marker size from a file, kept within sensible limits (normal if missing). */
function scaleOr1(value: unknown): number {
	return isNum(value) ? Math.min(2, Math.max(0.5, value)) : 1;
}

/** Keeps a team's name and kit; anything else (like old keeper colours) is dropped. */
function cleanTeam(raw: unknown, fallback: TeamStyle): TeamStyle {
	const team = isObject(raw) ? raw : {};
	return {
		name: isStr(team.name) ? team.name : fallback.name,
		color: isStr(team.color) ? team.color : fallback.color,
		...(isStr(team.stripes) ? { stripes: team.stripes } : {}),
	};
}

/** Steps keep only moves for markers that exist; broken moves and steps are dropped. */
function cleanSteps(raw: unknown, nodeIds: Set<string>): Step[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter(isObject).map((step): Step => {
		const moves: Record<string, Move> = {};
		const rawMoves = isObject(step.moves) ? step.moves : {};
		for (const [id, m] of Object.entries(rawMoves)) {
			if (!nodeIds.has(id) || !isObject(m) || !isNum(m.x) || !isNum(m.y))
				continue;
			const via = Array.isArray(m.via) ? m.via.filter(isPoint).map(point) : [];
			moves[id] = {
				x: clamp01(m.x),
				y: clamp01(m.y),
				...(via.length > 0 ? { via } : {}),
			};
		}
		return {
			id: isStr(step.id) ? step.id : newId(),
			duration:
				isNum(step.duration) && step.duration > 0
					? Math.min(step.duration, 60)
					: 1.5,
			moves,
		};
	});
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
	const pitch = isObject(raw.pitch) ? raw.pitch : {};

	const nodes = raw.nodes
		.map(cleanNode)
		.filter((n): n is BoardNode => n !== null);

	// Version 1 files (Lineup 0.5) have no animation; they open with no steps.
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
		display: {
			...fresh.display,
			showLabels: display.showLabels !== false,
			playerScale: scaleOr1(display.playerScale),
			equipmentScale: scaleOr1(display.equipmentScale),
		},
		// Boards from before v0.7.0 are all soccer, full pitch. An unknown sport
		// (from a newer version) falls back to soccer rather than failing.
		pitch: {
			sport: isSport(pitch.sport) ? pitch.sport : "soccer",
			variant: pitch.variant === "half" ? "half" : "full",
		},
		nodes,
		drawings: Array.isArray(raw.drawings)
			? raw.drawings.map(cleanDrawing).filter((d): d is Drawing => d !== null)
			: [],
		steps: cleanSteps(raw.steps, new Set(nodes.map((n) => n.id))),
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
