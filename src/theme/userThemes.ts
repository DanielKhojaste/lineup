import { useSyncExternalStore } from "react";
import { findPreset, ThemeFile, themeFromFile, ThemePreset, THEME_PRESETS } from "./themes";

/**
 * Themes the coach saved or imported ("Your themes" in Settings), kept on this
 * computer. Their ids start with "user-" so they never clash with Lineup's own.
 */

const STORAGE_KEY = "lineup.userThemes";
export const THEME_EXTENSION = "lineup-theme";

function read(): ThemePreset[] {
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		if (!Array.isArray(raw)) return [];
		return raw
			.map((t) =>
				typeof t?.preset === "string" && t.preset.startsWith("user-")
					? themeFromFile(t, t.preset)
					: null,
			)
			.filter((t): t is ThemePreset => !!t);
	} catch {
		return [];
	}
}

let current = read();
const listeners = new Set<() => void>();

function write(next: ThemePreset[]) {
	current = next;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Storage can be unavailable; the themes still work until restart.
	}
	for (const listener of listeners) listener();
}

export function getUserThemes(): ThemePreset[] {
	return current;
}

export function useUserThemes(): ThemePreset[] {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		getUserThemes,
		getUserThemes,
	);
}

/** A name that isn't taken yet: "My theme", "My theme 2"… */
function freeName(name: string, except?: string): string {
	const taken = new Set(
		[...THEME_PRESETS, ...current]
			.filter((t) => t.preset !== except)
			.map((t) => `${t.name.toLowerCase()}|`),
	);
	const base = name.trim() || "My theme";
	if (!taken.has(`${base.toLowerCase()}|`)) return base;
	for (let n = 2; ; n++)
		if (!taken.has(`${base.toLowerCase()} ${n}|`)) return `${base} ${n}`;
}

/** Save a theme under a name; returns it with its new id. */
export function addUserTheme(theme: Omit<ThemePreset, "preset">): ThemePreset {
	const saved: ThemePreset = {
		...theme,
		name: freeName(theme.name),
		preset: `user-${crypto.randomUUID().slice(0, 8)}`,
	};
	// A pair only makes sense between Lineup's own themes.
	delete saved.pair;
	write([...current, saved]);
	return saved;
}

/** Give one of your themes a new name (made unique, like when saving). */
export function renameUserTheme(id: string, name: string): ThemePreset | undefined {
	const theme = current.find((t) => t.preset === id);
	if (!theme || !name.trim()) return theme;
	const renamed = { ...theme, name: freeName(name.trim().slice(0, 40), id) };
	write(current.map((t) => (t.preset === id ? renamed : t)));
	return renamed;
}

export function removeUserTheme(id: string) {
	write(current.filter((t) => t.preset !== id));
}

/** Any theme by id: Lineup's own, or one of yours. */
export function findTheme(id: string): ThemePreset | undefined {
	return findPreset(id) ?? current.find((t) => t.preset === id);
}

/** The text of a `.lineup-theme` file: plain JSON, so it can be read and edited by hand. */
export function themeFileText(theme: ThemePreset): string {
	const file: Record<string, unknown> = {
		lineupTheme: 1,
		name: theme.name,
		mode: theme.mode,
		accent: theme.accent,
		secondary: theme.secondary,
	};
	if (theme.chips) file.chips = theme.chips;
	if (theme.tokens) file.tokens = theme.tokens;
	return `${JSON.stringify(file, null, "\t")}\n`;
}

/** A theme from a `.lineup-theme` file's text. Throws a message a coach can read when it isn't one. */
export function parseThemeFile(text: string): Omit<ThemePreset, "preset"> {
	let raw: unknown;
	try {
		raw = JSON.parse(text.replace(/^﻿/, ""));
	} catch {
		throw new Error("This isn't a Lineup theme file.");
	}
	const theme = themeFromFile(raw as ThemeFile, "imported");
	if (!theme)
		throw new Error(
			"This theme file is missing its name or colours, or they aren't written like #13D6B9.",
		);
	const { preset: _id, ...rest } = theme;
	return rest;
}
