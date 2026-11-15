/**
 * A log for finding bugs, in development only (`npm run tauri dev` or
 * `npm run dev`). Release builds keep nothing and write nothing, so people
 * using Lineup never see a log or a log file.
 *
 * What it keeps: errors and warnings (Lineup's own, React's, anything
 * uncaught) and a few events worth knowing about (the library loading, saves
 * that failed, imports). Each line has the time, the level and where it came
 * from.
 *
 * Where it goes:
 * - the browser console, as usual
 * - the last 500 lines in memory: `__lineupLog()` in the dev tools prints them
 * - in the desktop app, a file per day in `Documents\Lineup\logs\`
 *   (`dev-2026-11-15.log`), easy to attach when reporting a bug
 */

type Level = "debug" | "info" | "warn" | "error";

const ENABLED = import.meta.env.DEV;
const KEEP = 500;
const DIR = "Lineup/logs";

const lines: string[] = [];
let pending: string[] = [];
let flushing = false;

function format(value: unknown): string {
	if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function write(level: Level, scope: string, parts: unknown[]) {
	if (!ENABLED) return;
	const time = new Date().toISOString().slice(11, 23);
	const line = `${time} ${level.toUpperCase().padEnd(5)} [${scope}] ${parts.map(format).join(" ")}`;
	lines.push(line);
	if (lines.length > KEEP) lines.splice(0, lines.length - KEEP);
	pending.push(line);
	scheduleFlush();
}

function isDesktop() {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Add what's new to today's file, a few seconds at a time. */
function scheduleFlush() {
	if (flushing || !isDesktop()) return;
	flushing = true;
	window.setTimeout(async () => {
		const text = pending.join("\n") + "\n";
		pending = [];
		try {
			const [{ chooseBase }, fs] = await Promise.all([
				import("../storage/tauri"),
				import("@tauri-apps/plugin-fs"),
			]);
			const { baseDir } = await chooseBase();
			if (!(await fs.exists(DIR, { baseDir }))) await fs.mkdir(DIR, { baseDir, recursive: true });
			const day = new Date().toISOString().slice(0, 10);
			await fs.writeTextFile(`${DIR}/dev-${day}.log`, text, { baseDir, append: true });
		} catch {
			// Logging must never get in the way; the console still has it.
		} finally {
			flushing = false;
			if (pending.length) scheduleFlush();
		}
	}, 3000);
}

/** A logger for one part of the app: `const log = logger("library")`. */
export function logger(scope: string) {
	return {
		debug: (...parts: unknown[]) => write("debug", scope, parts),
		info: (...parts: unknown[]) => write("info", scope, parts),
		warn: (...parts: unknown[]) => write("warn", scope, parts),
		error: (...parts: unknown[]) => write("error", scope, parts),
	};
}

/**
 * Start logging (development only): catches uncaught errors and promise
 * rejections, and copies console warnings and errors into the log.
 */
export function startDevLog() {
	if (!ENABLED || typeof window === "undefined") return;
	const original = { warn: console.warn, error: console.error };
	console.warn = (...args: unknown[]) => {
		write("warn", "console", args);
		original.warn(...args);
	};
	console.error = (...args: unknown[]) => {
		write("error", "console", args);
		original.error(...args);
	};
	window.addEventListener("error", (e) => write("error", "uncaught", [e.error ?? e.message]));
	window.addEventListener("unhandledrejection", (e) => write("error", "promise", [e.reason]));
	(window as unknown as { __lineupLog: () => void }).__lineupLog = () =>
		console.log(lines.join("\n"));
	write("info", "app", [`Lineup ${import.meta.env.MODE} started, ${navigator.userAgent}`]);
}
