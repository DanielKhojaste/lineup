import { contrast, isHexColor, mix, normalizeHex, readableOn } from "./color";

export type ThemeMode = "dark" | "light";

export interface ThemeSettings {
	/** A preset id, or "custom" once the user has changed a colour. */
	preset: string;
	mode: ThemeMode;
	accent: string;
	secondary: string;
}

export interface ThemePreset extends ThemeSettings {
	name: string;
	/** Colours set by hand in the theme's file, replacing the ones made from it. */
	tokens?: Record<string, string>;
}

/** What a file in `src/theme/presets/` holds. */
interface PresetFile {
	name?: unknown;
	order?: unknown;
	mode?: unknown;
	accent?: unknown;
	secondary?: unknown;
	tokens?: unknown;
}

/** Turn the theme files into presets, in their `order`. A broken file is skipped. */
export function presetsFromFiles(
	files: Record<string, PresetFile | { default: PresetFile }>,
): ThemePreset[] {
	const presets: { order: number; preset: ThemePreset }[] = [];
	for (const [path, module] of Object.entries(files)) {
		const raw = ("default" in module ? module.default : module) as PresetFile;
		const id = path.split("/").pop()!.replace(/\.json$/, "");
		if (
			typeof raw.name !== "string" ||
			typeof raw.accent !== "string" ||
			typeof raw.secondary !== "string" ||
			!isHexColor(raw.accent) ||
			!isHexColor(raw.secondary)
		)
			continue;
		const tokens: Record<string, string> = {};
		if (raw.tokens && typeof raw.tokens === "object")
			for (const [key, value] of Object.entries(raw.tokens))
				if (typeof value === "string" && value.trim()) tokens[key] = value.trim();
		presets.push({
			order: typeof raw.order === "number" ? raw.order : 999,
			preset: {
				preset: id,
				name: raw.name,
				mode: raw.mode === "light" ? "light" : "dark",
				accent: normalizeHex(raw.accent),
				secondary: normalizeHex(raw.secondary),
				...(Object.keys(tokens).length ? { tokens } : {}),
			},
		});
	}
	return presets
		.sort((a, b) => a.order - b.order || a.preset.name.localeCompare(b.preset.name))
		.map((p) => p.preset);
}

/** The themes in `src/theme/presets/`, one file each. */
export const THEME_PRESETS: ThemePreset[] = presetsFromFiles(
	import.meta.glob<PresetFile>("./presets/*.json", { eager: true, import: "default" }),
);

/** The preset with this id, if there is one. */
export function findPreset(id: string): ThemePreset | undefined {
	return THEME_PRESETS.find((p) => p.preset === id);
}

const FALLBACK_THEME: ThemeSettings = {
	preset: "amber-night",
	mode: "dark",
	accent: "#FDB20B",
	secondary: "#2C0055",
};

export const DEFAULT_THEME: ThemeSettings = (() => {
	const first = findPreset("amber-night") ?? THEME_PRESETS[0];
	if (!first) return FALLBACK_THEME;
	const { preset, mode, accent, secondary } = first;
	return { preset, mode, accent, secondary };
})();

/** Neutral surfaces for each mode. Accent-derived tokens are added on top. */
const BASE: Record<ThemeMode, Record<string, string>> = {
	dark: {
		bg: "#111315",
		surface: "#16191C",
		sunken: "#0D0F11",
		raised: "#1F2328",
		hover: "#262B31",
		border: "#2A2F35",
		"border-strong": "#3A414A",
		text: "#E6E8EB",
		"text-muted": "#9AA3AD",
		"board-bg": "#0D0F11",
		danger: "#FF6B6B",
		shadow: "rgba(0, 0, 0, 0.45)",
	},
	light: {
		bg: "#F3F4F6",
		surface: "#FFFFFF",
		sunken: "#F5F6F8",
		raised: "#F1F3F5",
		hover: "#E9ECEF",
		border: "#DCE0E5",
		"border-strong": "#B8BFC7",
		text: "#16191C",
		"text-muted": "#5B6470",
		"board-bg": "#E6E9ED",
		danger: "#C62828",
		shadow: "rgba(22, 25, 28, 0.18)",
	},
};

/**
 * The secondary as it's shown. On a dark theme, a secondary too dark to see
 * against the panels (like a deep purple) is mixed with white until it reads;
 * light themes use it as it is.
 */
export function shownSecondary(secondary: string, mode: ThemeMode): string {
	const color = normalizeHex(secondary);
	if (mode !== "dark") return color;
	const surface = BASE.dark.surface;
	for (let amount = 0; amount <= 0.8; amount += 0.05) {
		const lifted = amount === 0 ? color : mix(color, "#FFFFFF", amount);
		if (contrast(lifted, surface) >= 3) return lifted;
	}
	return mix(color, "#FFFFFF", 0.8);
}

/**
 * Turn theme settings into CSS custom properties (without the leading `--`).
 * A preset's own `tokens` (from its file) replace the colours made here.
 */
export function themeTokens(
	settings: ThemeSettings,
	overrides: Record<string, string> | undefined = settings.preset === "custom"
		? undefined
		: findPreset(settings.preset)?.tokens,
): Record<string, string> {
	const base = BASE[settings.mode];
	const accent = normalizeHex(settings.accent);
	const secondary = shownSecondary(settings.secondary, settings.mode);
	const surface = base.surface;

	// Text drawn in the accent colour must stay readable on panels; when it
	// would not be (e.g. amber on white), fall back to a darker/lighter mix.
	const towardsText = (color: string) => {
		if (contrast(color, surface) >= 3) return color;
		const mixed = mix(color, base.text, 0.45);
		return contrast(mixed, surface) >= 3 ? mixed : base.text;
	};

	return {
		...base,
		accent,
		"on-accent": readableOn(accent),
		"accent-text": towardsText(accent),
		"accent-soft": mix(surface, accent, settings.mode === "dark" ? 0.16 : 0.14),
		secondary,
		"on-secondary": readableOn(secondary),
		"secondary-text": towardsText(secondary),
		"secondary-soft": mix(
			surface,
			secondary,
			settings.mode === "dark" ? 0.28 : 0.12,
		),
		"chip-bg":
			settings.mode === "dark" ? secondary : mix(surface, secondary, 0.12),
		"chip-text":
			settings.mode === "dark" ? readableOn(secondary) : towardsText(secondary),
		focus: accent,
		...overrides,
	};
}

export function sanitizeTheme(value: unknown): ThemeSettings {
	if (!value || typeof value !== "object") return DEFAULT_THEME;
	const v = value as Partial<ThemeSettings>;
	const mode: ThemeMode = v.mode === "light" ? "light" : "dark";
	const accent =
		typeof v.accent === "string" && isHexColor(v.accent)
			? normalizeHex(v.accent)
			: DEFAULT_THEME.accent;
	const secondary =
		typeof v.secondary === "string" && isHexColor(v.secondary)
			? normalizeHex(v.secondary)
			: DEFAULT_THEME.secondary;
	const preset = typeof v.preset === "string" ? v.preset : "custom";
	return { preset, mode, accent, secondary };
}
