import { EffectFactory, SpiceSettings } from "./types";
import { glow } from "./util";

/**
 * Dune's drifting spice: glowing red-orange flakes (cinnamon to ember, never
 * white, as in Villeneuve's films) carried across the panels by a slow wind.
 */

export const DEFAULT_SPICE: SpiceSettings = { size: 1, speed: 1, amount: 1 };

/** Specks per 100 000 pixels of window, and a ceiling. */
const DENSITY = 6;
const MAX_SPECKS = 330;
const COLOURS = ["226, 88, 40", "206, 66, 34", "240, 118, 50", "184, 56, 30"];

interface Speck {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	phase: number;
	colour: number;
}

function speck(width: number, height: number, anywhere: boolean): Speck {
	// Most are tiny; a few are larger, softer motes closer to the "camera".
	const near = Math.random() < 0.12;
	return {
		x: anywhere ? Math.random() * width : -20,
		y: Math.random() * height,
		vx: (near ? 26 : 12) + Math.random() * (near ? 22 : 16),
		vy: -4 + Math.random() * 6,
		size: near ? 7 + Math.random() * 6 : 2.5 + Math.random() * 3,
		alpha: near ? 0.16 + Math.random() * 0.14 : 0.32 + Math.random() * 0.4,
		phase: Math.random() * Math.PI * 2,
		colour: Math.floor(Math.random() * COLOURS.length),
	};
}

const spice: EffectFactory = () => {
	const sprites = COLOURS.map((c) => glow(c));
	let specks: Speck[] = [];
	return {
		measure(env) {
			const count = Math.min(
				MAX_SPECKS,
				Math.round(((env.width * env.height) / 100_000) * DENSITY * env.spice.amount),
			);
			if (specks.length > count) specks.length = count;
			while (specks.length < count) specks.push(speck(env.width, env.height, true));
		},
		draw(ctx, env, t, dt) {
			const { size, speed } = env.spice;
			for (let i = 0; i < specks.length; i++) {
				const s = specks[i];
				// A slow gust: the wind rises and falls, and each speck sways a little.
				const gust = 0.75 + 0.35 * Math.sin(t * 0.35 + s.phase * 0.3);
				s.x += s.vx * gust * speed * dt;
				s.y += (s.vy + Math.sin(t * 0.8 * speed + s.phase) * 6) * speed * dt;
				if (s.x > env.width + 20 || s.y < -20 || s.y > env.height + 20) {
					specks[i] = speck(env.width, env.height, false);
					continue;
				}
				ctx.globalAlpha = s.alpha * (0.7 + 0.3 * Math.sin(t * 1.6 + s.phase));
				const d = s.size * size;
				ctx.drawImage(sprites[s.colour], s.x - d / 2, s.y - d / 2, d, d);
			}
			ctx.globalAlpha = 1;
		},
	};
};

export default spice;
