import { EffectFactory } from "./types";
import { easeInOut } from "./util";

/**
 * Infrared: Giedi Prime's sun shows the world in harsh black and white.
 * Every few seconds a band of that light sweeps across the window, lighting
 * the edges of the cards, buttons and panels it passes in hard white.
 */

const WHITE = "255, 255, 255";
const EVERY = 5.5;
const SWEEP = 1.9;
const BAND = 240;
const EDGES =
	".board-card, .session-card, .nav-item, .button, .icon-button, .rail__tool, .segmented, .field__input, .tabs, .filter-chip, .panel-section, .theme-page__item, .theme-spec";

const infrared: EffectFactory = () => ({
	draw(ctx, env, t) {
		// The first sweep comes a second in, once the page has settled.
		const into = (t + EVERY - 1) % EVERY;
		if (into > SWEEP) return;
		const p = easeInOut(into / SWEEP);
		const span = env.width + env.height * 0.35 + BAND * 2;
		const band = -BAND + p * span;
		// The band leans, like light coming in low.
		const at = (x: number, y: number) => x + (y / env.height) * env.height * 0.35;
		const strength = Math.sin((into / SWEEP) * Math.PI);

		// A faint wash of light.
		const wash = ctx.createLinearGradient(band - BAND - env.height * 0.35, 0, band + BAND, 0);
		wash.addColorStop(0, `rgba(${WHITE}, 0)`);
		wash.addColorStop(0.5, `rgba(${WHITE}, ${0.06 * strength})`);
		wash.addColorStop(1, `rgba(${WHITE}, 0)`);
		ctx.fillStyle = wash;
		ctx.fillRect(0, 0, env.width, env.height);

		// Hard white rims on the edges it passes.
		for (const r of env.boxes(EDGES, 220)) {
			const d = (at(r.left + r.width / 2, r.top + r.height / 2) - band) / (BAND * 0.55);
			const k = Math.exp(-d * d) * strength;
			if (k < 0.03) continue;
			const radius = Math.min(8, r.height / 2);
			ctx.beginPath();
			ctx.roundRect(r.left - 0.5, r.top - 0.5, r.width + 1, r.height + 1, radius);
			ctx.strokeStyle = `rgba(${WHITE}, ${0.2 * k})`;
			ctx.lineWidth = 6;
			ctx.stroke();
			ctx.strokeStyle = `rgba(${WHITE}, ${k})`;
			ctx.lineWidth = 1.2;
			ctx.stroke();
		}
	},
});

export default infrared;
