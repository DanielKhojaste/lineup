import { fileNameFor } from "../model/file";

/**
 * Your themes as files in the library folder (Documents/Lineup/themes), one
 * `.lineup-theme` file each, so they're backed up with the boards and can be
 * shared or edited by hand. Desktop app only; in a browser they stay in the
 * browser's storage.
 */

const DIR = "Lineup/themes";
const EXTENSION = "lineup-theme";

async function fs() {
	const [{ chooseBase }, plugin] = await Promise.all([
		import("./tauri"),
		import("@tauri-apps/plugin-fs"),
	]);
	const { baseDir } = await chooseBase();
	const options = { baseDir };
	if (!(await plugin.exists(DIR, options)))
		await plugin.mkdir(DIR, { ...options, recursive: true });
	return { ...plugin, options };
}

/** A file name for a theme that isn't taken by another theme's file. */
export function themeFileName(name: string, taken: Set<string>): string {
	const first = fileNameFor(name, EXTENSION, "My theme");
	const base = first.slice(0, -(EXTENSION.length + 1));
	let file = first;
	for (let n = 2; taken.has(file.toLowerCase()); n++) file = `${base} (${n}).${EXTENSION}`;
	return file;
}

/** Every theme file in the folder: its name and text. Files that can't be read are skipped. */
export async function readThemeFiles(): Promise<{ file: string; text: string }[]> {
	const { readDir, readTextFile, options } = await fs();
	const entries = await readDir(DIR, options);
	const files: { file: string; text: string }[] = [];
	for (const entry of entries) {
		if (!entry.isFile || !entry.name.toLowerCase().endsWith(`.${EXTENSION}`)) continue;
		try {
			files.push({ file: entry.name, text: await readTextFile(`${DIR}/${entry.name}`, options) });
		} catch (error) {
			console.error(`Couldn't read the theme ${entry.name}`, error);
		}
	}
	return files;
}

export async function writeThemeFile(file: string, text: string) {
	const { writeTextFile, options } = await fs();
	await writeTextFile(`${DIR}/${file}`, text, options);
}

export async function removeThemeFile(file: string) {
	const { exists, remove, options } = await fs();
	const path = `${DIR}/${file}`;
	if (await exists(path, options)) await remove(path, options);
}
