import { EffectFactory } from "./types";
import { rgb } from "./util";

/**
 * Arena red: the red light of the Harkonnen arena. Whatever is picked (the
 * board you're on, the tab, the tool, the library section) flares red, and
 * a red glow rises at the edges of the window like floodlights.
 *
 * For now it flares every few seconds so it can be judged; the idea is for
 * it to flare whenever something is picked.
 */

const EVERY = 4.5;
const FLARE = 1.4;
const PICKED =
	'.is-active, .is-selected, [aria-pressed="true"], [aria-selected="true"], [aria-current="page"]';

const arenaRed: EffectFactory = () => ({
	draw(ctx, env, t) {
		const red = rgb(env.colours.secondary);
		// The first flare comes a second and a half in, once the page has settled.
		const into = (t + EVERY - 1.5) % EVERY;

		// Floodlights at the edges, rising and falling with the flare.
		const lights = into < FLARE * 1.6 ? Math.sin((into / (FLARE * 1.6)) * Math.PI) : 0;
		if (lights > 0.01) {
			const edge = Math.min(env.width, env.height) * 0.22;
			for (const [x0, y0, x1, y1, w, h] of [
				[0, 0, 0, edge, env.width, edge],
				[0, env.height, 0, env.height - edge, env.width, -edge],
			] as const) {
				const g = ctx.createLinearGradient(x0, y0, x1, y1);
				g.addColorStop(0, `rgba(${red}, ${0.16 * lights})`);
				g.addColorStop(1, `rgba(${red}, 0)`);
				ctx.fillStyle = g;
				ctx.fillRect(x0, y0, w, h);
			}
		}
		if (into > FLARE) return;

		// The flare on whatever is picked: a red rim that opens out and fades.
		const p = into / FLARE;
		const fade = (1 - p) ** 1.5;
		for (const r of env.boxes(PICKED, 40)) {
			if (r.width > env.width * 0.6 || r.height > env.height * 0.6) continue;
			const grow = p * 10;
			const radius = Math.min(10, r.height / 2) + grow / 2;
			ctx.beginPath();
			ctx.roundRect(r.left - grow, r.top - grow, r.width + grow * 2, r.height + grow * 2, radius);
			ctx.fillStyle = `rgba(${red}, ${0.14 * fade})`;
			ctx.fill();
			ctx.strokeStyle = `rgba(${red}, ${0.3 * fade})`;
			ctx.lineWidth = 6;
			ctx.stroke();
			ctx.strokeStyle = `rgba(255, 80, 64, ${0.95 * fade})`;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
	},
});

export default arenaRed;
