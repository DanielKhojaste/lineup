import { EffectFactory, Spot } from "./types";
import { glow, random, rgb, stamp } from "./util";

/**
 * Desert night: the Fremen move at night. Faint stars twinkle over the
 * panels, now and then one falls, and Arrakis's two moons hang in the empty
 * part of the top bar.
 */

const PALE = "238, 230, 216";

interface Star {
	x: number;
	y: number;
	size: number;
	alpha: number;
	rate: number;
	phase: number;
	blue: boolean;
}

const desertNight: EffectFactory = () => {
	let stars: Star[] = [];
	let moons: Spot | null = null;
	let shooting: { x: number; y: number; vx: number; vy: number; born: number } | null = null;
	let nextShooting = 3;

	return {
		measure(env) {
			const count = Math.min(260, Math.round((env.width * env.height) / 6000));
			if (stars.length !== count) {
				stars = Array.from({ length: count }, () => {
					const bright = Math.random() < 0.08;
					return {
						x: Math.random() * env.width,
						y: Math.random() * env.height,
						size: bright ? random(5, 7) : random(2, 4),
						alpha: bright ? random(0.6, 0.9) : random(0.22, 0.55),
						rate: random(0.5, 2.2),
						phase: random(0, Math.PI * 2),
						blue: Math.random() < 0.25,
					};
				});
			}
			// The moons sit in the gap in the top bar when there is one.
			const gap = env.boxes(".topbar__spacer").find((r) => r.width > 90);
			moons = gap
				? { x: gap.left + gap.width * 0.6, y: gap.top + gap.height / 2 }
				: (moons ?? env.findSpace(36, (s) => -s.y));
		},
		draw(ctx, env, t) {
			const pale = glow(PALE, 0.7);
			const blue = glow(rgb(env.colours.accent), 0.7);
			for (const s of stars) {
				const twinkle = 0.55 + 0.45 * Math.sin(t * s.rate + s.phase);
				stamp(ctx, s.blue ? blue : pale, s.x, s.y, s.size, s.alpha * twinkle);
			}

			// A falling star now and then.
			if (!shooting && t > nextShooting) {
				const a = random(0.25, 0.6);
				shooting = {
					x: random(0.1, 0.8) * env.width,
					y: random(0.05, 0.5) * env.height,
					vx: Math.cos(a) * 520,
					vy: Math.sin(a) * 520,
					born: t,
				};
			}
			if (shooting) {
				const age = t - shooting.born;
				if (age > 0.7) {
					shooting = null;
					nextShooting = t + random(6, 12);
				} else {
					const fade = Math.sin((age / 0.7) * Math.PI);
					const x = shooting.x + shooting.vx * age;
					const y = shooting.y + shooting.vy * age;
					const tail = ctx.createLinearGradient(x, y, x - shooting.vx * 0.14, y - shooting.vy * 0.14);
					tail.addColorStop(0, `rgba(${PALE}, ${0.7 * fade})`);
					tail.addColorStop(1, `rgba(${PALE}, 0)`);
					ctx.strokeStyle = tail;
					ctx.lineWidth = 1.4;
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x - shooting.vx * 0.14, y - shooting.vy * 0.14);
					ctx.stroke();
				}
			}

			// Two moons: the first larger and full, the second a thin crescent.
			if (moons) {
				const { x, y } = moons;
				const bg = rgb(env.colours.bg);
				stamp(ctx, pale, x, y, 44, 0.22);
				ctx.fillStyle = `rgba(${PALE}, 0.8)`;
				ctx.beginPath();
				ctx.arc(x, y, 8, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(${bg}, 0.18)`;
				ctx.beginPath();
				ctx.arc(x + 2.5, y + 1.5, 3, 0, Math.PI * 2);
				ctx.fill();
				const x2 = x + 30;
				const y2 = y - 5;
				stamp(ctx, pale, x2, y2, 26, 0.16);
				ctx.fillStyle = `rgba(${PALE}, 0.7)`;
				ctx.beginPath();
				ctx.arc(x2, y2, 5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = `rgba(${bg}, 0.95)`;
				ctx.beginPath();
				ctx.arc(x2 + 2.4, y2 - 1, 4.6, 0, Math.PI * 2);
				ctx.fill();
			}
		},
	};
};

export default desertNight;
