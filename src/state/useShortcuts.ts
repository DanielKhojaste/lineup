import { useEffect } from "react";
import { ROTATE_STEP } from "../model/board";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../model/pitch";
import { useEditor } from "./EditorContext";
import { usePlayback } from "./PlaybackContext";
import { Tool } from "./editor";

const TOOL_KEYS: Record<string, Tool> = {
	v: "select",
	"1": "home",
	"2": "away",
	"3": "neutral",
	c: "cone",
	b: "ball",
	g: "goal",
	m: "mannequin",
	o: "pole",
	r: "run",
	p: "pass",
	d: "dribble",
	l: "line",
	z: "zone",
	f: "pen",
	t: "text",
	e: "eraser",
	w: "route",
};

/** Nudge distance in normalised board units (roughly half a metre). */
const NUDGE = 0.005;

export const SHORTCUTS: { keys: string; action: string }[] = [
	{ keys: "V", action: "Select" },
	{ keys: "1 / 2 / 3", action: "Home / away / neutral player" },
	{ keys: "C, B", action: "Cone, ball" },
	{ keys: "G, M, O", action: "Goal, mannequin, pole" },
	{ keys: "R, P, D", action: "Run, pass, dribble arrow" },
	{ keys: "L, Z", action: "Line, zone" },
	{ keys: "F, T, E", action: "Pen, text, eraser" },
	{ keys: "Shift (while drawing)", action: "Snap angle / square zone" },
	{ keys: "W", action: "Route: click where a marker runs" },
	{ keys: "Space", action: "Play / pause the animation" },
	{ keys: ", / .", action: "Previous / next step" },
	{ keys: "Esc", action: "Back to Select, or clear the selection" },
	{ keys: "Ctrl+A", action: "Select everything" },
	{ keys: "Shift+click, drag a box", action: "Select several" },
	{ keys: "Arrow keys", action: "Nudge (hold Shift for more)" },
	{
		keys: "Shift+R, Alt+Shift+R",
		action: "Turn a goal or mannequin 15° right / left",
	},
	{ keys: "Ctrl+D", action: "Duplicate" },
	{ keys: "Delete", action: "Delete" },
	{ keys: "] / [", action: "Bring to front / send to back" },
	{ keys: "Ctrl+Z", action: "Undo" },
	{ keys: "Ctrl+Y, Ctrl+Shift+Z", action: "Redo" },
	{ keys: "Double-click", action: "Edit a player or a text" },
];

function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
}

/** Global editor keyboard shortcuts. Ignored while typing in a field or a dialog is open. */
export function useShortcuts(enabled: boolean) {
	const { state, dispatch } = useEditor();
	const playback = usePlayback();

	useEffect(() => {
		if (!enabled) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || isTyping(e.target)) return;
			const mod = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();
			const ids = state.selection;
			const handled = () => e.preventDefault();

			if (mod && key === "z") {
				handled();
				dispatch({ type: e.shiftKey ? "redo" : "undo" });
				return;
			}
			if (mod && key === "y") {
				handled();
				dispatch({ type: "redo" });
				return;
			}
			if (mod && key === "a") {
				handled();
				dispatch({ type: "selectAll" });
				return;
			}
			if (mod && key === "d") {
				handled();
				if (ids.length) dispatch({ type: "duplicateItems", ids });
				return;
			}
			// Shift+R turns clockwise, Alt+Shift+R anticlockwise. Matched on the key's
			// position because Alt changes the character on some keyboards.
			if (e.code === "KeyR" && e.shiftKey && !mod) {
				if (ids.length) {
					handled();
					dispatch({
						type: "rotateNodes",
						ids,
						by: e.altKey ? -ROTATE_STEP : ROTATE_STEP,
					});
				}
				return;
			}
			if (mod || e.altKey) return;

			if (key === " ") {
				if (state.board.steps.length) {
					handled();
					playback.toggle();
				}
				return;
			}
			if (key === "," || key === ".") {
				handled();
				if (playback.time !== null) playback.stop();
				dispatch({
					type: "setStep",
					step: state.step + (key === "," ? -1 : 1),
				});
				return;
			}

			if (key === "delete" || key === "backspace") {
				if (ids.length) {
					handled();
					dispatch({ type: "deleteItems", ids });
				}
				return;
			}
			if (key === "escape") {
				if (state.tool !== "select")
					dispatch({ type: "setTool", tool: "select" });
				else dispatch({ type: "clearSelection" });
				return;
			}
			if (key === "]" || key === "[") {
				if (ids.length)
					dispatch({
						type: "reorderItems",
						ids,
						to: key === "]" ? "front" : "back",
					});
				return;
			}
			if (key.startsWith("arrow")) {
				if (!ids.length) return;
				handled();
				const step = e.shiftKey ? NUDGE * 4 : NUDGE;
				const dx =
					key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
				// The board is wider than it is tall, so scale vertical steps to match.
				const dy =
					(key === "arrowup" ? -step : key === "arrowdown" ? step : 0) *
					(BOARD_WIDTH / BOARD_HEIGHT);
				dispatch({ type: "moveItems", ids, dx, dy });
				return;
			}
			const tool = TOOL_KEYS[key];
			if (tool && !e.shiftKey) {
				handled();
				dispatch({ type: "setTool", tool });
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		enabled,
		state.selection,
		state.tool,
		state.step,
		state.board.steps.length,
		dispatch,
		playback,
	]);
}
