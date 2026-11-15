import { describe, expect, it } from "vitest";
import { contrast, mix, normalizeHex, readableOn } from "./color";
import {
	chosenEffect,
	DEFAULT_THEME,
	presetsFromFiles,
	sanitizeTheme,
	shownSecondary,
	THEME_PRESETS,
	themeFromFile,
	themeTokens,
} from "./themes";


/** A chip's background as it looks on a panel: see-through colours (rgba) are mixed over the surface. */
function chipBg(t: Record<string, string>): string {
	const m = t["chip-bg"].match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/);
	if (!m) return t["chip-bg"];
	const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
	const s = t.surface.replace("#", "");
	const over = (c: number, i: number) =>
		Math.round(c * a + parseInt(s.slice(i, i + 2), 16) * (1 - a))
			.toString(16)
			.padStart(2, "0");
	return `#${over(r, 0)}${over(g, 2)}${over(b, 4)}`;
}

describe("colour helpers", () => {
	it("normalises hex colours", () => {
		expect(normalizeHex("fdb")).toBe("#FFDDBB");
		expect(normalizeHex("#7814ff")).toBe("#7814FF");
	});

	it("picks readable text", () => {
		expect(readableOn("#FDB20B")).toBe("#121417");
		expect(readableOn("#2C0055")).toBe("#FFFFFF");
		expect(readableOn("#7814FF")).toBe("#FFFFFF");
	});

	it("mixes colours", () => {
		expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
	});
});

describe("themes", () => {
	it("defaults to dark mode with the amber accent", () => {
		expect(DEFAULT_THEME).toMatchObject({
			mode: "dark",
			accent: "#FDB20B",
			secondary: "#2C0055",
		});
	});

	it("keeps text on the accent and accent-coloured text readable in every preset", () => {
		for (const preset of THEME_PRESETS) {
			const t = themeTokens(preset);
			expect(
				contrast(t["on-accent"], t.accent),
				preset.name,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrast(t["accent-text"], t.surface),
				preset.name,
			).toBeGreaterThanOrEqual(3);
			expect(
				contrast(t["chip-text"], chipBg(t)),
				preset.name,
			).toBeGreaterThanOrEqual(4.5);
			expect(contrast(t.text, t.surface), preset.name).toBeGreaterThanOrEqual(
				7,
			);
			expect(
				contrast(t["text-muted"], t.surface),
				preset.name,
			).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("keeps custom colours readable too", () => {
		const t = themeTokens({
			preset: "custom",
			mode: "light",
			accent: "#FFFF00",
			secondary: "#FFFFFF",
		});
		expect(contrast(t["accent-text"], t.surface)).toBeGreaterThanOrEqual(3);
	});

	it("sanitises stored settings", () => {
		expect(sanitizeTheme(null)).toEqual(DEFAULT_THEME);
		expect(
			sanitizeTheme({ mode: "light", accent: "nope", secondary: "abc" }),
		).toEqual({
			preset: "custom",
			mode: "light",
			accent: DEFAULT_THEME.accent,
			secondary: "#AABBCC",
		});
	});
});

describe("theme files", () => {
	it("reads every preset file, in order", () => {
		expect(THEME_PRESETS.map((p) => p.preset)).toEqual([
			"amber-night",
			"amber-day",
			"dune",
			"dune-sand",
			"fremen",
			"giedi-prime",
			"lime-studio",
			"touchline",
		]);
	});

	it("skips broken files and keeps hand-set tokens", () => {
		const presets = presetsFromFiles({
			"./presets/b.json": { name: "B", order: 2, mode: "light", accent: "#111111", secondary: "#222222" },
			"./presets/a.json": {
				name: "A",
				order: 1,
				mode: "dark",
				accent: "#abc",
				secondary: "#333333",
				tokens: { surface: "#101010", nothing: 3 },
			},
			"./presets/broken.json": { name: "Broken", accent: "red", secondary: "#333333" },
		});
		expect(presets.map((p) => p.preset)).toEqual(["a", "b"]);
		expect(presets[0]).toMatchObject({ accent: "#AABBCC", tokens: { surface: "#101010" } });
		expect(themeTokens(presets[0], presets[0]).surface).toBe("#101010");
	});

	it("lifts a secondary too dark to see in dark mode, and leaves light mode alone", () => {
		const t = themeTokens({ ...DEFAULT_THEME, mode: "dark" });
		expect(t.secondary).not.toBe("#2C0055");
		expect(contrast(t.secondary, t.surface)).toBeGreaterThanOrEqual(3);
		expect(contrast(t["chip-text"], chipBg(t))).toBeGreaterThanOrEqual(4.5);
		expect(shownSecondary("#2C0055", "light")).toBe("#2C0055");
		// Already light enough: kept as it is.
		expect(shownSecondary("#FDB20B", "dark")).toBe("#FDB20B");
	});
});

describe("theme pairs, chips and readable text", () => {
	it("pairs each theme with its other mode", async () => {
		const { pairOf, findPreset } = await import("./themes");
		expect(pairOf(findPreset("amber-night")!)?.preset).toBe("amber-day");
		expect(pairOf(findPreset("touchline")!)).toBeUndefined();
		expect(pairOf(findPreset("dune")!)).toBeUndefined();
		expect(pairOf(findPreset("lime-studio")!)).toBeUndefined();
	});

	it("keeps text in theme colours easy to read in every theme", () => {
		for (const preset of THEME_PRESETS) {
			const t = themeTokens(preset);
			expect(contrast(t["accent-text"], t.surface)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(t["chip-text"], chipBg(t))).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("outline chips get a border in the secondary and a soft wash", () => {
		const t = themeTokens({ ...DEFAULT_THEME }, { chips: "outline" });
		expect(t["chip-border"]).toBe(t.secondary);
		expect(t["chip-text"]).toBe(t.text);
		expect(themeTokens({ ...DEFAULT_THEME }, {})["chip-border"]).toBe("transparent");
	});
});

describe("themes with their own backgrounds", () => {
	it("makes every colour from the theme's own surface (Dune's sand)", async () => {
		const { findPreset } = await import("./themes");
		const dune = findPreset("dune")!;
		const t = themeTokens(dune, dune);
		expect(t.surface).toBe("#23170E");
		expect(t.bg).toBe("#1A110A");
		expect(contrast(t["accent-text"], t.surface)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(t.text, t.surface)).toBeGreaterThanOrEqual(7);
	});

	it("keeps Lagoon out of the list", () => {
		expect(THEME_PRESETS.some((p) => p.name === "Lagoon")).toBe(false);
	});
});

describe("Amber Night's see-through topics", () => {
	it("uses a see-through purple with a bright border, and only in Amber Night", async () => {
		const { findPreset } = await import("./themes");
		const night = themeTokens(findPreset("amber-night")!);
		expect(night["chip-bg"]).toMatch(/^rgba\(/);
		expect(night["chip-border"]).toBe("#9E80C8");
		const day = themeTokens(findPreset("amber-day")!);
		expect(day["chip-bg"]).toMatch(/^#/);
	});
});

describe("moving backgrounds", () => {
	const theme = (id: string) => THEME_PRESETS.find((p) => p.preset === id)!;

	it("come with Dune and Fremen", () => {
		expect(theme("dune").effects).toEqual(["spice"]);
		expect(theme("fremen").effects).toEqual(["desert-night"]);
		expect(theme("dune-sand").effects).toBeUndefined();
		expect(theme("giedi-prime").effects).toBeUndefined();
	});

	it("show the one picked for a theme, its first by default, or none", () => {
		expect(chosenEffect(theme("fremen"), {})).toBe("desert-night");
		expect(chosenEffect(theme("fremen"), { fremen: "off" })).toBeNull();
		// A choice the theme doesn't have (a file was edited) falls back to its first.
		expect(chosenEffect(theme("fremen"), { fremen: "spice" })).toBe("desert-night");
		expect(chosenEffect({ preset: "x", effects: ["spice", "desert-night"] }, { x: "desert-night" })).toBe(
			"desert-night",
		);
		expect(chosenEffect(theme("amber-night"), {})).toBeNull();
	});

	it("read from theme files, old and new, ignoring unknown ones", () => {
		const file = { name: "X", accent: "#111111", secondary: "#222222" };
		expect(themeFromFile({ ...file, effect: "spice" }, "x")?.effects).toEqual(["spice"]);
		expect(
			themeFromFile({ ...file, effects: ["desert-night", "lasers", "desert-night"] }, "x")?.effects,
		).toEqual(["desert-night"]);
		expect(themeFromFile({ ...file, effects: ["lasers"] }, "x")?.effects).toBeUndefined();
	});
});
