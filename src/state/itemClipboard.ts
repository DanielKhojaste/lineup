import { useSyncExternalStore } from "react";
import { boardAtStep } from "../model/animation";
import { offsetDrawing } from "../model/drawings";
import { Board, BoardNode, Drawing, Point } from "../model/types";
import { DUPLICATE_OFFSET, EditorAction, EditorState } from "./editor";

/**
 * Markers and drawings copied with Ctrl+C or Cut, kept for this run of the
 * app so they can be pasted on the same board or another one.
 */
export interface CopiedItems {
	nodes: BoardNode[];
	drawings: Drawing[];
}

let copied: CopiedItems | null = null;
const listeners = new Set<() => void>();

/** Copy the given items of a board, in the order they're drawn. */
export function copyItems(board: Board, ids: string[]): boolean {
	const targets = new Set(ids);
	const nodes = board.nodes.filter((n) => targets.has(n.id));
	const drawings = board.drawings.filter((d) => targets.has(d.id));
	if (nodes.length === 0 && drawings.length === 0) return false;
	copied = structuredClone({ nodes, drawings });
	listeners.forEach((l) => l());
	return true;
}

/**
 * The copied items for pasting with Ctrl+V. Each paste moves the copy on a
 * little, so pasting again doesn't land exactly on top of the last one.
 */
export function takeCopiedItems(): CopiedItems | null {
	const current = copied;
	if (current) {
		const { x, y } = DUPLICATE_OFFSET;
		copied = {
			nodes: current.nodes.map((n) => ({ ...n, x: n.x + x, y: n.y + y })),
			drawings: current.drawings.map((d) => offsetDrawing(d, x, y)),
		};
	}
	return current;
}

/** The copied items, updating when something new is copied. */
export function useCopiedItems(): CopiedItems | null {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => copied,
	);
}

/** What's on the board as the user sees it (on an animation step, markers are where that step leaves them). */
const visibleBoard = (state: EditorState): Board =>
	state.step > 0 ? boardAtStep(state.board, state.step) : state.board;

/** Copy the selection (Ctrl+C). */
export function copySelection(state: EditorState): boolean {
	return copyItems(visibleBoard(state), state.selection);
}

/** Cut the selection (Ctrl+X): copy it, then delete it. */
export function cutSelection(
	state: EditorState,
	dispatch: (a: EditorAction) => void,
) {
	if (copySelection(state))
		dispatch({ type: "deleteItems", ids: state.selection });
}

/** Paste what was copied (Ctrl+V), next to where it was or centred on `at`. */
export function paste(dispatch: (a: EditorAction) => void, at?: Point) {
	const items = takeCopiedItems();
	if (items) dispatch({ type: "pasteItems", ...items, at });
}
