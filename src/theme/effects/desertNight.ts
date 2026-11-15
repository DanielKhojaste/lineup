import { EffectFactory } from "./types";
import { glow, random, rgb, stamp } from "./util";

/**
 * Desert night: the Fremen move at night. Faint stars twinkle over the
 * panels, now and then one of them sparkles, and comets streak across.
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

interface Sparkle {
	star: Star;
	born: number;
	life: number;
}

interface Comet {
	x: number;
	y: number;
	vx: number;
	vy: number;
	born: number;
	life: number;
	/** Tail length, in seconds of travel. */
	tail: number;
	width: number;
}

const desertNight: EffectFactory = () => {
	let stars: Star[] = [];
	const sparkles: Sparkle[] = [];
	const comets: Comet[] = [];
	let nextSparkle = 0.4;
	let nextComet = 0.8;

	const comet = (width: number, height: number, t: number): Comet => {
		// Mostly falling left to right, sometimes the other way.
		const leftward = Math.random() < 0.3;
		const angle = random(0.18, 0.55) + (leftward ? Math.PI - 0.73 : 0);
		const speed = random(420, 700);
		const big = Math.random() < 0.25;
		return {
			x: random(0.05, 0.85) * width + (leftward ? width * 0.15 : 0),
			y: random(0.02, 0.45) * height,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			born: t,
			life: random(0.6, 1.1),
			tail: big ? random(0.26, 0.34) : random(0.14, 0.22),
			width: big ? 2.4 : 1.6,
		};
	};

	return {
		measure(env) {
			const count = Math.min(260, Math.round((env.width * env.height) / 6000));
			if (stars.length === count) return;
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
		},
		draw(ctx, env, t) {
			const pale = glow(PALE, 0.7);
			const blue = glow(rgb(env.colours.accent), 0.7);
			for (const s of stars) {
				const twinkle = 0.55 + 0.45 * Math.sin(t * s.rate + s.phase);
				stamp(ctx, s.blue ? blue : pale, s.x, s.y, s.size, s.alpha * twinkle);
			}

			// Now and then a star catches the light and sparkles.
			if (t >= nextSparkle && stars.length) {
				nextSparkle = t + random(0.35, 1.1);
				sparkles.push({ star: stars[Math.floor(Math.random() * stars.length)], born: t, life: random(0.7, 1.2) });
			}
			ctx.lineCap = "round";
			for (let i = sparkles.length - 1; i >= 0; i--) {
				const { star, born, life } = sparkles[i];
				const p = (t - born) / life;
				if (p >= 1) {
					sparkles.splice(i, 1);
					continue;
				}
				const k = Math.sin(p * Math.PI);
				const colour = star.blue ? rgb(env.colours.accent) : PALE;
				stamp(ctx, star.blue ? blue : pale, star.x, star.y, 10 + 12 * k, 0.9 * k);
				// A four-pointed glint, turning slightly as it fades.
				const reach = 5 + 9 * k;
				ctx.save();
				ctx.translate(star.x, star.y);
				ctx.rotate(p * 0.4);
				ctx.strokeStyle = `rgba(${colour}, ${0.75 * k})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(-reach, 0);
				ctx.lineTo(reach, 0);
				ctx.moveTo(0, -reach);
				ctx.lineTo(0, reach);
				ctx.stroke();
				ctx.restore();
			}

			// Comets: every couple of seconds, sometimes two at once.
			if (t >= nextComet) {
				nextComet = t + random(1.6, 4);
				comets.push(comet(env.width, env.height, t));
				if (Math.random() < 0.2) comets.push(comet(env.width, env.height, t + random(0, 0.3)));
			}
			for (let i = comets.length - 1; i >= 0; i--) {
				const c = comets[i];
				const age = t - c.born;
				if (age > c.life) {
					comets.splice(i, 1);
					continue;
				}
				if (age < 0) continue;
				// Bright quickly, then burning out.
				const fade = Math.min(1, age / 0.12) * (1 - (age / c.life) ** 2);
				const x = c.x + c.vx * age;
				const y = c.y + c.vy * age;
				const tx = x - c.vx * c.tail;
				const ty = y - c.vy * c.tail;
				const tail = ctx.createLinearGradient(x, y, tx, ty);
				tail.addColorStop(0, `rgba(${PALE}, ${0.95 * fade})`);
				tail.addColorStop(0.3, `rgba(${PALE}, ${0.4 * fade})`);
				tail.addColorStop(1, `rgba(${PALE}, 0)`);
				ctx.strokeStyle = tail;
				ctx.lineWidth = c.width;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(tx, ty);
				ctx.stroke();
				stamp(ctx, pale, x, y, 6 + c.width * 3, 0.9 * fade);
			}
		},
	};
};

export default desertNight;
