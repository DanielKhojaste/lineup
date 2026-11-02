/**
 * Undo and redo for a document editor. Typing in a field is one "gesture":
 * changes made between `begin` and `end` become a single undo step.
 */
export interface History<T> {
	past: T[];
	present: T;
	future: T[];
	gestureBase: T | null;
}

export type HistoryAction =
	| { type: "beginGesture" }
	| { type: "endGesture" }
	| { type: "undo" }
	| { type: "redo" };

const LIMIT = 200;

export function createHistory<T>(present: T): History<T> {
	return { past: [], present, future: [], gestureBase: null };
}

/** Record a change (or, during a gesture, just show it). */
export function commit<T>(h: History<T>, present: T): History<T> {
	if (present === h.present) return h;
	if (h.gestureBase) return { ...h, present };
	return {
		...h,
		past: [...h.past, h.present].slice(-LIMIT),
		present,
		future: [],
	};
}

/** Undo, redo and gestures; null for any other action. */
export function historyAction<T>(
	h: History<T>,
	action: { type: string },
): History<T> | null {
	switch (action.type) {
		case "beginGesture":
			return h.gestureBase ? h : { ...h, gestureBase: h.present };
		case "endGesture": {
			const base = h.gestureBase;
			if (!base) return h;
			if (base === h.present) return { ...h, gestureBase: null };
			return {
				past: [...h.past, base].slice(-LIMIT),
				present: h.present,
				future: [],
				gestureBase: null,
			};
		}
		case "undo":
			if (h.gestureBase || h.past.length === 0) return h;
			return {
				...h,
				past: h.past.slice(0, -1),
				present: h.past[h.past.length - 1],
				future: [h.present, ...h.future],
			};
		case "redo":
			if (h.gestureBase || h.future.length === 0) return h;
			return {
				...h,
				past: [...h.past, h.present],
				present: h.future[0],
				future: h.future.slice(1),
			};
		default:
			return null;
	}
}

/** Whether the undo and redo buttons should be on. */
export function canUndoRedo<T>(h: History<T>) {
	const editing = !!h.gestureBase && h.gestureBase !== h.present;
	return {
		canUndo: h.past.length > 0 || editing,
		canRedo: h.future.length > 0 && !editing,
	};
}
