/** The colours a moving background is drawn in, from the theme it belongs to. */
export interface EffectColours {
	accent: string;
	secondary: string;
	bg: string;
	surface: string;
	text: string;
}

/** How Dune's spice looks, as multiples of the normal amount. */
export interface SpiceSettings {
	size: number;
	speed: number;
	amount: number;
}

/** What an effect can see of the window. */
export interface EffectEnv {
	width: number;
	height: number;
	colours: EffectColours;
	/** Read live: the sliders change it while the effect runs. */
	spice: SpiceSettings;
}

export interface Effect {
	/** Called when the window changes size, and about once a second. */
	measure?(env: EffectEnv): void;
	/** One frame. `t` is in seconds; `dt` is the time since the last frame. */
	draw(ctx: CanvasRenderingContext2D, env: EffectEnv, t: number, dt: number): void;
}

export type EffectFactory = (env: EffectEnv) => Effect;
