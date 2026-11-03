import { useSyncExternalStore } from "react";
import { DEFAULT_PITCH, isSport } from "../model/sports";
import { PitchSettings } from "../model/types";

/**
 * App preferences that belong to this computer rather than to a board: for
 * now, the sport (and full or half field) new boards start with.
 */
export interface Preferences {
	defaultPitch: PitchSettings;
	/**
	 * Whether the coach has picked a default sport (in Settings or "Use this
	 * for new boards"). Until then, new sessions ask which sport they're for.
	 */
	hasDefaultSport: boolean;
}

const STORAGE_KEY = "lineup.preferences";
const DEFAULTS: Preferences = {
	defaultPitch: DEFAULT_PITCH,
	hasDefaultSport: false,
};

function read(): Preferences {
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		const pitch = raw?.defaultPitch ?? {};
		return {
			defaultPitch: {
				sport: isSport(pitch.sport) ? pitch.sport : DEFAULTS.defaultPitch.sport,
				variant: pitch.variant === "half" ? "half" : "full",
			},
			hasDefaultSport: !!raw?.defaultPitch,
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
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
	return useSyncExternalStore(subscribe, getPreferences, getPreferences);
}
