import { EffectFactory } from "./types";
import { glow, random, sand, stamp } from "./util";

/**
 * Worm sign: every few seconds a sandworm passes under the panels. A mound
 * of sand travels across the window, throwing grains aside, and leaves a
 * pair of ridges and crescent ripples behind that slowly settle.
 */

const SPEED = 120; // pixels a second
const SETTLE = 3.5; // seconds for the trail to fade
const EVERY = 7; // seconds between worms
const HALF_WIDTH = 10;

interface Point {
	x: number;
	y: number;
	t: number;
	/** Distance travelled when the head passed here. */
	d: number;
}
interface Grain {
	x: number;
	y: number;
	vx: number;
	vy: number;
	born: number;
}

const wormSign: EffectFactory = () => {
	let run: { start: number; fromLeft: boolean; y0: number; wave: number; phase: number; drift: number } | null =
		null;
	let next = 1;
	let trail: Point[] = [];
	const grains: Grain[] = [];

	const head = (width: number, t: number) => {
		const r = run!;
		const d = (t - r.start) * SPEED;
		const along = d - 60;
		const x = r.fromLeft ? along : width - along;
		const y = r.y0 + Math.sin(along / r.wave + r.phase) * 38 + along * r.drift;
		return { x, y, d };
	};

	return {
		draw(ctx, env, t) {
			const colour = sand(env.colours);
			if (!run && t >= next) {
				run = {
					start: t,
					fromLeft: Math.random() < 0.6,
					y0: random(0.2, 0.8) * env.height,
					wave: random(70, 120),
					phase: random(0, Math.PI * 2),
					drift: random(-0.12, 0.12),
				};
			}
			if (run) {
				const h = head(env.width, t);
				trail.push({ ...h, t });
				for (let i = 0; i < 2; i++) {
					const side = Math.random() < 0.5 ? -1 : 1;
					grains.push({ x: h.x, y: h.y, vx: random(-20, 20), vy: side * random(25, 60), born: t });
				}
				if (h.x < -80 || h.x > env.width + 80) {
					run = null;
					next = t + EVERY;
				}
			}
			trail = trail.filter((p) => t - p.t < SETTLE);

			// The ridges either side of the worm's path, settling as they age.
			ctx.lineWidth = 1.3;
			for (let i = 1; i < trail.length; i++) {
				const a = trail[i - 1];
				const b = trail[i];
				const fade = 1 - (t - b.t) / SETTLE;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const len = Math.hypot(dx, dy) || 1;
				const nx = -dy / len;
				const ny = dx / len;
				const w = HALF_WIDTH + Math.sin(b.d / 30) * 2;
				ctx.strokeStyle = `rgba(${colour}, ${0.3 * fade})`;
				ctx.beginPath();
				ctx.moveTo(a.x + nx * w, a.y + ny * w);
				ctx.lineTo(b.x + nx * w, b.y + ny * w);
				ctx.moveTo(a.x - nx * w, a.y - ny * w);
				ctx.lineTo(b.x - nx * w, b.y - ny * w);
				ctx.stroke();
				// Crescent ripples across the path, bowed back the way it came.
				if (Math.floor(b.d / 22) !== Math.floor(a.d / 22)) {
					ctx.strokeStyle = `rgba(${colour}, ${0.22 * fade})`;
					ctx.beginPath();
					ctx.moveTo(b.x + nx * w, b.y + ny * w);
					ctx.quadraticCurveTo(b.x - (dx / len) * 9, b.y - (dy / len) * 9, b.x - nx * w, b.y - ny * w);
					ctx.stroke();
				}
			}

			// Sand thrown aside.
			const grain = glow(colour, 0.8);
			for (let i = grains.length - 1; i >= 0; i--) {
				const g = grains[i];
				const age = t - g.born;
				if (age > 0.8) {
					grains.splice(i, 1);
					continue;
				}
				stamp(ctx, grain, g.x + g.vx * age, g.y + g.vy * age, 3, 0.6 * (1 - age / 0.8));
			}

			// The mound over the worm's head.
			if (run && trail.length > 1) {
				const b = trail[trail.length - 1];
				const a = trail[Math.max(0, trail.length - 4)];
				const angle = Math.atan2(b.y - a.y, b.x - a.x);
				ctx.save();
				ctx.translate(b.x, b.y);
				ctx.rotate(angle);
				const mound = ctx.createRadialGradient(4, -3, 0, 0, 0, 20);
				mound.addColorStop(0, `rgba(${colour}, 0.42)`);
				mound.addColorStop(0.6, `rgba(${colour}, 0.16)`);
				mound.addColorStop(1, `rgba(${colour}, 0)`);
				ctx.fillStyle = mound;
				ctx.beginPath();
				ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		},
	};
};

export default wormSign;
