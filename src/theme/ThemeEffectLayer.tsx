import { useEffect, useRef } from "react";
import { EFFECTS } from "./effects";
import { EffectColours, EffectEnv, SpiceSettings } from "./effects/types";
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

		const env: EffectEnv = {
			width: 0,
			height: 0,
			get colours() {
				return live.current.colours;
			},
			get spice() {
				return live.current.spice;
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
