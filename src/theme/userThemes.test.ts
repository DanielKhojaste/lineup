import { describe, expect, it } from "vitest";
import { addUserTheme, findTheme, getUserThemes, parseThemeFile, removeUserTheme, themeFileText } from "./userThemes";

describe("your themes", () => {
	it("round-trips through a .lineup-theme file", () => {
		const theme = parseThemeFile(
			'{ "name": "Club", "mode": "light", "accent": "#c8102e", "secondary": "#00205B", "chips": "outline", "tokens": { "surface": "#FAFAFA", "bad": "url(x)" } }',
		);
		expect(theme).toMatchObject({ name: "Club", mode: "light", accent: "#C8102E", chips: "outline" });
		expect(theme.tokens).toEqual({ surface: "#FAFAFA" });
		const again = parseThemeFile(themeFileText({ ...theme, preset: "x" }));
		expect(again).toEqual(theme);
	});

	it("explains files that aren't themes", () => {
		expect(() => parseThemeFile("not json")).toThrow("isn't a Lineup theme file");
		expect(() => parseThemeFile('{"name":"No colours"}')).toThrow("missing its name or colours");
	});

	it("saves themes under names that aren't taken, and deletes them", () => {
		const a = addUserTheme({ name: "Amber Night", mode: "dark", accent: "#111111", secondary: "#222222" });
		expect(a.name).toBe("Amber Night 2");
		expect(a.preset.startsWith("user-")).toBe(true);
		expect(findTheme(a.preset)?.accent).toBe("#111111");
		removeUserTheme(a.preset);
		expect(getUserThemes()).toEqual([]);
	});
});

describe("renaming your themes", () => {
	it("renames, keeping names unique", async () => {
		const { renameUserTheme } = await import("./userThemes");
		const a = addUserTheme({ name: "Club", mode: "dark", accent: "#111111", secondary: "#222222" });
		const b = addUserTheme({ name: "Away kit", mode: "dark", accent: "#111111", secondary: "#222222" });
		expect(renameUserTheme(b.preset, "Club")?.name).toBe("Club 2");
		expect(renameUserTheme(a.preset, "Club")?.name).toBe("Club");
		removeUserTheme(a.preset);
		removeUserTheme(b.preset);
	});
});

describe("your themes as files", () => {
	it("names files after the theme, never twice the same, and keeps the id inside", async () => {
		const { themeFileName } = await import("../storage/themeFiles");
		expect(themeFileName("Club colours", new Set())).toBe("Club colours.lineup-theme");
		expect(themeFileName("Club colours", new Set(["club colours.lineup-theme"]))).toBe(
			"Club colours (2).lineup-theme",
		);
		expect(themeFileName("CON", new Set())).toBe("CON_.lineup-theme");
		const text = themeFileText(
			{ preset: "user-abc", name: "Club", mode: "dark", accent: "#111111", secondary: "#222222" },
			{ withId: true },
		);
		expect(JSON.parse(text).id).toBe("user-abc");
		// Shared files don't carry an id: importing one always makes a new theme.
		expect(JSON.parse(themeFileText({ preset: "user-abc", name: "Club", mode: "dark", accent: "#111111", secondary: "#222222" })).id).toBeUndefined();
	});
});
