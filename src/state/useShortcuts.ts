import { useEffect } from "react";
import { ROTATE_STEP } from "../model/board";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../model/pitch";
import { useEditor } from "./EditorContext";
import { usePlayback } from "./PlaybackContext";
import { Tool } from "./editor";
import { copySelection, cutSelection, paste } from "./itemClipboard";

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

/**
 * The shortcuts listed in Settings. Each entry in `keys` is one combination
 * (keys pressed together); `join` is shown between combinations. Words that
 * aren't keys ("click", "drag a box") are written as they are.
 */
export interface Shortcut {
	group: "Tools" | "Selecting and moving" | "Editing" | "Animation";
	keys: string[][];
	/** Between two ways of doing the same thing ("Ctrl+Y or Ctrl+Shift+Z"). */
	join?: "or";
	note?: string;
	action: string;
}

export const SHORTCUTS: Shortcut[] = [
	{ group: "Tools", keys: [["V"]], action: "Select" },
	{ group: "Tools", keys: [["1"]], action: "Home player" },
	{ group: "Tools", keys: [["2"]], action: "Away player" },
	{ group: "Tools", keys: [["3"]], action: "Neutral player" },
	{ group: "Tools", keys: [["C"]], action: "Cone" },
	{ group: "Tools", keys: [["B"]], action: "Ball" },
	{ group: "Tools", keys: [["G"]], action: "Goal" },
	{ group: "Tools", keys: [["M"]], action: "Mannequin" },
	{ group: "Tools", keys: [["O"]], action: "Pole" },
	{ group: "Tools", keys: [["R"]], action: "Run arrow" },
	{ group: "Tools", keys: [["P"]], action: "Pass arrow" },
	{ group: "Tools", keys: [["D"]], action: "Dribble arrow" },
	{ group: "Tools", keys: [["L"]], action: "Line" },
	{ group: "Tools", keys: [["Z"]], action: "Zone" },
	{ group: "Tools", keys: [["F"]], action: "Pen" },
	{ group: "Tools", keys: [["T"]], action: "Text" },
	{ group: "Tools", keys: [["E"]], action: "Eraser" },
	{ group: "Tools", keys: [["Shift"]], note: "while drawing", action: "Snap the angle, or a square zone" },
	{ group: "Tools", keys: [["Esc"]], action: "Back to Select, or clear the selection" },
	{ group: "Selecting and moving", keys: [["Ctrl", "A"]], action: "Select everything" },
	{ group: "Selecting and moving", keys: [["Shift", "click"], ["drag a box"]], join: "or", action: "Select several" },
	{ group: "Selecting and moving", keys: [["Arrow keys"]], action: "Nudge (hold Shift for more)" },
	{ group: "Selecting and moving", keys: [["Shift", "R"]], action: "Turn a goal or mannequin 15° right" },
	{ group: "Selecting and moving", keys: [["Alt", "Shift", "R"]], action: "Turn a goal or mannequin 15° left" },
	{ group: "Selecting and moving", keys: [["]"]], action: "Bring to front" },
	{ group: "Selecting and moving", keys: [["["]], action: "Send to back" },
	{ group: "Editing", keys: [["Ctrl", "C"]], action: "Copy (also between boards)" },
	{ group: "Editing", keys: [["Ctrl", "X"]], action: "Cut" },
	{ group: "Editing", keys: [["Ctrl", "V"]], action: "Paste" },
	{ group: "Editing", keys: [["Ctrl", "D"]], action: "Duplicate" },
	{ group: "Editing", keys: [["Delete"]], action: "Delete" },
	{ group: "Editing", keys: [["Ctrl", "Z"]], action: "Undo" },
	{ group: "Editing", keys: [["Ctrl", "Y"], ["Ctrl", "Shift", "Z"]], join: "or", action: "Redo" },
	{ group: "Editing", keys: [["double-click"]], action: "Edit a player or a text" },
	{ group: "Editing", keys: [["right-click"], ["Menu key"]], join: "or", action: "Actions for what's under the pointer" },
	{ group: "Animation", keys: [["W"]], action: "Route: click where a marker runs" },
	{ group: "Animation", keys: [["Space"]], action: "Play or pause" },
	{ group: "Animation", keys: [[","]], action: "Previous step" },
	{ group: "Animation", keys: [["."]], action: "Next step" },
];

function isTyping(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return (
		// A dialog has the keyboard: Delete or Ctrl+Z there mustn't touch the board.
		!!target.closest("dialog") ||
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
			if (mod && (key === "c" || key === "x")) {
				if (!ids.length) return;
				handled();
				if (key === "c") copySelection(state);
				else cutSelection(state, dispatch);
				return;
			}
			if (mod && key === "v") {
				handled();
				paste(dispatch);
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
	}, [enabled, state, dispatch, playback]);
}
