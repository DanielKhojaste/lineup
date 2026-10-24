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
}

export const THEME_PRESETS: ThemePreset[] = [
	{
		preset: "amber-night",
		name: "Amber Night",
		mode: "dark",
		accent: "#FDB20B",
		secondary: "#2C0055",
	},
	{
		preset: "amber-day",
		name: "Amber Day",
		mode: "light",
		accent: "#FDB20B",
		secondary: "#2C0055",
	},
	{
		preset: "lime-studio",
		name: "Lime Studio",
		mode: "dark",
		accent: "#C6F432",
		secondary: "#1E3A5F",
	},
	{
		preset: "violet",
		name: "Violet",
		mode: "dark",
		accent: "#7814FF",
		secondary: "#FDB20B",
	},
	{
		preset: "touchline",
		name: "Touchline",
		mode: "light",
		accent: "#1F7A4D",
		secondary: "#F28C28",
	},
];

export const DEFAULT_THEME: ThemeSettings = THEME_PRESETS[0];

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

/** Turn theme settings into CSS custom properties (without the leading `--`). */
export function themeTokens(settings: ThemeSettings): Record<string, string> {
	const base = BASE[settings.mode];
	const accent = normalizeHex(settings.accent);
	const secondary = normalizeHex(settings.secondary);
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
			settings.mode === "dark" ? 0.35 : 0.12,
		),
		"chip-bg":
			settings.mode === "dark" ? secondary : mix(surface, secondary, 0.12),
		"chip-text":
			settings.mode === "dark"
				? readableOn(secondary, "#F1E9FF")
				: towardsText(secondary),
		focus: accent,
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
