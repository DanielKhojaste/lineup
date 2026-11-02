import { appDataDir, documentDir, join } from "@tauri-apps/api/path";
import {
	BaseDirectory,
	exists,
	mkdir,
	readDir,
	readFile,
	readTextFile,
	remove,
	rename,
	writeFile,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
	decodeBoardFile,
	encodeBoardFile,
	FILE_EXTENSION,
} from "../model/file";
import {
	decodeSessionFile,
	encodeSessionFile,
	SESSION_EXTENSION,
} from "../model/session";
import { EMPTY_INDEX, LibraryIndex, LibraryStore } from "./types";

/**
 * Everything lives under Documents/Lineup so coaches can find and back up their
 * boards. Some Linux setups have no Documents folder; then the app's own data
 * folder is used instead.
 */
const ROOT = "Lineup";
const INDEX_FILE = `${ROOT}/library.json`;

/** Each kind of document has its own folder and file extension. */
const BOARDS = { dir: `${ROOT}/boards`, extension: FILE_EXTENSION };
const SESSIONS = { dir: `${ROOT}/sessions`, extension: SESSION_EXTENSION };
type Collection = typeof BOARDS;

const pathOf = (c: Collection, id: string) => `${c.dir}/${id}.${c.extension}`;

async function chooseBase(): Promise<{
	baseDir: BaseDirectory;
	location: string;
}> {
	try {
		return {
			baseDir: BaseDirectory.Document,
			location: await join(await documentDir(), ROOT),
		};
	} catch {
		return {
			baseDir: BaseDirectory.AppData,
			location: await join(await appDataDir(), ROOT),
		};
	}
}

export async function createTauriStore(): Promise<LibraryStore> {
	const { baseDir, location } = await chooseBase();
	const options = { baseDir };

	const ensureFolders = async () => {
		for (const c of [BOARDS, SESSIONS])
			if (!(await exists(c.dir, options)))
				await mkdir(c.dir, { ...options, recursive: true });
	};

	/** Write to a temporary file first, then swap it in, so a crash can't leave half a file. */
	const writeSafely = async (path: string, data: string | Uint8Array) => {
		const temp = `${path}.tmp`;
		if (typeof data === "string") await writeTextFile(temp, data, options);
		else await writeFile(temp, data, options);
		await rename(temp, path, {
			oldPathBaseDir: baseDir,
			newPathBaseDir: baseDir,
		});
	};

	/** Read every file of one kind; files that fail are reported, not thrown. */
	const loadCollection = async <T>(
		c: Collection,
		decode: (bytes: Uint8Array) => T,
		problems: string[],
	): Promise<T[]> => {
		const docs: T[] = [];
		for (const entry of await readDir(c.dir, options)) {
			if (!entry.isFile || !entry.name.endsWith(`.${c.extension}`)) continue;
			try {
				docs.push(decode(await readFile(`${c.dir}/${entry.name}`, options)));
			} catch (error) {
				problems.push(`${entry.name}: ${(error as Error).message}`);
			}
		}
		return docs;
	};

	const removeFile = async (path: string) => {
		if (await exists(path, options)) await remove(path, options);
	};

	await ensureFolders();

	return {
		location,

		async loadAll() {
			await ensureFolders();
			const problems: string[] = [];
			const boards = await loadCollection(BOARDS, decodeBoardFile, problems);
			const sessions = await loadCollection(
				SESSIONS,
				decodeSessionFile,
				problems,
			);
			return { boards, sessions, problems };
		},

		async save(board) {
			await ensureFolders();
			await writeSafely(pathOf(BOARDS, board.id), encodeBoardFile(board));
		},

		remove: (id) => removeFile(pathOf(BOARDS, id)),

		async saveSession(session) {
			await ensureFolders();
			await writeSafely(pathOf(SESSIONS, session.id), encodeSessionFile(session));
		},

		removeSession: (id) => removeFile(pathOf(SESSIONS, id)),

		async loadIndex() {
			try {
				if (!(await exists(INDEX_FILE, options))) return EMPTY_INDEX;
				const index = JSON.parse(
					await readTextFile(INDEX_FILE, options),
				) as LibraryIndex;
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
			await ensureFolders();
			await writeSafely(INDEX_FILE, JSON.stringify(index, null, "\t"));
		},
	};
}
