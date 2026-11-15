import { useEffect, useRef } from "react";

/**
 * Dune's drifting spice: faint glowing specks carried across the panels by a
 * slow desert wind. Drawn on one canvas over the interface (it never takes
 * clicks), and never over the board itself, so drawings stay clear.
 *
 * Kept light on purpose:
 * - a few dozen specks, drawn from small pictures made once (no blur filters)
 * - about 30 frames a second, and nothing at all while the window is hidden
 * - off when the computer asks for reduced motion
 */

const FPS = 30;
/** Specks per 100 000 pixels of window, with a ceiling. */
const DENSITY = 6;
const MAX_SPECKS = 110;
/** The spice's colours: bright orange, gold and a pale ember. */
const COLOURS = ["255, 150, 60", "240, 180, 90", "255, 205, 140"];
/** Areas the spice stays out of. */
const AVOID = ".board__svg, .board-card__preview, .session-card__preview, dialog[open]";

interface Speck {
	x: number;
	y: number;
	/** Drift, in pixels a second. */
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	/** Where it is in its slow shimmer. */
	phase: number;
	sprite: number;
}

/** A soft glowing dot, drawn once and reused for every speck of that colour. */
function makeSprite(rgb: string): HTMLCanvasElement {
	const size = 32;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	glow.addColorStop(0, `rgba(${rgb}, 1)`);
	glow.addColorStop(0.25, `rgba(${rgb}, 0.6)`);
	glow.addColorStop(1, `rgba(${rgb}, 0)`);
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, size, size);
	return canvas;
}

function newSpeck(width: number, height: number, anywhere: boolean): Speck {
	// Most specks are tiny; a few are larger, softer motes closer to the "camera".
	const near = Math.random() < 0.12;
	return {
		x: anywhere ? Math.random() * width : -20,
		y: Math.random() * height,
		vx: (near ? 26 : 12) + Math.random() * (near ? 22 : 16),
		vy: -4 + Math.random() * 6,
		size: near ? 7 + Math.random() * 6 : 2.5 + Math.random() * 3,
		alpha: near ? 0.16 + Math.random() * 0.14 : 0.32 + Math.random() * 0.4,
		phase: Math.random() * Math.PI * 2,
		sprite: Math.floor(Math.random() * COLOURS.length),
	};
}

export default function SpiceEffect() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sprites = COLOURS.map(makeSprite);

		let width = 0;
		let height = 0;
		let specks: Speck[] = [];
		let avoid: DOMRect[] = [];
		let frame = 0;
		let raf = 0;
		let last = 0;

		const resize = () => {
			const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			const count = Math.min(MAX_SPECKS, Math.round(((width * height) / 100_000) * DENSITY));
			specks = Array.from({ length: count }, () => newSpeck(width, height, true));
		};

		const measure = () => {
			avoid = [...document.querySelectorAll(AVOID)].map((el) => el.getBoundingClientRect());
		};

		const draw = (now: number) => {
			raf = requestAnimationFrame(draw);
			if (now - last < 1000 / FPS) return;
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			// The board can move or open; look again every second or so.
			if (frame++ % FPS === 0) measure();

			ctx.clearRect(0, 0, width, height);
			ctx.save();
			// Everywhere except the board (and any open window).
			if (avoid.length) {
				ctx.beginPath();
				ctx.rect(0, 0, width, height);
				for (const r of avoid) ctx.rect(r.right, r.top, -r.width, r.height);
				ctx.clip("evenodd");
			}
			const t = now / 1000;
			for (let i = 0; i < specks.length; i++) {
				const s = specks[i];
				// A slow gust: the wind rises and falls, and each speck sways a little.
				const gust = 0.75 + 0.35 * Math.sin(t * 0.35 + s.phase * 0.3);
				s.x += s.vx * gust * dt;
				s.y += (s.vy + Math.sin(t * 0.8 + s.phase) * 6) * dt;
				if (s.x > width + 20 || s.y < -20 || s.y > height + 20) {
					specks[i] = newSpeck(width, height, false);
					continue;
				}
				ctx.globalAlpha = s.alpha * (0.7 + 0.3 * Math.sin(t * 1.6 + s.phase));
				ctx.drawImage(sprites[s.sprite], s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
			}
			ctx.restore();
		};

		const start = () => {
			cancelAnimationFrame(raf);
			if (reduced.matches || document.hidden) {
				ctx.clearRect(0, 0, width, height);
				return;
			}
			last = performance.now();
			raf = requestAnimationFrame(draw);
		};

		resize();
		measure();
		start();
		window.addEventListener("resize", resize);
		document.addEventListener("visibilitychange", start);
		reduced.addEventListener("change", start);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			document.removeEventListener("visibilitychange", start);
			reduced.removeEventListener("change", start);
		};
	}, []);

	return <canvas ref={canvasRef} className="theme-effect" aria-hidden="true" />;
}
