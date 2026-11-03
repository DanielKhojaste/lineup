import {
	cleanMinutes,
	cleanPlayers,
	cleanTopics,
	Session,
	SessionBlock,
	SessionHeader,
	SessionMeta,
} from "../model/session";
import { newId } from "../model/board";

/** The session being edited, with undo and redo. */
export interface SessionState {
	past: Session[];
	session: Session;
	future: Session[];
	/**
	 * Snapshot taken when a text field is focused: everything typed until it
	 * loses focus becomes one undo step.
	 */
	gestureBase: Session | null;
}

export type BlockPatch = Partial<
	Pick<SessionBlock, "minutes" | "notes"> & {
		label: string;
		boardId: string;
		stage: string;
	}
>;

export type SessionAction =
	| { type: "updateMeta"; patch: Partial<SessionMeta> }
	| { type: "updateHeader"; patch: Partial<SessionHeader> }
	/** Insert blocks at `index` (the end when missing). */
	| { type: "addBlocks"; blocks: SessionBlock[]; index?: number }
	| { type: "updateBlock"; id: string; patch: BlockPatch }
	| { type: "removeBlock"; id: string }
	| { type: "duplicateBlock"; id: string }
	/** Move a block so it ends up at `index` in the list. */
	| { type: "moveBlock"; id: string; index: number }
	| { type: "beginGesture" }
	| { type: "endGesture" }
	| { type: "undo" }
	| { type: "redo" };

const HISTORY_LIMIT = 200;

export function createSessionState(session: Session): SessionState {
	return { past: [], session, future: [], gestureBase: null };
}

function commit(state: SessionState, session: Session): SessionState {
	if (state.gestureBase) return { ...state, session };
	return {
		...state,
		past: [...state.past, state.session].slice(-HISTORY_LIMIT),
		session,
		future: [],
	};
}

function withBlocks(state: SessionState, blocks: SessionBlock[]): SessionState {
	return commit(state, { ...state.session, blocks });
}

export function sessionReducer(
	state: SessionState,
	action: SessionAction,
): SessionState {
	const { session } = state;
	const blocks = session.blocks;

	switch (action.type) {
		case "updateMeta":
			return commit(state, {
				...session,
				meta: { ...session.meta, ...action.patch },
			});

		case "updateHeader": {
			const patch = { ...action.patch };
			if (patch.plannedMinutes !== undefined && patch.plannedMinutes !== null)
				patch.plannedMinutes = cleanMinutes(patch.plannedMinutes) || null;
			if (patch.topics) patch.topics = cleanTopics(patch.topics);
			if (patch.playersMin !== undefined) patch.playersMin = cleanPlayers(patch.playersMin);
			if (patch.playersMax !== undefined) patch.playersMax = cleanPlayers(patch.playersMax);
			return commit(state, {
				...session,
				header: { ...session.header, ...patch },
			});
		}

		case "addBlocks": {
			if (action.blocks.length === 0) return state;
			const at = Math.max(
				0,
				Math.min(blocks.length, action.index ?? blocks.length),
			);
			return withBlocks(state, [
				...blocks.slice(0, at),
				...action.blocks,
				...blocks.slice(at),
			]);
		}

		case "updateBlock": {
			let changed = false;
			const next = blocks.map((b) => {
				if (b.id !== action.id) return b;
				const patch = { ...action.patch };
				if (patch.minutes !== undefined)
					patch.minutes = cleanMinutes(patch.minutes);
				// Only drills have a board, only breaks and custom blocks a label.
				if (b.kind === "drill") delete patch.label;
				else {
					delete patch.boardId;
					delete patch.stage;
				}
				const updated = { ...b, ...patch } as SessionBlock;
				if (JSON.stringify(updated) === JSON.stringify(b)) return b;
				changed = true;
				return updated;
			});
			return changed ? withBlocks(state, next) : state;
		}

		case "removeBlock": {
			const next = blocks.filter((b) => b.id !== action.id);
			return next.length === blocks.length ? state : withBlocks(state, next);
		}

		case "duplicateBlock": {
			const index = blocks.findIndex((b) => b.id === action.id);
			if (index === -1) return state;
			const copy = { ...blocks[index], id: newId() };
			return withBlocks(state, [
				...blocks.slice(0, index + 1),
				copy,
				...blocks.slice(index + 1),
			]);
		}

		case "moveBlock": {
			const from = blocks.findIndex((b) => b.id === action.id);
			const to = Math.max(0, Math.min(blocks.length - 1, action.index));
			if (from === -1 || from === to) return state;
			const next = [...blocks];
			const [moved] = next.splice(from, 1);
			next.splice(to, 0, moved);
			return withBlocks(state, next);
		}

		case "beginGesture":
			return state.gestureBase ? state : { ...state, gestureBase: session };

		case "endGesture": {
			const base = state.gestureBase;
			if (!base) return state;
			if (base === session) return { ...state, gestureBase: null };
			return {
				past: [...state.past, base].slice(-HISTORY_LIMIT),
				session,
				future: [],
				gestureBase: null,
			};
		}

		case "undo": {
			if (state.gestureBase || state.past.length === 0) return state;
			const previous = state.past[state.past.length - 1];
			return {
				...state,
				past: state.past.slice(0, -1),
				session: previous,
				future: [session, ...state.future],
			};
		}

		case "redo": {
			if (state.gestureBase || state.future.length === 0) return state;
			const [next, ...rest] = state.future;
			return {
				...state,
				past: [...state.past, session],
				session: next,
				future: rest,
			};
		}
	}
}
