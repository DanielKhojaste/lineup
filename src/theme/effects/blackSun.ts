import { EffectFactory, Spot } from "./types";
import { findRoom, rgb } from "./util";

/**
 * Giedi Prime's black sun: a dark disc with a white corona, as it looks in
 * the infrared arena of Dune: Part Two. It hangs in the emptiest part of the
 * panels (towards the top right), its corona slowly breathing and its long
 * streamers turning.
 */

const WHITE = "255, 255, 255";
/** The disc's size where there's room for it. */
const LARGEST = 34;

const blackSun: EffectFactory = () => {
	let spot: Spot | null = null;
	let RADIUS = LARGEST;
	const rays = Array.from({ length: 9 }, (_, i) => ({
		angle: (i / 9) * Math.PI * 2 + Math.random() * 0.4,
		length: 1.5 + Math.random() * 1.3,
		rate: 0.2 + Math.random() * 0.3,
	}));

	return {
		measure(env) {
			// Stay put unless something has moved into the way.
			if (spot && env.hasSpace(spot, RADIUS * 1.3)) return;
			const top = (s: Spot) => s.x / env.width - (s.y / env.height) * 1.4;
			const room = findRoom(env, LARGEST * 2.4, 14, top);
			spot = room?.spot ?? null;
			// Smaller where it has to squeeze in (the top bar in the editor).
			RADIUS = room ? Math.max(8, Math.min(LARGEST, room.radius / 1.7)) : LARGEST;
		},
		draw(ctx, env, t) {
			if (!spot) return;
			const x = spot.x + Math.sin(t * 0.05) * 5;
			const y = spot.y + Math.cos(t * 0.04) * 3;
			const breathe = 0.85 + 0.15 * Math.sin(t * 0.6);

			// Long, faint streamers turning very slowly.
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(t * 0.02);
			for (const ray of rays) {
				const reach = RADIUS * (ray.length + 0.3 * Math.sin(t * ray.rate + ray.angle));
				ctx.save();
				ctx.rotate(ray.angle);
				const g = ctx.createLinearGradient(RADIUS, 0, RADIUS + reach, 0);
				g.addColorStop(0, `rgba(${WHITE}, ${0.2 * breathe})`);
				g.addColorStop(1, `rgba(${WHITE}, 0)`);
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.moveTo(RADIUS * 0.9, -RADIUS / 11);
				ctx.lineTo(RADIUS + reach, 0);
				ctx.lineTo(RADIUS * 0.9, RADIUS / 11);
				ctx.fill();
				ctx.restore();
			}
			ctx.restore();

			// The corona.
			const corona = ctx.createRadialGradient(x, y, RADIUS * 0.9, x, y, RADIUS * 2.4);
			corona.addColorStop(0, `rgba(${WHITE}, 0)`);
			corona.addColorStop(0.06, `rgba(${WHITE}, ${0.55 * breathe})`);
			corona.addColorStop(0.2, `rgba(${WHITE}, ${0.2 * breathe})`);
			corona.addColorStop(1, `rgba(${WHITE}, 0)`);
			ctx.fillStyle = corona;
			ctx.beginPath();
			ctx.arc(x, y, RADIUS * 2.4, 0, Math.PI * 2);
			ctx.fill();

			// The black disc, with a hard bright rim.
			ctx.fillStyle = `rgba(${rgb(env.colours.bg)}, 0.96)`;
			ctx.beginPath();
			ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = `rgba(${WHITE}, ${0.75 * breathe})`;
			ctx.lineWidth = 1.2;
			ctx.stroke();
		},
	};
};

export default blackSun;
