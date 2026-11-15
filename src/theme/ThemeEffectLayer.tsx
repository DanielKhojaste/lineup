import { useEffect, useRef } from "react";
import { EFFECTS } from "./effects";
import { EffectColours, EffectEnv, SpiceSettings, Spot } from "./effects/types";
import { ThemeEffect } from "./themes";

/**
 * A theme's moving background (Dune's spice, the Fremen thumper…), drawn on
 * one canvas over the interface. It never takes clicks and never covers the
 * board, so drawings stay clear.
 *
 * Kept light on purpose:
 * - about 30 frames a second, and nothing at all while the window is hidden
 * - drawn at the screen's normal resolution, never sharper (the cost is in
 *   the pixels repainted, not in how much is drawn)
 * - off when the computer asks for reduced motion
 */

const FPS = 30;
/** Areas every effect stays out of: board pictures and open windows… */
const AVOID = ".board-card__preview, .session-card__preview, dialog[open]";
/** …and the board itself (the whole area around the field too). */
const BOARD = ".board";
/** What counts as "something there" when looking for an empty part of the panels (text counts too). */
const BUSY =
	"button, a, input, textarea, select, img, svg, canvas:not(.theme-effect), table, .board-card, .session-card, .nav-item, .filter-chip, .segmented, .notice, .chip, .tag, .theme-swatch, .kit-dot";
/** Grid spacing, in pixels, when mapping the empty parts of the window. */
const CELL = 14;

export default function ThemeEffectLayer({
	effect,
	colours,
	spice,
	overBoard = false,
}: {
	effect: ThemeEffect;
	colours: EffectColours;
	spice: SpiceSettings;
	/** For testing only: draw over the board too. */
	overBoard?: boolean;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Read every frame, so moving a slider changes things straight away.
	const live = useRef({ spice, overBoard, colours });
	live.current = { spice, overBoard, colours };

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

		let avoid: DOMRect[] = [];
		let raf = 0;
		let last = 0;
		let frame = 0;
		const started = performance.now();

		// Where the panels are empty, mapped on a grid now and then.
		let bare: Uint8Array = new Uint8Array(0);
		let cols = 0;
		let rows = 0;
		let mappedAt = -Infinity;
		const mapSpace = () => {
			cols = Math.ceil(env.width / CELL);
			rows = Math.ceil(env.height / CELL);
			bare = new Uint8Array(cols * rows).fill(1);
			const mark = (r: DOMRect) => {
				if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.right < 0) return;
				const c0 = Math.max(0, Math.floor(r.left / CELL));
				const c1 = Math.min(cols - 1, Math.floor(r.right / CELL));
				const r0 = Math.max(0, Math.floor(r.top / CELL));
				const r1 = Math.min(rows - 1, Math.floor(r.bottom / CELL));
				for (let row = r0; row <= r1; row++) bare.fill(0, row * cols + c0, row * cols + c1 + 1);
			};
			avoid.forEach(mark);
			// Buttons, fields, cards, pictures…
			for (const el of document.querySelectorAll(BUSY)) mark(el.getBoundingClientRect());
			// …and any text.
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
			let last: Element | null = null;
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				const parent = node.parentElement;
				if (!parent || parent === last || !node.textContent?.trim()) continue;
				last = parent;
				mark(parent.getBoundingClientRect());
			}
			mappedAt = performance.now();
		};
		const roomAt = (c: number, r: number, cells: number) => {
			for (let dr = -cells; dr <= cells; dr++)
				for (let dc = -cells; dc <= cells; dc++) {
					if (dc * dc + dr * dr > cells * cells) continue;
					const cc = c + dc;
					const rr = r + dr;
					if (cc < 0 || rr < 0 || cc >= cols || rr >= rows || !bare[rr * cols + cc]) return false;
				}
			return true;
		};

		const boxCache = new Map<string, { at: number; boxes: DOMRect[] }>();

		const env: EffectEnv = {
			width: 0,
			height: 0,
			get colours() {
				return live.current.colours;
			},
			get spice() {
				return live.current.spice;
			},
			findSpace(radius, score) {
				if (performance.now() - mappedAt > 2000) mapSpace();
				const cells = Math.ceil(radius / CELL);
				let best: Spot | null = null;
				let bestScore = -Infinity;
				for (let i = 0; i < (score ? 400 : 80); i++) {
					const c = Math.floor(Math.random() * cols);
					const r = Math.floor(Math.random() * rows);
					if (!roomAt(c, r, cells)) continue;
					const spot = { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
					if (!score) return spot;
					const s = score(spot);
					if (s > bestScore) {
						bestScore = s;
						best = spot;
					}
				}
				return best;
			},
			hasSpace(spot, radius) {
				if (performance.now() - mappedAt > 2000) mapSpace();
				return roomAt(Math.floor(spot.x / CELL), Math.floor(spot.y / CELL), Math.ceil(radius / CELL));
			},
			boxes(selector, limit = 200) {
				const now = performance.now();
				const cached = boxCache.get(selector);
				if (cached && now - cached.at < 1000) return cached.boxes;
				const boxes: DOMRect[] = [];
				for (const el of document.querySelectorAll(selector)) {
					const r = el.getBoundingClientRect();
					if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > env.height) continue;
					boxes.push(r);
					if (boxes.length >= limit) break;
				}
				boxCache.set(selector, { at: now, boxes });
				return boxes;
			},
		};
		const drawn = EFFECTS[effect].make(env);

		const measure = () => {
			const selector = live.current.overBoard ? AVOID : `${BOARD}, ${AVOID}`;
			avoid = [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect());
			drawn.measure?.(env);
		};

		const resize = () => {
			const ratio = Math.min(window.devicePixelRatio || 1, 1);
			env.width = window.innerWidth;
			env.height = window.innerHeight;
			canvas.width = Math.round(env.width * ratio);
			canvas.height = Math.round(env.height * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			mappedAt = -Infinity;
			measure();
		};

		const draw = (now: number) => {
			raf = requestAnimationFrame(draw);
			if (now - last < 1000 / FPS) return;
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			// Things open, close and move: look again every second or so.
			if (frame++ % FPS === 0) measure();
			ctx.clearRect(0, 0, env.width, env.height);
			ctx.save();
			// Everywhere except the board (and any open window).
			if (avoid.length) {
				ctx.beginPath();
				ctx.rect(0, 0, env.width, env.height);
				for (const r of avoid) ctx.rect(r.right, r.top, -r.width, r.height);
				ctx.clip("evenodd");
			}
			drawn.draw(ctx, env, (now - started) / 1000, dt);
			ctx.restore();
		};

		const start = () => {
			cancelAnimationFrame(raf);
			if (reduced.matches || document.hidden) {
				ctx.clearRect(0, 0, env.width, env.height);
				return;
			}
			last = performance.now();
			raf = requestAnimationFrame(draw);
		};

		resize();
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
	}, [effect]);

	return <canvas ref={canvasRef} className="theme-effect" aria-hidden="true" />;
}
