import { parseBoard, serializeBoard } from "../model/file";
import { Board } from "../model/types";
import { EMPTY_INDEX, LibraryIndex, LibraryStore } from "./types";

const BOARDS_KEY = "lineup.library.boards";
const INDEX_KEY = "lineup.library.index";

function readMap(): Record<string, string> {
	try {
		const raw = localStorage.getItem(BOARDS_KEY);
		return raw ? (JSON.parse(raw) as Record<string, string>) : {};
	} catch {
		return {};
	}
}

function writeMap(map: Record<string, string>) {
	localStorage.setItem(BOARDS_KEY, JSON.stringify(map));
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
		return { boards, problems };
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
