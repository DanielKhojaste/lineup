import { isTauri } from "./index";

/**
 * Preferences in the desktop app are kept in the app's own data folder
 * (AppData\Roaming\<app>\Lineup\settings.json on Windows), as well as in the
 * window's storage. The window's storage isn't shared between `tauri dev`
 * and the installed app, so on its own a setting like the player size could
 * seem to reset; the app's data folder is the same for every build, and it's
 * internal (not among the coach's documents).
 *
 * The file is one small object with a version and when it last changed, so
 * a Lineup account can later sync it like the library.
 */
const FILE = "Lineup/settings.json";
const base = async () => (await import("@tauri-apps/plugin-fs")).BaseDirectory.AppData;

export async function readSettingsFile(): Promise<unknown | null> {
	if (!isTauri()) return null;
	try {
		const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
		const baseDir = await base();
		if (!(await exists(FILE, { baseDir }))) return null;
		const saved = JSON.parse(await readTextFile(FILE, { baseDir }));
		return saved?.preferences ?? saved;
	} catch {
		return null;
	}
}

let pending: ReturnType<typeof setTimeout> | null = null;

/** Write the preferences to the file (a moment after the last change). */
export function writeSettingsFile(data: unknown) {
	if (!isTauri()) return;
	if (pending) clearTimeout(pending);
	pending = setTimeout(async () => {
		pending = null;
		try {
			const { exists, mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
			const baseDir = await base();
			if (!(await exists("Lineup", { baseDir }))) await mkdir("Lineup", { baseDir, recursive: true });
			const file = { version: 1, updatedAt: new Date().toISOString(), preferences: data };
			await writeTextFile(FILE, JSON.stringify(file, null, "\t"), { baseDir });
		} catch {
			// The window's storage still has them.
		}
	}, 300);
}
