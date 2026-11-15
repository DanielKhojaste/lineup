import { ThemeEffect, ThemePreset, themeTokens } from "../themes";
import desertNight from "./desertNight";
import spice from "./spice";
import { EffectColours, EffectFactory } from "./types";

/** Every moving background: its name in Settings, and how it's drawn. */
export const EFFECTS: Record<ThemeEffect, { label: string; make: EffectFactory }> = {
	spice: { label: "Drifting spice", make: spice },
	"desert-night": { label: "Desert night", make: desertNight },
};

export { DEFAULT_SPICE } from "./spice";
export type { EffectColours, SpiceSettings } from "./types";

/** The colours a theme's moving background is drawn in. */
export function effectColours(theme: ThemePreset): EffectColours {
	const tokens = themeTokens(theme, theme);
	return {
		accent: theme.accent,
		secondary: theme.secondary,
		bg: tokens.bg,
		surface: tokens.surface,
		text: tokens.text,
	};
}
