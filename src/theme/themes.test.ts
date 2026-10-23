import { describe, expect, it } from "vitest";
import { contrast, mix, normalizeHex, readableOn } from "./color";
import {
	DEFAULT_THEME,
	sanitizeTheme,
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
