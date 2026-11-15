import { EffectFactory } from "./types";
import { glow, random, smoothPath, stamp } from "./util";

/**
 * The Water of Life: the glowing blue poison Paul drinks, flowing slowly
 * across the panels. Either one thick stream or a few thin ones; light runs
 * along them the way the liquid shimmers in the films.
 */

const BLUE = "64, 160, 255";
const BRIGHT = "170, 220, 255";

interface Stream {
	/** Where the stream passes, before it sways. */
	anchors: { x: number; y: number; sway: number }[];
	width: number;
	glints: { d: number; speed: number; side: number; size: number }[];
}

function makeStream(width: number, height: number, thick: boolean): Stream {
	// From one side of the window to the other, wandering as it goes.
	const across = Math.random() < 0.5;
	const n = thick ? 6 : 5;
	const anchors = Array.from({ length: n }, (_, i) => {
		const along = (i / (n - 1)) * 1.2 - 0.1;
		const off = random(0.15, 0.85);
		return across
			? { x: along * width, y: off * height, sway: random(0, Math.PI * 2) }
			: { x: off * width, y: along * height, sway: random(0, Math.PI * 2) };
	});
	return {
		anchors,
		width: thick ? 1 : random(0.2, 0.3),
		glints: Array.from({ length: thick ? 46 : 14 }, () => ({
			d: Math.random(),
			speed: random(45, 95),
			side: random(-1, 1),
			size: thick ? random(6, 14) : random(4, 7),
		})),
	};
}

const waterOfLife =
	(thick: boolean): EffectFactory =>
	() => {
		let streams: Stream[] = [];
		let size = "";
		return {
			measure(env) {
				const now = `${env.width}x${env.height}`;
				if (now === size) return;
				size = now;
				streams = Array.from({ length: thick ? 1 : 3 }, () =>
					makeStream(env.width, env.height, thick),
				);
			},
			draw(ctx, _env, t, dt) {
				const glint = glow(BRIGHT, 0.6);
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				for (const s of streams) {
					const path = smoothPath(
						s.anchors.map((a, i) => ({
							x: a.x + Math.sin(t * 0.21 + a.sway) * 10,
							y: a.y + Math.sin(t * 0.25 + a.sway + i) * 16,
						})),
						14,
					);
					const trace = () => {
						ctx.beginPath();
						ctx.moveTo(path[0].x, path[0].y);
						for (const p of path) ctx.lineTo(p.x, p.y);
					};
					// The body of the stream: a wide faint glow and a bright core.
					trace();
					ctx.strokeStyle = `rgba(${BLUE}, 0.05)`;
					ctx.lineWidth = 56 * s.width;
					ctx.stroke();
					ctx.strokeStyle = `rgba(${BLUE}, 0.09)`;
					ctx.lineWidth = 22 * s.width;
					ctx.stroke();
					ctx.strokeStyle = `rgba(${BLUE}, 0.3)`;
					ctx.lineWidth = Math.max(1.2, 6 * s.width);
					ctx.stroke();
					// Light running along it.
					ctx.setLineDash([3, 18]);
					ctx.lineDashOffset = -t * 70;
					ctx.strokeStyle = `rgba(${BRIGHT}, 0.45)`;
					ctx.lineWidth = Math.max(1, 2.5 * s.width);
					ctx.stroke();
					ctx.setLineDash([]);

					// Brighter glints carried by the flow.
					let length = 0;
					const lengths = path.map((p, i) => (length += i ? Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0));
					for (const g of s.glints) {
						g.d = (g.d + (g.speed * dt) / length) % 1;
						const want = g.d * length;
						let i = 1;
						while (i < lengths.length - 1 && lengths[i] < want) i++;
						const a = path[i - 1];
						const b = path[i];
						const seg = lengths[i] - lengths[i - 1] || 1;
						const f = (want - lengths[i - 1]) / seg;
						const nx = -(b.y - a.y) / seg;
						const ny = (b.x - a.x) / seg;
						const off = g.side * 9 * s.width;
						const flicker = 0.6 + 0.4 * Math.sin(t * 3 + g.d * 40);
						stamp(ctx, glint, a.x + (b.x - a.x) * f + nx * off, a.y + (b.y - a.y) * f + ny * off, g.size, 0.5 * flicker);
					}
				}
			},
		};
	};

export default waterOfLife;
