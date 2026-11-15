import { ThemeEffect, ThemePreset, themeTokens } from "../themes";
import arenaRed from "./arenaRed";
import blackFireworks from "./blackFireworks";
import blackSun from "./blackSun";
import desertNight from "./desertNight";
import infrared from "./infrared";
import spice from "./spice";
import thumper from "./thumper";
import { EffectColours, EffectFactory } from "./types";
import waterDrops from "./waterDrops";
import waterOfLife from "./waterOfLife";
import wormSign from "./wormSign";

/** Every moving background: its name in Settings, and how it's drawn. */
export const EFFECTS: Record<ThemeEffect, { label: string; make: EffectFactory }> = {
	spice: { label: "Drifting spice", make: spice },
	thumper: { label: "Thumper", make: thumper },
	"worm-sign": { label: "Worm sign", make: wormSign },
	"desert-night": { label: "Desert night", make: desertNight },
	"water-drops": { label: "Water drops", make: waterDrops },
	"water-of-life": { label: "Water of Life: one stream", make: waterOfLife(true) },
	"water-of-life-streams": { label: "Water of Life: thin streams", make: waterOfLife(false) },
	"black-sun": { label: "Black sun", make: blackSun },
	"black-fireworks": { label: "Black fireworks", make: blackFireworks },
	infrared: { label: "Infrared", make: infrared },
	"arena-red": { label: "Arena red", make: arenaRed },
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
