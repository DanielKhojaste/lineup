/** "#3A97FF" → "58, 151, 255", ready for rgba(). */
export function rgb(hex: string): string {
	const h = hex.replace("#", "");
	const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
	const n = parseInt(full, 16);
	return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
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
