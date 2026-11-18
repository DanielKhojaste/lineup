import { DEFAULT_SIZES, INTERFACE_SCALES, MARKER_SCALES } from "../config/sizes";
import { useSyncExternalStore } from "react";
import { DEFAULT_PITCH, FieldVariant, isSport, Sport } from "../model/sports";
import { readSettingsFile, writeSettingsFile } from "../storage/settingsFile";
import { PitchSettings } from "../model/types";

/**
 * App preferences that belong to this computer rather than to a board: for
 * now, the sport (and full or half field) new boards start with.
 */
export interface Preferences {
	defaultPitch: PitchSettings;
	/**
	 * The player and equipment sizes new boards start with: the last ones the
	 * coach picked on a board (or in Settings).
	 */
	playerScale: number;
	equipmentScale: number;
	/**
	 * Whether the coach has picked a default sport (in Settings or "Use this
	 * for new boards"). Until then, new sessions ask which sport they're for.
	 */
	hasDefaultSport: boolean;
	/**
	 * The field each sport's new boards start on, when the coach ticked
	 * "Always start … boards on a …". With one for the default sport, New
	 * board skips straight to Create (and "Change" brings the steps back).
	 */
	fieldDefaults: Partial<Record<Sport, FieldVariant>>;
	/**
	 * Each kind of calendar item's colour ("#A66FE0"), when the coach picked
	 * one; otherwise the app's (practices in the theme's colour).
	 */
	calendarColors: Partial<Record<"session" | "match" | "event", string>>;
	/**
	 * The moving background picked for each theme that has them (theme id →
	 * effect, or "off"). A theme left out shows its first.
	 */
	themeEffect: Record<string, string>;
	/** How big the whole interface is drawn (1 = 100%). */
	interfaceScale: number;
	/** How Dune's spice looks: size, speed and amount, as multiples of normal. */
	spice: { size: number; speed: number; amount: number };
}

const STORAGE_KEY = "lineup.preferences";

/** One of the sizes boards use (S, M, L, XL), or the fallback. */
function sizeOr(value: unknown, fallback: number): number {
	return MARKER_SCALES.some((s) => s.value === value) ? (value as number) : fallback;
}
const DEFAULTS: Preferences = {
	defaultPitch: DEFAULT_PITCH,
	playerScale: DEFAULT_SIZES.players,
	equipmentScale: DEFAULT_SIZES.equipment,
	hasDefaultSport: false,
	fieldDefaults: {},
	calendarColors: {},
	themeEffect: {},
	interfaceScale: 1,
	spice: { size: 1, speed: 1, amount: 1 },
};

/** A multiple between min and max (1 when missing). */
function multiple(value: unknown, min: number, max: number): number {
	return typeof value === "number" && Number.isFinite(value)
		? Math.min(max, Math.max(min, value))
		: 1;
}

/** The moving backgrounds picked for each theme, from what was saved. */
function effectChoices(raw: Record<string, unknown> | null): Record<string, string> {
	const choices: Record<string, string> = {};
	const saved = raw?.themeEffect;
	if (saved && typeof saved === "object")
		for (const [theme, effect] of Object.entries(saved))
			if (typeof effect === "string" && effect.length < 40) choices[theme] = effect;
	// Before themes had a choice, there was one switch for Dune's spice.
	if (raw?.themeEffects === false && !("dune" in choices)) choices.dune = "off";
	return choices;
}

/** The field defaults that were saved; before they existed, the default sport's field. */
function fieldDefaultsFrom(raw: Record<string, any> | null): Partial<Record<Sport, FieldVariant>> {
	const out: Partial<Record<Sport, FieldVariant>> = {};
	const saved = raw?.fieldDefaults;
	if (saved && typeof saved === "object") {
		for (const [sport, variant] of Object.entries(saved))
			if (isSport(sport) && (variant === "full" || variant === "half")) out[sport] = variant;
	} else if (raw?.defaultPitch && isSport(raw.defaultPitch.sport)) {
		out[raw.defaultPitch.sport as Sport] = raw.defaultPitch.variant === "half" ? "half" : "full";
	}
	return out;
}

function read(): Preferences {
	try {
		return parse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"));
	} catch {
		return DEFAULTS;
	}
}

/** Preferences from what was saved (anything missing or wrong falls back to the default). */
function parse(raw: any): Preferences {
	try {
		const pitch = raw?.defaultPitch ?? {};
		return {
			defaultPitch: {
				sport: isSport(pitch.sport) ? pitch.sport : DEFAULTS.defaultPitch.sport,
				variant: pitch.variant === "half" ? "half" : "full",
			},
			hasDefaultSport: !!raw?.defaultPitch,
			fieldDefaults: fieldDefaultsFrom(raw),
			calendarColors: Object.fromEntries(
				Object.entries(raw?.calendarColors ?? {}).filter(
					([kind, color]) =>
						["session", "match", "event"].includes(kind) && typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
				),
			),
			themeEffect: effectChoices(raw),
			interfaceScale: (INTERFACE_SCALES as readonly number[]).includes(raw?.interfaceScale)
				? raw.interfaceScale
				: 1,
			spice: {
				size: multiple(raw?.spice?.size, 0.4, 3),
				speed: multiple(raw?.spice?.speed, 0.1, 4),
				amount: multiple(raw?.spice?.amount, 0.1, 3),
			},
			playerScale: sizeOr(raw?.playerScale, DEFAULTS.playerScale),
			equipmentScale: sizeOr(raw?.equipmentScale, DEFAULTS.equipmentScale),
		};
	} catch {
		return DEFAULTS;
	}
}

let current = read();
const listeners = new Set<() => void>();

export function getPreferences(): Preferences {
	return current;
}

export function setPreferences(patch: Partial<Preferences>) {
	current = {
		...current,
		...patch,
		// Setting a default sport anywhere counts as having picked one.
		...(patch.defaultPitch ? { hasDefaultSport: true } : {}),
	};
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
	} catch {
		// Storage can be unavailable; the preference still applies until restart.
	}
	writeSettingsFile(current);
	for (const listener of listeners) listener();
}

/**
 * In the desktop app: take the preferences from Lineup/settings.json (the
 * same for every build), or start that file from these. Called once at start.
 */
export async function syncPreferencesWithFile() {
	const saved = await readSettingsFile();
	if (saved && typeof saved === "object") {
		current = parse(saved);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
		} catch {
			// Fine: the file has them.
		}
		for (const listener of listeners) listener();
	} else {
		writeSettingsFile(current);
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
	return useSyncExternalStore(subscribe, getPreferences, getPreferences);
}
