import { EffectFactory, Spot } from "./types";
import { findRoom, glow, random, stamp, water } from "./util";

/**
 * Water drops: on Arrakis every drop counts. Now and then a drop of glowing
 * blue water falls onto an empty part of the panels and ripples out.
 */

const FALL = 0.45;
const LIFE = 1.9;

interface Drop {
	spot: Spot;
	scale: number;
	born: number;
	bits: { vx: number; vy: number }[];
}

const waterDrops: EffectFactory = () => {
	const drops: Drop[] = [];
	let next = 0.6;

	return {
		draw(ctx, env, t) {
			const colour = water(env.colours);
			const light = glow(colour, 0.6);
			if (t >= next) {
				next = t + random(1.6, 3);
				const room = findRoom(env, 70, 16);
				if (room)
					drops.push({
						spot: room.spot,
						scale: Math.max(0.35, room.radius / 70),
						born: t,
						bits: Array.from({ length: 5 }, () => ({ vx: random(-60, 60), vy: random(-90, -40) })),
					});
			}
			for (let i = drops.length - 1; i >= 0; i--) {
				const d = drops[i];
				const age = t - d.born;
				if (age > LIFE) {
					drops.splice(i, 1);
					continue;
				}
				const { x, y } = d.spot;
				if (age < FALL) {
					// Falling: a teardrop, speeding up.
					const p = age / FALL;
					const dy = -42 * (1 - p * p);
					stamp(ctx, light, x, y + dy, 22, 0.4 * p + 0.15);
					ctx.fillStyle = `rgba(${colour}, ${0.55 + 0.35 * p})`;
					ctx.beginPath();
					ctx.moveTo(x, y + dy - 10);
					ctx.quadraticCurveTo(x + 5.5, y + dy, x, y + dy + 5);
					ctx.quadraticCurveTo(x - 5.5, y + dy, x, y + dy - 10);
					ctx.fill();
					continue;
				}
				// Landed: rings, a few droplets, a wet glow that fades.
				const s = age - FALL;
				const k = s / (LIFE - FALL);
				stamp(ctx, light, x, y, 40, 0.4 * (1 - k));
				ctx.lineWidth = 1.2;
				for (const [delay, reach, strength] of [
					[0, 62, 0.6],
					[0.14, 40, 0.45],
				] as const) {
					const q = Math.max(0, s - delay) / (LIFE - FALL - delay);
					if (q <= 0 || q >= 1) continue;
					const r = 2 + (1 - (1 - q) ** 2) * reach * d.scale;
					ctx.strokeStyle = `rgba(${colour}, ${strength * (1 - q)})`;
					ctx.beginPath();
					ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
					ctx.stroke();
				}
				if (s < 0.6)
					for (const b of d.bits)
						stamp(ctx, light, x + b.vx * s, y + b.vy * s + 260 * s * s, 4, 0.8 * (1 - s / 0.6));
			}
		},
	};
};

export default waterDrops;
