import {
	decodeDocumentText,
	encodeBoardFile,
	FILE_EXTENSION,
	fileNameFor,
	parseBoard,
} from "../model/file";
import { encodeSharedSession, parseSharedSession, SharedSession } from "../model/sessionFile";
import {
	Session,
	SESSION_EXTENSION,
	sessionTitle,
} from "../model/session";
import { Board } from "../model/types";
import { ThemePreset } from "../theme/themes";
import { THEME_EXTENSION, themeFileText } from "../theme/userThemes";
import { isTauri } from "./index";

/** Save a file somewhere the user picks (desktop) or download it (browser). Returns false if cancelled. */
/** Where save and open windows start: Documents, then wherever that kind of file went last. */
type FolderKind = "exports" | "themes";
const FOLDER_KEY = (kind: FolderKind) => `lineup.lastFolder.${kind}`;

async function startFolder(kind: FolderKind): Promise<string | undefined> {
	try {
		const saved = localStorage.getItem(FOLDER_KEY(kind));
		if (saved) return saved;
	} catch {
		// No storage: fall back to Documents.
	}
	try {
		const { documentDir } = await import("@tauri-apps/api/path");
		return await documentDir();
	} catch {
		return undefined;
	}
}

async function rememberFolder(kind: FolderKind, filePath: string) {
	try {
		const { dirname } = await import("@tauri-apps/api/path");
		localStorage.setItem(FOLDER_KEY(kind), await dirname(filePath));
	} catch {
		// Not worth failing the save over.
	}
}

/** A path in the folder a save window should start in, or just the name. */
async function startPath(kind: FolderKind, name?: string): Promise<string | undefined> {
	const folder = await startFolder(kind);
	if (!folder) return name;
	if (!name) return folder;
	const { join } = await import("@tauri-apps/api/path");
	return join(folder, name);
}

async function saveFile(
	name: string,
	extension: string,
	label: string,
	data: string | Uint8Array,
	mimeType = "application/octet-stream",
	kind: FolderKind = "exports",
): Promise<boolean> {
	if (isTauri()) {
		const { save } = await import("@tauri-apps/plugin-dialog");
		const { writeFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
		const path = await save({
			defaultPath: await startPath(kind, name),
			filters: [{ name: label, extensions: [extension] }],
		});
		if (!path) return false;
		await rememberFolder(kind, path);
		if (typeof data === "string") await writeTextFile(path, data);
		else await writeFile(path, data);
		return true;
	}

	const blob = new Blob([data as BlobPart], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	return true;
}

export function exportBoardFile(board: Board) {
	return saveFile(
		fileNameFor(board.meta.title, FILE_EXTENSION),
		FILE_EXTENSION,
		"Lineup board",
		encodeBoardFile(board),
	);
}

/** Save a session to share, with a copy of every drill it uses inside. */
export function exportSessionDocument(session: Session, drills: Board[]) {
	return saveFile(
		fileNameFor(sessionTitle(session), SESSION_EXTENSION),
		SESSION_EXTENSION,
		"Lineup session",
		encodeSharedSession(session, drills),
	);
}

/**
 * Export several boards and sessions at once: pick a folder, and each one is
 * saved there as its own file (sessions with their drills inside). Names that
 * clash get " (2)", " (3)"… Returns how many files were written, or 0 when the
 * coach closed the window.
 */
export async function exportManyToFolder(
	boards: Board[],
	sessions: { session: Session; drills: Board[] }[],
): Promise<number> {
	const files: { name: string; data: Uint8Array | string }[] = [
		...boards.map((b) => ({
			name: fileNameFor(b.meta.title, FILE_EXTENSION),
			data: encodeBoardFile(b),
		})),
		...sessions.map(({ session, drills }) => ({
			name: fileNameFor(sessionTitle(session), SESSION_EXTENSION, "Untitled session"),
			data: encodeSharedSession(session, drills),
		})),
	];
	// The same name twice in one export: number them.
	const used = new Set<string>();
	for (const file of files) {
		const dot = file.name.lastIndexOf(".");
		const base = file.name.slice(0, dot);
		const ext = file.name.slice(dot);
		let name = file.name;
		for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n})${ext}`;
		used.add(name.toLowerCase());
		file.name = name;
	}

	if (isTauri()) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const { exists, writeFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
		const { join } = await import("@tauri-apps/api/path");
		const folder = await open({
			directory: true,
			recursive: true,
			defaultPath: await startPath("exports"),
			title: `Export ${files.length} files to…`,
		});
		if (!folder || Array.isArray(folder)) return 0;
		localStorage.setItem(FOLDER_KEY("exports"), folder);
		for (const file of files) {
			// Never overwrite a file that's already in the folder.
			const dot = file.name.lastIndexOf(".");
			let path = await join(folder, file.name);
			for (let n = 2; await exists(path); n++)
				path = await join(folder, `${file.name.slice(0, dot)} (${n})${file.name.slice(dot)}`);
			if (typeof file.data === "string") await writeTextFile(path, file.data);
			else await writeFile(path, file.data);
		}
		return files.length;
	}

	// In a browser: one download each.
	for (const file of files) {
		const blob = new Blob([file.data as BlobPart], { type: "application/octet-stream" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = file.name;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	return files.length;
}

/** Save an exported session sheet (PDF or PNG), named after the session. */
export function exportSessionFile(
	title: string,
	kind: "pdf" | "png",
	bytes: Uint8Array,
) {
	return saveFile(
		fileNameFor(title, kind),
		kind,
		kind === "pdf" ? "PDF document" : "PNG image",
		bytes,
		kind === "pdf" ? "application/pdf" : "image/png",
	);
}

/** Save a theme as a `.lineup-theme` file to share or keep. */
export function exportThemeFile(theme: ThemePreset) {
	return saveFile(
		fileNameFor(theme.name, THEME_EXTENSION, "My theme"),
		THEME_EXTENSION,
		"Lineup theme",
		themeFileText(theme),
		"application/json",
		"themes",
	);
}

/** Let the user pick `.lineup-theme` files; returns each one's name and text. */
export async function pickThemeFiles(): Promise<{ name: string; text: string }[]> {
	if (isTauri()) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const { readTextFile } = await import("@tauri-apps/plugin-fs");
		const picked = await open({
			multiple: true,
			defaultPath: await startPath("themes"),
			filters: [{ name: "Lineup theme", extensions: [THEME_EXTENSION, "json"] }],
		});
		const paths = picked === null ? [] : Array.isArray(picked) ? picked : [picked];
		if (paths[0]) await rememberFolder("themes", paths[0]);
		return Promise.all(
			paths.map(async (path) => ({
				name: path.split(/[\\/]/).pop() ?? path,
				text: await readTextFile(path),
			})),
		);
	}
	const files = await new Promise<File[]>((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		input.accept = `.${THEME_EXTENSION},.json`;
		input.onchange = () => resolve([...(input.files ?? [])]);
		input.click();
	});
	return Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
}

export function exportPng(board: Board, png: Uint8Array) {
	return saveFile(
		fileNameFor(board.meta.title, "png"),
		"png",
		"PNG image",
		png,
		"image/png",
	);
}

/**
 * Let the user pick boards (`.lineup`) and sessions (`.lineup-session`) and
 * read them. Files that fail to open are reported, not thrown.
 */
export async function pickLibraryFiles(): Promise<{
	boards: Board[];
	sessions: SharedSession[];
	problems: string[];
}> {
	const files: { name: string; bytes: Uint8Array }[] = [];
	const extensions = [FILE_EXTENSION, SESSION_EXTENSION];

	if (isTauri()) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const { readFile } = await import("@tauri-apps/plugin-fs");
		const picked = await open({
			multiple: true,
			filters: [
				{ name: "Lineup boards and sessions", extensions },
				{ name: "Lineup board", extensions: [FILE_EXTENSION] },
				{ name: "Lineup session", extensions: [SESSION_EXTENSION] },
			],
		});
		const paths =
			picked === null ? [] : Array.isArray(picked) ? picked : [picked];
		for (const path of paths)
			files.push({
				name: path.split(/[\\/]/).pop() ?? path,
				bytes: await readFile(path),
			});
	} else {
		const picked = await new Promise<File[]>((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.multiple = true;
			input.accept = extensions.map((e) => `.${e}`).join(",");
			input.onchange = () => resolve([...(input.files ?? [])]);
			input.click();
		});
		for (const file of picked)
			files.push({
				name: file.name,
				bytes: new Uint8Array(await file.arrayBuffer()),
			});
	}

	const boards: Board[] = [];
	const sessions: SharedSession[] = [];
	const problems: string[] = [];
	for (const { name, bytes } of files) {
		try {
			const doc = readLibraryDocument(bytes);
			if (doc.kind === "session") sessions.push(doc);
			else boards.push(doc.board);
		} catch (error) {
			problems.push(`${name}: ${(error as Error).message}`);
		}
	}
	return { boards, sessions, problems };
}

/** A board or a session from a file's bytes, told apart by what's inside rather than the file name. */
export function readLibraryDocument(
	bytes: Uint8Array,
): { kind: "board"; board: Board } | ({ kind: "session" } & SharedSession) {
	const text = decodeDocumentText(bytes);
	let docType: unknown;
	try {
		docType = (JSON.parse(text) as { docType?: unknown })?.docType;
	} catch {
		docType = undefined;
	}
	return docType === "session"
		? { kind: "session", ...parseSharedSession(text) }
		: { kind: "board", board: parseBoard(text) };
}
