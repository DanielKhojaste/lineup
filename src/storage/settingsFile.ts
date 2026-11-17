import { isTauri } from "./index";

/**
 * Preferences in the desktop app are kept in Lineup/settings.json, next to
 * the library, as well as in the window's storage. The window's storage
 * isn't shared between `tauri dev` and the installed app (or kept after a
 * reinstall), so on its own a setting like the player size could seem to
 * reset; the file is the same for every build.
 */
const FILE = "Lineup/settings.json";

export async function readSettingsFile(): Promise<unknown | null> {
	if (!isTauri()) return null;
	try {
		const [{ exists, readTextFile }, { chooseBase }] = await Promise.all([
			import("@tauri-apps/plugin-fs"),
			import("./tauri"),
		]);
		const { baseDir } = await chooseBase();
		if (!(await exists(FILE, { baseDir }))) return null;
		return JSON.parse(await readTextFile(FILE, { baseDir }));
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
			const [{ exists, mkdir, writeTextFile }, { chooseBase }] = await Promise.all([
				import("@tauri-apps/plugin-fs"),
				import("./tauri"),
			]);
			const { baseDir } = await chooseBase();
			if (!(await exists("Lineup", { baseDir }))) await mkdir("Lineup", { baseDir, recursive: true });
			await writeTextFile(FILE, JSON.stringify(data, null, "\t"), { baseDir });
		} catch {
			// The window's storage still has them.
		}
	}, 300);
}
