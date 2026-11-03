/**
 * Training sessions: an ordered, timed list of drills from the library,
 * breaks and other blocks, under a header like a coach's session sheet.
 * Sessions aren't tied to a date; the calendar puts them on dates.
 */

import { newId } from "./board";
import {
	BoardFileError,
	decodeDocumentText,
	encodeDocument,
	isNum,
	isObject,
	isStr,
} from "./file";
import { isSport, Sport } from "./sports";

export const SESSION_SCHEMA_VERSION = 1;
export const SESSION_EXTENSION = "lineup-session";

export interface SessionMeta {
	title: string;
	tags: string[];
	/** Library folder name; empty when the session isn't in a folder. */
	folder: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * What a coach needs to know before running the session. Only the title (in
 * `meta`) is required; everything else is optional.
 */
export interface SessionHeader {
	/** Age group or team, e.g. "U12" or "U12 Girls". */
	team: string;
	/** The session's sport: it picks the suggested topics and drills. Empty for any. */
	sport: Sport | "";
	/** What the session is about and how it runs, for whoever coaches it. */
	description: string;
	/** Tags like "Passing" or "Pressing": suggested ones for the sport, or your own. */
	topics: string[];
	/** How long the session lasts, in minutes; null when not set. */
	plannedMinutes: number | null;
	equipment: string;
	area: string;
}

interface BlockBase {
	id: string;
	minutes: number;
	/** Notes for this block on the session sheet. */
	notes: string;
}

/** A drill (any board) from the library. */
export interface DrillBlock extends BlockBase {
	kind: "drill";
	boardId: string;
	/** What this drill is in this session ("Warm-up"…); empty uses the drill's own. */
	stage: string;
}

/** A water break, or any pause. */
export interface BreakBlock extends BlockBase {
	kind: "break";
	label: string;
}

/** Anything else: a team talk, a warm-up without a board, a match. */
export interface CustomBlock extends BlockBase {
	kind: "custom";
	label: string;
}

export type SessionBlock = DrillBlock | BreakBlock | CustomBlock;

export interface Session {
	schemaVersion: typeof SESSION_SCHEMA_VERSION;
	docType: "session";
	id: string;
	meta: SessionMeta;
	header: SessionHeader;
	blocks: SessionBlock[];
}

export const DEFAULT_DRILL_MINUTES = 12;
export const DEFAULT_BREAK_MINUTES = 2;
export const MAX_BLOCK_MINUTES = 240;

/** Shown wherever a session has no title yet. */
export const UNTITLED_SESSION = "Untitled session";

export const sessionTitle = (session: Session) =>
	session.meta.title.trim() || UNTITLED_SESSION;

/** New sessions start without a title: it's the first thing the form asks for. */
export function createSession(title = ""): Session {
	const now = new Date().toISOString();
	return {
		schemaVersion: SESSION_SCHEMA_VERSION,
		docType: "session",
		id: newId(),
		meta: { title, tags: [], folder: "", createdAt: now, updatedAt: now },
		header: {
			team: "",
			sport: "",
			description: "",
			topics: [],
			plannedMinutes: null,
			equipment: "",
			area: "",
		},
		blocks: [],
	};
}

export function createDrillBlock(
	boardId: string,
	minutes = DEFAULT_DRILL_MINUTES,
): DrillBlock {
	return { id: newId(), kind: "drill", boardId, minutes, notes: "", stage: "" };
}

export function createBreakBlock(
	label = "Water break",
	minutes = DEFAULT_BREAK_MINUTES,
): BreakBlock {
	return { id: newId(), kind: "break", label, minutes, notes: "" };
}

export function createCustomBlock(label = "", minutes = 5): CustomBlock {
	return { id: newId(), kind: "custom", label, minutes, notes: "" };
}

/** Minutes kept to whole numbers between 0 and four hours. */
export function cleanMinutes(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(MAX_BLOCK_MINUTES, Math.max(0, Math.round(value)));
}

export function totalMinutes(session: Session): number {
	return session.blocks.reduce((sum, b) => sum + b.minutes, 0);
}

/** "75 min", "1 h 15 min", "2 h". */
export function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${m} min` : `${h} h`;
}

/** When each block starts and ends, in minutes from the start of the session. */
export function blockTimes(session: Session): { from: number; to: number }[] {
	let at = 0;
	return session.blocks.map((b) => {
		const from = at;
		at += b.minutes;
		return { from, to: at };
	});
}

/** The ids of the boards a session uses, in order, without repeats. */
export function sessionBoardIds(session: Session): string[] {
	return [
		...new Set(
			session.blocks
				.filter((b): b is DrillBlock => b.kind === "drill")
				.map((b) => b.boardId),
		),
	];
}

// ---------------------------------------------------------------- Files ----

export function encodeSessionFile(session: Session): Uint8Array {
	return encodeDocument(session);
}

export function decodeSessionFile(bytes: Uint8Array): Session {
	return parseSession(decodeDocumentText(bytes));
}

const text = (v: unknown, max = 2000) => (isStr(v) ? v.slice(0, max) : "");

/** Topic tags: trimmed, without blanks or repeats (ignoring case). */
export function cleanTopics(values: unknown[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		if (!isStr(v)) continue;
		const t = v.trim().slice(0, 40);
		if (!t || seen.has(t.toLowerCase())) continue;
		seen.add(t.toLowerCase());
		out.push(t);
	}
	return out;
}

function cleanBlock(raw: unknown): SessionBlock | null {
	if (!isObject(raw)) return null;
	const base = {
		id: isStr(raw.id) ? raw.id : newId(),
		minutes: isNum(raw.minutes) ? cleanMinutes(raw.minutes) : 0,
		notes: text(raw.notes),
	};
	switch (raw.kind) {
		case "drill":
			return isStr(raw.boardId)
				? { ...base, kind: "drill", boardId: raw.boardId, stage: text(raw.stage, 60) }
				: null;
		case "break":
			return { ...base, kind: "break", label: text(raw.label, 120) || "Break" };
		case "custom":
			return { ...base, kind: "custom", label: text(raw.label, 120) };
		default:
			return null;
	}
}

/**
 * Read a session from file contents. Broken blocks are dropped and missing
 * fields filled in, like boards.
 */
export function parseSession(source: string): Session {
	let raw: unknown;
	try {
		raw = JSON.parse(source);
	} catch {
		throw new BoardFileError("This file isn't a Lineup session.");
	}
	if (!isObject(raw) || raw.docType !== "session" || !isNum(raw.schemaVersion))
		throw new BoardFileError("This file isn't a Lineup session.");
	if (raw.schemaVersion > SESSION_SCHEMA_VERSION)
		throw new BoardFileError(
			"This session was made with a newer version of Lineup. Update the app to open it.",
		);

	const fresh = createSession();
	const meta = isObject(raw.meta) ? raw.meta : {};
	const header = isObject(raw.header) ? raw.header : {};
	const planned = header.plannedMinutes;

	return {
		...fresh,
		id: isStr(raw.id) ? raw.id : fresh.id,
		meta: {
			title: text(meta.title, 120),
			tags: Array.isArray(meta.tags) ? meta.tags.filter(isStr) : [],
			folder: isStr(meta.folder) ? meta.folder : "",
			createdAt: isStr(meta.createdAt) ? meta.createdAt : fresh.meta.createdAt,
			updatedAt: isStr(meta.updatedAt) ? meta.updatedAt : fresh.meta.updatedAt,
		},
		header: {
			team: text(header.team, 120),
			sport: isSport(header.sport) ? header.sport : "",
			// Early test versions had "notes", a single "topic" and "focus points".
			description: text(header.description ?? header.notes),
			topics: cleanTopics([
				...(Array.isArray(header.topics) ? header.topics : []),
				header.topic,
				...(Array.isArray(header.focusPoints) ? header.focusPoints : []),
			]),
			plannedMinutes:
				isNum(planned) && planned > 0 ? cleanMinutes(planned) || null : null,
			equipment: text(header.equipment, 300),
			area: text(header.area, 120),
		},
		blocks: Array.isArray(raw.blocks)
			? raw.blocks.map(cleanBlock).filter((b): b is SessionBlock => b !== null)
			: [],
	};
}

/** A board's "Duration" note as minutes ("15 min", "15'", "1 h 5 min"), or null. */
export function minutesFromText(text: string): number | null {
	const hours = /(\d+(?:[.,]\d+)?)\s*h/i.exec(text);
	const mins = /(\d+)\s*(?:m(?:in)?|'|$)/i.exec(text.replace(/\d+(?:[.,]\d+)?\s*h(?:ours?|rs?)?/i, ""));
	const total =
		(hours ? Number(hours[1].replace(",", ".")) * 60 : 0) +
		(mins ? Number(mins[1]) : 0);
	return total > 0 ? cleanMinutes(total) : null;
}

/**
 * What each block is called on the session sheet: a drill's stage ("Warm-up"),
 * from the session or the drill, or else "Activity 1", "Activity 2"…
 */
export function blockStages(
	session: Session,
	stageOf: (boardId: string) => string,
): string[] {
	let activity = 0;
	return session.blocks.map((b) => {
		if (b.kind !== "drill") return "";
		activity += 1;
		return b.stage.trim() || stageOf(b.boardId).trim() || `Activity ${activity}`;
	});
}
