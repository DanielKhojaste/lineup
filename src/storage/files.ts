import {
	decodeDocumentText,
	encodeBoardFile,
	FILE_EXTENSION,
	fileNameFor,
	parseBoard,
} from "../model/file";
import {
	encodeSessionFile,
	parseSession,
	Session,
	SESSION_EXTENSION,
	sessionTitle,
} from "../model/session";
import { Board } from "../model/types";
import { isTauri } from "./index";

/** Save a file somewhere the user picks (desktop) or download it (browser). Returns false if cancelled. */
async function saveFile(
	name: string,
	extension: string,
	label: string,
	data: string | Uint8Array,
	mimeType = "application/octet-stream",
): Promise<boolean> {
	if (isTauri()) {
		const { save } = await import("@tauri-apps/plugin-dialog");
		const { writeFile, writeTextFile } = await import("@tauri-apps/plugin-fs");
		const path = await save({
			defaultPath: name,
			filters: [{ name: label, extensions: [extension] }],
		});
		if (!path) return false;
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

export function exportSessionDocument(session: Session) {
	return saveFile(
		fileNameFor(sessionTitle(session), SESSION_EXTENSION),
		SESSION_EXTENSION,
		"Lineup session",
		encodeSessionFile(session),
	);
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
	sessions: Session[];
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
	const sessions: Session[] = [];
	const problems: string[] = [];
	for (const { name, bytes } of files) {
		try {
			const doc = readLibraryDocument(bytes);
			if (doc.kind === "session") sessions.push(doc.session);
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
): { kind: "board"; board: Board } | { kind: "session"; session: Session } {
	const text = decodeDocumentText(bytes);
	let docType: unknown;
	try {
		docType = (JSON.parse(text) as { docType?: unknown })?.docType;
	} catch {
		docType = undefined;
	}
	return docType === "session"
		? { kind: "session", session: parseSession(text) }
		: { kind: "board", board: parseBoard(text) };
}
