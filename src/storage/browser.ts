import { parseBoard, serializeBoard } from "../model/file";
import { parseSession, Session } from "../model/session";
import { Board } from "../model/types";
import { EMPTY_INDEX, LibraryIndex, LibraryStore } from "./types";

const BOARDS_KEY = "lineup.library.boards";
const SESSIONS_KEY = "lineup.library.sessions";
const INDEX_KEY = "lineup.library.index";

/** Documents of one kind, as JSON text by id. */
function readMap(key = BOARDS_KEY): Record<string, string> {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as Record<string, string>) : {};
	} catch {
		return {};
	}
}

function writeMap(map: Record<string, string>, key = BOARDS_KEY) {
	localStorage.setItem(key, JSON.stringify(map));
}

/** Library kept in localStorage, used when Lineup runs in a normal browser. */
export const browserStore: LibraryStore = {
	location: "This browser (development mode)",

	async loadAll() {
		const boards: Board[] = [];
		const problems: string[] = [];
		for (const [id, text] of Object.entries(readMap())) {
			try {
				boards.push(parseBoard(text));
			} catch (error) {
				problems.push(`${id}: ${(error as Error).message}`);
			}
		}
		const sessions: Session[] = [];
		for (const [id, text] of Object.entries(readMap(SESSIONS_KEY))) {
			try {
				sessions.push(parseSession(text));
			} catch (error) {
				problems.push(`${id}: ${(error as Error).message}`);
			}
		}
		return { boards, sessions, problems };
	},

	async saveSession(session) {
		const map = readMap(SESSIONS_KEY);
		map[session.id] = JSON.stringify(session);
		writeMap(map, SESSIONS_KEY);
	},

	async removeSession(id) {
		const map = readMap(SESSIONS_KEY);
		delete map[id];
		writeMap(map, SESSIONS_KEY);
	},

	async save(board) {
		const map = readMap();
		map[board.id] = serializeBoard(board);
		writeMap(map);
	},

	async remove(id) {
		const map = readMap();
		delete map[id];
		writeMap(map);
	},

	async loadIndex() {
		try {
			const raw = localStorage.getItem(INDEX_KEY);
			const index = raw ? (JSON.parse(raw) as LibraryIndex) : EMPTY_INDEX;
			return {
				version: 1,
				folders: Array.isArray(index.folders)
					? index.folders.filter((f) => typeof f === "string")
					: [],
			};
		} catch {
			return EMPTY_INDEX;
		}
	},

	async saveIndex(index) {
		localStorage.setItem(INDEX_KEY, JSON.stringify(index));
	},
};
