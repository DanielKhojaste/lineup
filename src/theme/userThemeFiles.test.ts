import { beforeAll, describe, expect, it, vi } from "vitest";

// A pretend Documents/Lineup/themes folder.
const folder = new Map<string, string>();
vi.mock("../storage/themeFiles", async () => {
	const real = await vi.importActual<typeof import("../storage/themeFiles")>("../storage/themeFiles");
	return {
		themeFileName: real.themeFileName,
		readThemeFiles: async () => [...folder].map(([file, text]) => ({ file, text })),
		writeThemeFile: async (file: string, text: string) => void folder.set(file, text),
		removeThemeFile: async (file: string) => void folder.delete(file),
	};
});

describe("your themes in the themes folder (desktop app)", () => {
	beforeAll(() => {
		// The desktop app, with a theme saved before themes were files.
		(globalThis as Record<string, unknown>).window = { __TAURI_INTERNALS__: {} };
		const store = new Map<string, string>();
		(globalThis as Record<string, unknown>).localStorage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v),
			removeItem: (k: string) => void store.delete(k),
		};
		localStorage.setItem(
			"lineup.userThemes",
			JSON.stringify([{ preset: "user-old", name: "Old one", mode: "dark", accent: "#111111", secondary: "#222222" }]),
		);
		// One added by hand, without an id.
		folder.set(
			"By hand.lineup-theme",
			JSON.stringify({ name: "By hand", mode: "light", accent: "#C8102E", secondary: "#00205B" }),
		);
	});

	it("moves old themes into the folder, reads hand-made ones, and keeps files in step", async () => {
		const themes = await import("./userThemes");
		await themes.loadUserThemeFiles();
		const names = themes.getUserThemes().map((t) => t.name).sort();
		expect(names).toEqual(["By hand", "Old one"]);
		expect([...folder.keys()].sort()).toEqual(["By hand.lineup-theme", "Old one.lineup-theme"]);
		expect(JSON.parse(folder.get("Old one.lineup-theme")!).id).toBe("user-old");

		const added = themes.addUserTheme({ name: "Club", mode: "dark", accent: "#123456", secondary: "#654321" });
		await vi.waitFor(() => expect(folder.has("Club.lineup-theme")).toBe(true));
		themes.renameUserTheme(added.preset, "Club colours");
		await vi.waitFor(() => expect(folder.has("Club colours.lineup-theme")).toBe(true));
		expect(folder.has("Club.lineup-theme")).toBe(false);
		themes.removeUserTheme(added.preset);
		await vi.waitFor(() => expect(folder.has("Club colours.lineup-theme")).toBe(false));
	});
});
