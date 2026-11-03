import { encodeDocument, isObject, parseBoard, serializeBoard } from "./file";
import { parseSession, Session } from "./session";
import { Board } from "./types";

/**
 * A session as it's shared: the session plus a copy of every drill it uses,
 * so whoever imports it gets the drills too. (The session files in the
 * library itself only hold the session; its drills are in the library.)
 */
export interface SharedSession {
	session: Session;
	drills: Board[];
}

/** The drills a session uses, once each, in the order they come up. */
export function drillsOf(
	session: Session,
	getBoard: (id: string) => Board | undefined,
): Board[] {
	const seen = new Set<string>();
	const drills: Board[] = [];
	for (const block of session.blocks) {
		if (block.kind !== "drill" || seen.has(block.boardId)) continue;
		seen.add(block.boardId);
		const board = getBoard(block.boardId);
		if (board) drills.push(board);
	}
	return drills;
}

/** The bytes of a `.lineup-session` file to share, with the drills inside. */
export function encodeSharedSession(session: Session, drills: Board[]): Uint8Array {
	// Where the drills sit in this library means nothing to whoever gets them.
	const shared = drills.map((d) => {
		const { imported: _imported, ...meta } = d.meta;
		return { ...d, meta: { ...meta, folder: "" } };
	});
	const { imported: _imported, ...meta } = session.meta;
	return encodeDocument({ ...session, meta, drills: shared });
}

/** A session file's text: the session, and the drills inside it if it has any. */
export function parseSharedSession(text: string): SharedSession {
	const session = parseSession(text);
	const raw = JSON.parse(text) as unknown;
	const drills: Board[] = [];
	if (isObject(raw) && Array.isArray(raw.drills)) {
		for (const d of raw.drills) {
			// A damaged drill is left out; the session shows it as missing.
			try {
				drills.push(parseBoard(JSON.stringify(d)));
			} catch {
				/* skip */
			}
		}
	}
	return { session, drills };
}

/** JSON with object keys in a fixed order, so two copies of the same thing compare equal. */
function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	if (isObject(value))
		return `{${Object.keys(value)
			.filter((k) => value[k] !== undefined)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
			.join(",")}}`;
	return JSON.stringify(value);
}

/**
 * Whether two boards hold the same drill: same markers, drawings, steps,
 * notes, title and type. Where they're filed and when they were saved don't count.
 */
export function sameDrill(a: Board, b: Board): boolean {
	const content = (board: Board) => {
		// Read back the way a file is, so an edited board and a parsed one line up.
		const x = parseBoard(serializeBoard(board));
		return { ...x, meta: { title: x.meta.title, type: x.meta.type, tags: x.meta.tags } };
	};
	return stableJson(content(a)) === stableJson(content(b));
}
