import { EffectFactory, Spot } from "./types";
import { findRoom, glow, random, rgb, stamp } from "./util";

/**
 * Black fireworks, from Feyd-Rautha's birthday on Giedi Prime: bursts of
 * black ink with a white infrared rim, spreading out and dripping away in
 * the empty parts of the panels.
 */

const WHITE = "255, 255, 255";
const LIFE = 1.9;

interface Spark {
	vx: number;
	vy: number;
	trail: { x: number; y: number }[];
	x: number;
	y: number;
}
interface Burst {
	spot: Spot;
	born: number;
	sparks: Spark[];
}

const blackFireworks: EffectFactory = () => {
	const bursts: Burst[] = [];
	let next = 0.5;

	return {
		draw(ctx, env, t, dt) {
			const ink = rgb(env.colours.bg);
			const halo = glow(WHITE, 0.4);
			if (t >= next) {
				next = t + random(1.6, 2.8);
				const room = findRoom(env, 110, 20);
				if (room) {
					const { spot } = room;
					// Smaller bursts where there's less room.
					const scale = Math.max(0.3, room.radius / 110);
					const n = Math.round(random(28, 40) * Math.max(0.5, scale));
					bursts.push({
						spot,
						born: t,
						sparks: Array.from({ length: n }, (_, i) => {
							const a = (i / n) * Math.PI * 2 + random(-0.12, 0.12);
							const v = random(110, 230) * scale;
							return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, x: spot.x, y: spot.y, trail: [] };
						}),
					});
				}
			}
			ctx.lineCap = "round";
			for (let i = bursts.length - 1; i >= 0; i--) {
				const b = bursts[i];
				const age = t - b.born;
				if (age > LIFE) {
					bursts.splice(i, 1);
					continue;
				}
				const fade = 1 - age / LIFE;
				// The bloom at the centre: a blot of ink in a white flash.
				if (age < 0.5) {
					const p = age / 0.5;
					stamp(ctx, halo, b.spot.x, b.spot.y, 110 * p + 14, 0.6 * (1 - p));
					ctx.fillStyle = `rgba(${ink}, ${0.9 * (1 - p)})`;
					ctx.beginPath();
					ctx.arc(b.spot.x, b.spot.y, 5 + 26 * p, 0, Math.PI * 2);
					ctx.fill();
				}
				for (const s of b.sparks) {
					// Slowed by the air, then falling.
					const drag = Math.exp(-2 * dt);
					s.vx *= drag;
					s.vy = s.vy * drag + 26 * dt;
					s.trail.push({ x: s.x, y: s.y });
					if (s.trail.length > 6) s.trail.shift();
					s.x += s.vx * dt;
					s.y += s.vy * dt;
					// An inky streak with a pale edge.
					if (s.trail.length > 1) {
						ctx.beginPath();
						ctx.moveTo(s.trail[0].x, s.trail[0].y);
						for (const p of s.trail) ctx.lineTo(p.x, p.y);
						ctx.lineTo(s.x, s.y);
						ctx.strokeStyle = `rgba(${WHITE}, ${0.26 * fade})`;
						ctx.lineWidth = 4.5;
						ctx.stroke();
						ctx.strokeStyle = `rgba(${ink}, ${0.95 * fade})`;
						ctx.lineWidth = 1.6;
						ctx.stroke();
					}
					stamp(ctx, halo, s.x, s.y, 14, 0.45 * fade);
					ctx.fillStyle = `rgba(${ink}, ${fade})`;
					ctx.beginPath();
					ctx.arc(s.x, s.y, 2.8, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		},
	};
};

export default blackFireworks;
