/** Small colour helpers for picking readable text colours (WCAG 2 contrast). */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
	return HEX.test(value.trim());
}

export function normalizeHex(value: string): string {
	let hex = value.trim().replace("#", "");
	if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
	return `#${hex.toUpperCase()}`;
}

function channels(hex: string): [number, number, number] {
	const h = normalizeHex(hex).slice(1);
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
		number,
		number,
		number,
	];
}

export function luminance(hex: string): number {
	const [r, g, b] = channels(hex).map((c) => {
		const v = c / 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Whichever of `light` and `dark` reads better on `background`. */
export function readableOn(
	background: string,
	light = "#FFFFFF",
	dark = "#121417",
): string {
	return contrast(background, light) >= contrast(background, dark)
		? light
		: dark;
}

/** Mix two colours; `amount` is the share of `b` (0–1). */
export function mix(a: string, b: string, amount: number): string {
	const ca = channels(a);
	const cb = channels(b);
	const out = ca.map((c, i) => Math.round(c + (cb[i] - c) * amount));
	return `#${out
		.map((c) => c.toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;
}
