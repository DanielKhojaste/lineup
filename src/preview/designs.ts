import { useSyncExternalStore } from "react";

/**
 * Designs to compare on the preview branch (updates-403). Each choice is
 * remembered, set on the page's root element as data-design-<key> (for the
 * ones done in CSS), and read with usePreviewChoice (for the rest). Once
 * Daniel picks, the winners move into the app and this goes.
 */
export const PREVIEW_CHOICES = {
	summary: {
		label: "Session summary (print and export)",
		options: [
			["new", "B · Time with the team, Duration and Time per block"],
			["current", "A · As in v0.9.0"],
		],
	},
} as const;

export type PreviewKey = keyof typeof PREVIEW_CHOICES;
type Choice<K extends PreviewKey> = (typeof PREVIEW_CHOICES)[K]["options"][number][0];

const storageKey = (key: PreviewKey) => `lineup.preview.${key}`;
const listeners = new Set<() => void>();

export function getPreviewChoice<K extends PreviewKey>(key: K): Choice<K> {
	const options = PREVIEW_CHOICES[key].options.map(([id]) => id) as string[];
	try {
		const saved = localStorage.getItem(storageKey(key));
		if (saved && options.includes(saved)) return saved as Choice<K>;
	} catch {
		// Not remembered; the first design.
	}
	return options[0] as Choice<K>;
}

export function setPreviewChoice(key: PreviewKey, value: string) {
	try {
		localStorage.setItem(storageKey(key), value);
	} catch {
		// Only for now.
	}
	applyPreviewChoices();
	listeners.forEach((l) => l());
}

/** Put every choice on the root element, for the designs done in CSS. */
export function applyPreviewChoices() {
	for (const key of Object.keys(PREVIEW_CHOICES) as PreviewKey[])
		document.documentElement.setAttribute(`data-design-${key}`, getPreviewChoice(key));
}

export function usePreviewChoice<K extends PreviewKey>(key: K): Choice<K> {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => getPreviewChoice(key),
	);
}
