import { contrast, isHexColor, mix, normalizeHex, readableOn } from "./color";

export type ThemeMode = "dark" | "light";

export interface ThemeSettings {
	/** A preset id, or "custom" once the user has changed a colour. */
	preset: string;
	mode: ThemeMode;
	accent: string;
	secondary: string;
}

/** How tags and topics look: filled with the secondary, or a soft wash with a border in it. */
export type ChipStyle = "filled" | "outline";

export interface ThemePreset extends ThemeSettings {
	name: string;
	/** Colours set by hand in the theme's file, replacing the ones made from it. */
	tokens?: Record<string, string>;
	/** The same theme in the other mode (e.g. Amber Night and Amber Day). */
	pair?: string;
	chips?: ChipStyle;
	/** Something that moves behind the interface: "spice" is Dune's drifting spice. */
	effect?: ThemeEffect;
}

/** Effects a theme can have. */
export type ThemeEffect = "spice";

/** What a theme file holds: a file in `src/theme/presets/`, or a `.lineup-theme` file. */
export interface ThemeFile {
	name?: unknown;
	order?: unknown;
	mode?: unknown;
	accent?: unknown;
	secondary?: unknown;
	tokens?: unknown;
	pair?: unknown;
	chips?: unknown;
	effect?: unknown;
}

/** A theme from a file's contents, or null when the file doesn't hold one. */
export function themeFromFile(raw: ThemeFile, id: string): ThemePreset | null {
	if (
		!raw ||
		typeof raw !== "object" ||
		typeof raw.name !== "string" ||
		!raw.name.trim() ||
		typeof raw.accent !== "string" ||
		typeof raw.secondary !== "string" ||
		!isHexColor(raw.accent) ||
		!isHexColor(raw.secondary)
	)
		return null;
	const tokens: Record<string, string> = {};
	if (raw.tokens && typeof raw.tokens === "object")
		for (const [key, value] of Object.entries(raw.tokens))
			// Only plain colours: a theme file can't slip anything else into the CSS.
			if (typeof value === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i.test(value.trim()))
				tokens[key] = value.trim();
	return {
		preset: id,
		name: raw.name.trim().slice(0, 40),
		mode: raw.mode === "light" ? "light" : "dark",
		accent: normalizeHex(raw.accent),
		secondary: normalizeHex(raw.secondary),
		...(Object.keys(tokens).length ? { tokens } : {}),
		...(typeof raw.pair === "string" ? { pair: raw.pair } : {}),
		...(raw.chips === "outline" ? { chips: "outline" as const } : {}),
		...(raw.effect === "spice" ? { effect: "spice" as const } : {}),
	};
}

/** Turn the theme files into presets, in their `order`. A broken file is skipped. */
export function presetsFromFiles(
	files: Record<string, ThemeFile | { default: ThemeFile }>,
): ThemePreset[] {
	const presets: { order: number; preset: ThemePreset }[] = [];
	for (const [path, module] of Object.entries(files)) {
		const raw = ("default" in module ? module.default : module) as ThemeFile;
		const id = path.split("/").pop()!.replace(/\.json$/, "");
		const preset = themeFromFile(raw, id);
		if (preset)
			presets.push({ order: typeof raw.order === "number" ? raw.order : 999, preset });
	}
	return presets
		.sort((a, b) => a.order - b.order || a.preset.name.localeCompare(b.preset.name))
		.map((p) => p.preset);
}

/** The themes in `src/theme/presets/`, one file each. */
export const THEME_PRESETS: ThemePreset[] = presetsFromFiles(
	import.meta.glob<ThemeFile>("./presets/*.json", { eager: true, import: "default" }),
);

/** The preset with this id, if there is one. */
export function findPreset(id: string): ThemePreset | undefined {
	return THEME_PRESETS.find((p) => p.preset === id);
}

/**
 * The same theme in the other mode: the one its file names as `pair`, or one
 * with the same name (Violet dark and Violet light).
 */
export function pairOf(
	theme: ThemePreset,
	themes: ThemePreset[] = THEME_PRESETS,
): ThemePreset | undefined {
	const other = (t: ThemePreset) => t.mode !== theme.mode;
	return (
		(theme.pair ? themes.find((t) => t.preset === theme.pair && other(t)) : undefined) ??
		themes.find((t) => t.pair === theme.preset && other(t)) ??
		themes.find((t) => t.name === theme.name && other(t) && t.preset !== theme.preset)
	);
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
export function shownSecondary(
	secondary: string,
	mode: ThemeMode,
	surface = BASE[mode].surface,
): string {
	const color = normalizeHex(secondary);
	if (mode !== "dark") return color;
	for (let amount = 0; amount <= 0.8; amount += 0.05) {
		const lifted = amount === 0 ? color : mix(color, "#FFFFFF", amount);
		if (contrast(lifted, surface) >= 3) return lifted;
	}
	return mix(color, "#FFFFFF", 0.8);
}

/**
 * Turn theme settings into CSS custom properties (without the leading `--`).
 * `extras` are a theme file's own settings: hand-set `tokens` replace the
 * colours made here, and `chips` picks how tags and topics look.
 */
export function themeTokens(
	settings: ThemeSettings,
	extras: Pick<ThemePreset, "tokens" | "chips"> | undefined = settings.preset === "custom"
		? undefined
		: findPreset(settings.preset),
): Record<string, string> {
	// A theme file's own backgrounds and text (Dune's sand, say) come first, so
	// every colour made below is made from them.
	const base = { ...BASE[settings.mode] };
	for (const key of Object.keys(base))
		if (extras?.tokens?.[key] && isHexColor(extras.tokens[key]))
			base[key] = normalizeHex(extras.tokens[key]);
	const accent = normalizeHex(settings.accent);
	const surface = base.surface;
	const secondary = shownSecondary(settings.secondary, settings.mode, surface);
	const dark = settings.mode === "dark";

	// Text drawn in a theme colour (links, tabs, "Warm-up 1") must be easy to
	// read on panels: when the colour itself isn't (amber on white, a deep green
	// on dark), it's mixed towards the text colour until it is.
	const towardsText = (color: string, on = surface) => {
		for (let amount = 0; amount <= 1; amount += 0.1) {
			const mixed = amount === 0 ? color : mix(color, base.text, amount);
			if (contrast(mixed, on) >= 4.5) return mixed;
		}
		return base.text;
	};

	const outline = extras?.chips === "outline";
	const chipBg = outline
		? mix(surface, secondary, dark ? 0.22 : 0.1)
		: dark
			? secondary
			: mix(surface, secondary, 0.12);

	return {
		...base,
		accent,
		"on-accent": readableOn(accent),
		"accent-text": towardsText(accent),
		"accent-soft": mix(surface, accent, dark ? 0.16 : 0.14),
		secondary,
		"on-secondary": readableOn(secondary),
		"secondary-text": towardsText(secondary),
		"secondary-soft": mix(surface, secondary, dark ? 0.28 : 0.12),
		"chip-bg": chipBg,
		"chip-text": outline
			? base.text
			: dark
				? readableOn(secondary)
				: towardsText(secondary, chipBg),
		"chip-border": outline ? secondary : "transparent",
		focus: accent,
		...extras?.tokens,
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
