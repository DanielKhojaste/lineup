import {
	FILE_EXTENSION,
	fileNameFor,
	parseBoard,
	serializeBoard,
} from "../model/file";
import { Board } from "../model/types";
import { isTauri } from "./index";

/** Save a file somewhere the user picks (desktop) or download it (browser). Returns false if cancelled. */
async function saveFile(
	name: string,
	extension: string,
	label: string,
	data: string | Uint8Array,
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

	const blob = new Blob([data as BlobPart], {
		type: typeof data === "string" ? "application/json" : "image/png",
	});
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
		serializeBoard(board),
	);
}

export function exportPng(board: Board, png: Uint8Array) {
	return saveFile(
		fileNameFor(board.meta.title, "png"),
		"png",
		"PNG image",
		png,
	);
}

/** Let the user pick .lineup files and read them. Files that fail to open are reported, not thrown. */
export async function pickBoardFiles(): Promise<{
	boards: Board[];
	problems: string[];
}> {
	const texts: { name: string; text: string }[] = [];

	if (isTauri()) {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const { readTextFile } = await import("@tauri-apps/plugin-fs");
		const picked = await open({
			multiple: true,
			filters: [{ name: "Lineup board", extensions: [FILE_EXTENSION] }],
		});
		const paths =
			picked === null ? [] : Array.isArray(picked) ? picked : [picked];
		for (const path of paths)
			texts.push({
				name: path.split(/[\\/]/).pop() ?? path,
				text: await readTextFile(path),
			});
	} else {
		const files = await new Promise<File[]>((resolve) => {
			const input = document.createElement("input");
			input.type = "file";
			input.multiple = true;
			input.accept = `.${FILE_EXTENSION},application/json`;
			input.onchange = () => resolve([...(input.files ?? [])]);
			input.click();
		});
		for (const file of files)
			texts.push({ name: file.name, text: await file.text() });
	}

	const boards: Board[] = [];
	const problems: string[] = [];
	for (const { name, text } of texts) {
		try {
			boards.push(parseBoard(text));
		} catch (error) {
			problems.push(`${name}: ${(error as Error).message}`);
		}
	}
	return { boards, problems };
}
