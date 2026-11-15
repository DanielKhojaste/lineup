import { EffectFactory, Spot } from "./types";
import { envelope, findRoom, glow, random, sand, stamp } from "./util";

/**
 * Fremen: a thumper planted in an empty part of the panels, beating its
 * double rhythm into the sand. Each beat sends a ripple out across the
 * surface. Every so often it's pulled up and planted somewhere else.
 */

const BEAT = 1.6; // seconds between double beats
const SECOND_BEAT = 0.3;
const RING_LIFE = 2.6;
const STAY = 18; // seconds in one place

interface Ring {
	born: number;
	strength: number;
}
interface Grain {
	x: number;
	y: number;
	vx: number;
	vy: number;
	born: number;
}

const thumper: EffectFactory = () => {
	let spot: Spot | null = null;
	let reach = 140;
	let planted = 0;
	let lastBeat = -1;
	const rings: Ring[] = [];
	const grains: Grain[] = [];

	return {
		draw(ctx, env, t) {
			const colour = sand(env.colours);
			// Move when the time's up, or when something has opened over it.
			const blocked = spot && Math.floor(t) !== Math.floor(t - 1 / 30) && !env.hasSpace(spot, 14);
			if (!spot || blocked || t - planted > STAY) {
				const room = findRoom(env, 130, 14);
				spot = room?.spot ?? null;
				// The ripples spread as far as there's room, and a little over what's nearby.
				reach = room ? Math.max(70, room.radius * 1.1) : 140;
				planted = t;
				lastBeat = -1;
				rings.length = 0;
			}
			if (!spot) return;
			const here = envelope(t - planted, STAY, 0.8, 0.8);

			// The beat: thump-thump … thump-thump.
			const since = (t - planted) % BEAT;
			const beatIndex = Math.floor((t - planted) / BEAT) * 2 + (since >= SECOND_BEAT ? 1 : 0);
			if (beatIndex !== lastBeat && t - planted < STAY - 1) {
				lastBeat = beatIndex;
				rings.push({ born: t, strength: beatIndex % 2 ? 0.7 : 1 });
				for (let i = 0; i < 6; i++) {
					const a = random(0, Math.PI * 2);
					const v = random(20, 55);
					grains.push({ x: spot.x, y: spot.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, born: t });
				}
			}

			// Ripples in the sand.
			ctx.lineWidth = 1.6;
			for (let i = rings.length - 1; i >= 0; i--) {
				const age = t - rings[i].born;
				if (age > RING_LIFE) {
					rings.splice(i, 1);
					continue;
				}
				const p = age / RING_LIFE;
				const r = 8 + (1 - (1 - p) ** 2) * reach;
				const a = 0.45 * rings[i].strength * (1 - p) ** 1.5 * here;
				ctx.strokeStyle = `rgba(${colour}, ${a})`;
				ctx.beginPath();
				ctx.ellipse(spot.x, spot.y, r, r * 0.62, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = `rgba(${colour}, ${a * 0.45})`;
				ctx.beginPath();
				ctx.ellipse(spot.x, spot.y, r * 0.93, r * 0.93 * 0.62, 0, 0, Math.PI * 2);
				ctx.stroke();
			}

			// Sand thrown up by the beat.
			const grain = glow(colour, 0.8);
			for (let i = grains.length - 1; i >= 0; i--) {
				const g = grains[i];
				const age = t - g.born;
				if (age > 0.7) {
					grains.splice(i, 1);
					continue;
				}
				const k = 1 - age / 0.7;
				stamp(ctx, grain, g.x + g.vx * age, g.y + g.vy * age * 0.62, 3, 0.7 * k * here);
			}

			// The thumper itself: a small stake, jolting on each beat.
			const jolt = Math.max(0, 1 - (t - (rings[rings.length - 1]?.born ?? -9)) / 0.18);
			stamp(ctx, glow(colour), spot.x, spot.y, 22 + jolt * 10, (0.25 + jolt * 0.35) * here);
			ctx.fillStyle = `rgba(${colour}, ${0.85 * here})`;
			ctx.beginPath();
			ctx.arc(spot.x, spot.y - jolt * 1.5, 3.2, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = `rgba(${colour}, ${0.6 * here})`;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(spot.x, spot.y - jolt * 1.5);
			ctx.lineTo(spot.x, spot.y - 13 - jolt * 1.5);
			ctx.stroke();
		},
	};
};

export default thumper;
