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
import { giveRepeatsNewIds, libraryFileName } from "./dedupe";
import { cleanIndex, EMPTY_INDEX, LibraryIndex, LibraryStore } from "./types";

/**
 * Everything lives under Documents/Lineup so coaches can find and back up their
 * boards. Some Linux setups have no Documents folder; then the app's own data
 * folder is used instead.
 */
const ROOT = "Lineup";
const INDEX_FILE = `${ROOT}/library.json`;

/** Each kind of document has its own folder and file extension. */
const BOARDS = {
	dir: `${ROOT}/boards`,
	extension: FILE_EXTENSION,
	untitled: "Untitled board",
};
const SESSIONS = {
	dir: `${ROOT}/sessions`,
	extension: SESSION_EXTENSION,
	untitled: "Untitled session",
};
type Collection = typeof BOARDS;

/** What every document has that its file name is made from. */
type Named = { id: string; meta: { title: string; createdAt: string } };

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

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

	/**
	 * Which file each document lives in, by id. Files aren't always named after
	 * their id (one copied into the folder by hand, say), so saving writes back
	 * to the file a document came from instead of making a second one.
	 */
	const files = new Map<string, string>();
	const fileFor = (c: Collection, id: string) => files.get(id) ?? pathOf(c, id);

	/** Names of the other documents' files in a folder, lower-cased. */
	const takenNames = (c: Collection, exceptId: string) =>
		new Set(
			[...files.entries()]
				.filter(([id, path]) => id !== exceptId && path.startsWith(`${c.dir}/`))
				.map(([, path]) => baseName(path).toLowerCase()),
		);

	/** The file a document should be in: named after its title ("Cool Board.lineup"). */
	const fileNamedFor = (c: Collection, doc: Named) =>
		`${c.dir}/${libraryFileName(
			doc.meta.title,
			c.extension,
			doc.meta.createdAt,
			doc.id,
			takenNames(c, doc.id),
			c.untitled,
		)}`;

	/**
	 * Save a document to the file named after its title. When the title has
	 * changed, the old file goes once the new one is written.
	 */
	const saveNamed = async <T extends Named>(
		c: Collection,
		doc: T,
		encode: (doc: T) => Uint8Array,
	) => {
		const current = files.get(doc.id);
		const target = fileNamedFor(c, doc);
		await writeSafely(target, encode(doc));
		files.set(doc.id, target);
		if (current && current !== target && (await exists(current, options)))
			await remove(current, options);
	};

	/**
	 * Read every file of one kind; files that fail are reported, not thrown.
	 * Two files with the same document inside get different ids (and the
	 * second is saved again under its new id), so neither hides the other.
	 */
	const loadCollection = async <T extends Named>(
		c: Collection,
		decode: (bytes: Uint8Array) => T,
		encode: (doc: T) => Uint8Array,
		problems: string[],
	): Promise<T[]> => {
		const loaded: { doc: T; file: string }[] = [];
		for (const entry of await readDir(c.dir, options)) {
			if (!entry.isFile || !entry.name.endsWith(`.${c.extension}`)) continue;
			const file = `${c.dir}/${entry.name}`;
			try {
				loaded.push({ doc: decode(await readFile(file, options)), file });
			} catch (error) {
				problems.push(`${entry.name}: ${(error as Error).message}`);
			}
		}
		const { docs, changed } = giveRepeatsNewIds(loaded);
		for (const { doc, file } of docs) files.set(doc.id, file);
		for (const { doc, file } of changed) {
			try {
				await writeSafely(file, encode(doc));
			} catch (error) {
				problems.push(`${file}: ${(error as Error).message}`);
			}
		}
		// Files from earlier versions are named by id ("4684539c-….lineup"):
		// rename them after their titles.
		for (const { doc, file } of docs) {
			const target = fileNamedFor(c, doc);
			if (target === file) continue;
			try {
				if (await exists(target, options)) continue;
				await rename(file, target, {
					oldPathBaseDir: baseDir,
					newPathBaseDir: baseDir,
				});
				files.set(doc.id, target);
			} catch (error) {
				problems.push(`${baseName(file)}: ${(error as Error).message}`);
			}
		}
		return docs.map((d) => d.doc);
	};

	const removeFile = async (c: Collection, id: string) => {
		const path = fileFor(c, id);
		files.delete(id);
		if (await exists(path, options)) await remove(path, options);
	};

	await ensureFolders();

	return {
		location,

		async loadAll() {
			await ensureFolders();
			const problems: string[] = [];
			files.clear();
			const boards = await loadCollection(
				BOARDS,
				decodeBoardFile,
				encodeBoardFile,
				problems,
			);
			const sessions = await loadCollection(
				SESSIONS,
				decodeSessionFile,
				encodeSessionFile,
				problems,
			);
			return { boards, sessions, problems };
		},

		async save(board) {
			await ensureFolders();
			await saveNamed(BOARDS, board, encodeBoardFile);
		},

		remove: (id) => removeFile(BOARDS, id),

		async saveSession(session) {
			await ensureFolders();
			await saveNamed(SESSIONS, session, encodeSessionFile);
		},

		removeSession: (id) => removeFile(SESSIONS, id),

		async loadIndex() {
			try {
				if (!(await exists(INDEX_FILE, options))) return EMPTY_INDEX;
				const index = JSON.parse(
					await readTextFile(INDEX_FILE, options),
				) as LibraryIndex;
				return cleanIndex(index);
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
