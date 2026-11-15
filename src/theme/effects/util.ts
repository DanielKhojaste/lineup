import { EffectColours, EffectEnv, Spot } from "./types";

/**
 * The roomiest empty place up to `max` across, shrinking towards `min` when
 * the panels are busy (the editor has little room around the board).
 */
export function findRoom(
	env: EffectEnv,
	max: number,
	min: number,
	score?: (spot: Spot) => number,
): { spot: Spot; radius: number } | null {
	for (let radius = max; radius >= min; radius *= 0.75) {
		const spot = env.findSpace(radius, score);
		if (spot) return { spot, radius };
	}
	const spot = env.findSpace(min, score);
	return spot ? { spot, radius: min } : null;
}

/** "#3A97FF" → "58, 151, 255", ready for rgba(). */
export function rgb(hex: string): string {
	const h = hex.replace("#", "");
	const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
	const n = parseInt(full, 16);
	return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function hue(hex: string): number {
	const [r, g, b] = rgb(hex)
		.split(",")
		.map((v) => Number(v) / 255);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	if (max === min) return -1;
	const d = max - min;
	const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return (h * 60 + 360) % 360;
}

/** The theme's sand: whichever of its two colours is closest to desert gold. */
export function sand(colours: EffectColours): string {
	const away = (hex: string) => {
		const h = hue(hex);
		return h < 0 ? 999 : Math.abs(h - 36);
	};
	return rgb(away(colours.secondary) < away(colours.accent) ? colours.secondary : colours.accent);
}

/** The glowing blue of water in the desert: the theme's own blue when it has one. */
export function water(colours: EffectColours): string {
	const h = hue(colours.accent);
	return h >= 195 && h <= 235 ? rgb(colours.accent) : "70, 160, 255";
}

export const random = (min: number, max: number) => min + Math.random() * (max - min);

/** A soft round glow in one colour, drawn once and stamped wherever it's needed. */
const sprites = new Map<string, HTMLCanvasElement>();
export function glow(colour: string, core = 0.55): HTMLCanvasElement {
	const key = `${colour}|${core}`;
	let sprite = sprites.get(key);
	if (sprite) return sprite;
	const size = 32;
	sprite = document.createElement("canvas");
	sprite.width = sprite.height = size;
	const ctx = sprite.getContext("2d")!;
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0, `rgba(${colour}, 1)`);
	g.addColorStop(0.35, `rgba(${colour}, ${core})`);
	g.addColorStop(1, `rgba(${colour}, 0)`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	sprites.set(key, sprite);
	return sprite;
}

/** Stamp a glow `size` pixels across, centred on (x, y). */
export function stamp(
	ctx: CanvasRenderingContext2D,
	sprite: HTMLCanvasElement,
	x: number,
	y: number,
	size: number,
	alpha: number,
) {
	if (alpha <= 0.005) return;
	ctx.globalAlpha = Math.min(1, alpha);
	ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
	ctx.globalAlpha = 1;
}

/** 0 → 1 → 0 over a life: fades in over `inFor`, out over the last `outFor`. */
export function envelope(age: number, life: number, inFor: number, outFor: number): number {
	if (age < 0 || age > life) return 0;
	return Math.min(1, age / inFor, (life - age) / outFor);
}

export const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/** Points along a smooth curve through `points` (Catmull-Rom), `step` pixels apart or so. */
export function smoothPath(points: { x: number; y: number }[], step = 8): { x: number; y: number }[] {
	const out: { x: number; y: number }[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];
		const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
		for (let j = 0; j < n; j++) {
			const t = j / n;
			const t2 = t * t;
			const t3 = t2 * t;
			const f = (a: number, b: number, c: number, d: number) =>
				0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
			out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
		}
	}
	out.push(points[points.length - 1]);
	return out;
}
