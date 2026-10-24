import { appDataDir, documentDir, join } from "@tauri-apps/api/path";
import {
	BaseDirectory,
	exists,
	mkdir,
	readDir,
	readTextFile,
	remove,
	rename,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import { FILE_EXTENSION, parseBoard, serializeBoard } from "../model/file";
import { Board } from "../model/types";
import { EMPTY_INDEX, LibraryIndex, LibraryStore } from "./types";

/**
 * Everything lives under Documents/Lineup so coaches can find and back up their
 * boards. Some Linux setups have no Documents folder; then the app's own data
 * folder is used instead.
 */
const ROOT = "Lineup";
const BOARDS = `${ROOT}/boards`;
const INDEX_FILE = `${ROOT}/library.json`;

const boardPath = (id: string) => `${BOARDS}/${id}.${FILE_EXTENSION}`;

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
		if (!(await exists(BOARDS, options)))
			await mkdir(BOARDS, { ...options, recursive: true });
	};

	/** Write to a temporary file first, then swap it in, so a crash can't leave half a file. */
	const writeSafely = async (path: string, text: string) => {
		const temp = `${path}.tmp`;
		await writeTextFile(temp, text, options);
		await rename(temp, path, {
			oldPathBaseDir: baseDir,
			newPathBaseDir: baseDir,
		});
	};

	await ensureFolders();

	return {
		location,

		async loadAll() {
			await ensureFolders();
			const boards: Board[] = [];
			const problems: string[] = [];
			const entries = await readDir(BOARDS, options);
			for (const entry of entries) {
				if (!entry.isFile || !entry.name.endsWith(`.${FILE_EXTENSION}`))
					continue;
				try {
					boards.push(
						parseBoard(await readTextFile(`${BOARDS}/${entry.name}`, options)),
					);
				} catch (error) {
					problems.push(`${entry.name}: ${(error as Error).message}`);
				}
			}
			return { boards, problems };
		},

		async save(board) {
			await ensureFolders();
			await writeSafely(boardPath(board.id), serializeBoard(board));
		},

		async remove(id) {
			const path = boardPath(id);
			if (await exists(path, options)) await remove(path, options);
		},

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
