import { describe, expect, it } from "vitest";
import { contrast, mix, normalizeHex, readableOn } from "./color";
import {
	DEFAULT_THEME,
	presetsFromFiles,
	sanitizeTheme,
	shownSecondary,
	THEME_PRESETS,
	themeTokens,
} from "./themes";

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
				contrast(t["chip-text"], t["chip-bg"]),
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
			"lime-studio",
			"violet",
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
		expect(themeTokens(presets[0], presets[0].tokens).surface).toBe("#101010");
	});

	it("lifts a secondary too dark to see in dark mode, and leaves light mode alone", () => {
		const t = themeTokens({ ...DEFAULT_THEME, mode: "dark" });
		expect(t.secondary).not.toBe("#2C0055");
		expect(contrast(t.secondary, t.surface)).toBeGreaterThanOrEqual(3);
		expect(contrast(t["chip-text"], t["chip-bg"])).toBeGreaterThanOrEqual(4.5);
		expect(shownSecondary("#2C0055", "light")).toBe("#2C0055");
		// Already light enough: kept as it is.
		expect(shownSecondary("#FDB20B", "dark")).toBe("#FDB20B");
	});
});
