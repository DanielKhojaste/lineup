import { useSyncExternalStore } from "react";
import { findPreset, ThemeFile, themeFromFile, ThemePreset, THEME_PRESETS } from "./themes";

/**
 * Themes the coach saved or imported ("Your themes" in Settings). Their ids
 * start with "user-" so they never clash with Lineup's own.
 *
 * In the desktop app each one is a `.lineup-theme` file in
 * Documents/Lineup/themes, next to the boards (see `storage/themeFiles.ts`);
 * the browser's storage keeps a copy so the theme in use is there straight
 * away when the app starts. In a browser, that copy is all there is.
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

/** Which file each theme is in (desktop app only). */
const fileOf = new Map<string, string>();
let filesReady = false;

function isDesktop(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Write a theme's file, renaming it when its name changed. Problems are logged, not shown. */
async function saveFile(theme: ThemePreset) {
	if (!isDesktop() || !filesReady) return;
	const files = await import("../storage/themeFiles");
	const old = fileOf.get(theme.preset);
	const taken = new Set(
		[...fileOf.entries()].filter(([id]) => id !== theme.preset).map(([, f]) => f.toLowerCase()),
	);
	const file = files.themeFileName(theme.name, taken);
	try {
		await files.writeThemeFile(file, themeFileText(theme, { withId: true }));
		fileOf.set(theme.preset, file);
		if (old && old !== file) await files.removeThemeFile(old);
	} catch (error) {
		console.error(`Couldn't save the theme "${theme.name}"`, error);
	}
}

async function removeFile(id: string) {
	const file = fileOf.get(id);
	fileOf.delete(id);
	if (!isDesktop() || !file) return;
	try {
		const files = await import("../storage/themeFiles");
		await files.removeThemeFile(file);
	} catch (error) {
		console.error("Couldn't delete the theme's file", error);
	}
}

/**
 * Read your themes from Documents/Lineup/themes when the app starts. Themes
 * only in the browser's storage (from before themes were files) are written
 * to the folder, so nothing is lost; themes added or edited by hand in the
 * folder show up too.
 */
export async function loadUserThemeFiles(): Promise<void> {
	if (!isDesktop() || filesReady) return;
	try {
		const files = await import("../storage/themeFiles");
		const found: ThemePreset[] = [];
		const seen = new Set<string>();
		for (const { file, text } of await files.readThemeFiles()) {
			try {
				const raw = JSON.parse(text.replace(/^\uFEFF/, "")) as ThemeFile & { id?: unknown };
				// A file without an id (copied in by hand) gets one from its name.
				let id =
					typeof raw.id === "string" && raw.id.startsWith("user-")
						? raw.id
						: `user-${file.replace(/\.lineup-theme$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
				if (seen.has(id)) id = `${id}-${seen.size}`;
				const theme = themeFromFile(raw, id);
				if (!theme) continue;
				delete theme.pair;
				seen.add(id);
				fileOf.set(id, file);
				found.push(theme);
			} catch (error) {
				console.error(`Skipped the theme file ${file}`, error);
			}
		}
		filesReady = true;
		// Themes saved before they were files: write them into the folder.
		const missing = current.filter((t) => !seen.has(t.preset));
		for (const theme of missing) await saveFile(theme);
		write([...found, ...missing]);
	} catch (error) {
		console.error("Couldn't open the themes folder", error);
	}
}

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
	void saveFile(saved);
	return saved;
}

/** Give one of your themes a new name (made unique, like when saving). */
export function renameUserTheme(id: string, name: string): ThemePreset | undefined {
	const theme = current.find((t) => t.preset === id);
	if (!theme || !name.trim()) return theme;
	const renamed = { ...theme, name: freeName(name.trim().slice(0, 40), id) };
	write(current.map((t) => (t.preset === id ? renamed : t)));
	void saveFile(renamed);
	return renamed;
}

export function removeUserTheme(id: string) {
	write(current.filter((t) => t.preset !== id));
	void removeFile(id);
}

/** Any theme by id: Lineup's own, or one of yours. */
export function findTheme(id: string): ThemePreset | undefined {
	return findPreset(id) ?? current.find((t) => t.preset === id);
}

/** The text of a `.lineup-theme` file: plain JSON, so it can be read and edited by hand. */
export function themeFileText(
	theme: ThemePreset,
	{ withId = false }: { withId?: boolean } = {},
): string {
	const file: Record<string, unknown> = {
		lineupTheme: 1,
		// Files in the library folder keep their id, so the theme in use is found again.
		...(withId ? { id: theme.preset } : {}),
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
