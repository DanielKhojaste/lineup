import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createBoard, newId } from "../model/board";
import { parseBoard } from "../model/file";
import { Board, PitchSettings } from "../model/types";
import { getStore } from "../storage";
import { getPreferences } from "./preferences";
import { LibraryIndex, LibraryStore } from "../storage/types";

export type LibraryStatus = "loading" | "ready" | "error";

interface LibraryContextValue {
	status: LibraryStatus;
	error: string | null;
	/** Files that couldn't be read when the library loaded. */
	problems: string[];
	location: string;
	boards: Board[];
	folders: string[];
	getBoard: (id: string) => Board | undefined;
	createBoard: (folder?: string, pitch?: PitchSettings) => Promise<Board>;
	saveBoard: (board: Board) => Promise<void>;
	duplicateBoard: (id: string) => Promise<Board | undefined>;
	deleteBoard: (id: string) => Promise<void>;
	moveToFolder: (id: string, folder: string) => Promise<void>;
	addBoards: (boards: Board[]) => Promise<Board[]>;
	createFolder: (name: string) => Promise<void>;
	renameFolder: (from: string, to: string) => Promise<void>;
	deleteFolder: (name: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

/** The single board kept by v0.3–v0.4 before files existed. Moved into the library once. */
const LEGACY_DRAFT_KEY = "lineup.draft";

function takeLegacyDraft(): Board | null {
	try {
		const raw = localStorage.getItem(LEGACY_DRAFT_KEY);
		if (!raw) return null;
		localStorage.removeItem(LEGACY_DRAFT_KEY);
		const board = parseBoard(raw);
		return board.nodes.length || board.drawings.length ? board : null;
	} catch {
		return null;
	}
}

const byUpdated = (a: Board, b: Board) =>
	b.meta.updatedAt.localeCompare(a.meta.updatedAt);

export function LibraryProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<LibraryStatus>("loading");
	const [error, setError] = useState<string | null>(null);
	const [problems, setProblems] = useState<string[]>([]);
	const [location, setLocation] = useState("");
	const [boards, setBoards] = useState<Board[]>([]);
	const [folders, setFolders] = useState<string[]>([]);
	const storeRef = useRef<LibraryStore | null>(null);
	const boardsRef = useRef<Board[]>([]);
	boardsRef.current = boards;

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const store = await getStore();
				storeRef.current = store;
				const [{ boards: loaded, problems }, index] = await Promise.all([
					store.loadAll(),
					store.loadIndex(),
				]);
				const draft = takeLegacyDraft();
				if (draft && !loaded.some((b) => b.id === draft.id)) {
					await store.save(draft);
					loaded.push(draft);
				}
				if (cancelled) return;
				setLocation(store.location);
				setBoards(loaded.sort(byUpdated));
				setFolders(index.folders);
				setProblems(problems);
				setStatus("ready");
			} catch (e) {
				if (cancelled) return;
				setError((e as Error).message || String(e));
				setStatus("error");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const store = () => {
		if (!storeRef.current) throw new Error("The library isn't ready yet.");
		return storeRef.current;
	};

	const writeIndex = useCallback(async (next: string[]) => {
		setFolders(next);
		const index: LibraryIndex = { version: 1, folders: next };
		await store().saveIndex(index);
	}, []);

	const saveBoard = useCallback(async (board: Board) => {
		const stamped = {
			...board,
			meta: { ...board.meta, updatedAt: new Date().toISOString() },
		};
		setBoards((prev) => [stamped, ...prev.filter((b) => b.id !== board.id)]);
		await store().save(stamped);
	}, []);

	const value = useMemo<LibraryContextValue>(
		() => ({
			status,
			error,
			problems,
			location,
			boards,
			folders,
			getBoard: (id) => boardsRef.current.find((b) => b.id === id),
			saveBoard,

			createBoard: async (folder = "", pitch) => {
				// New boards use the default sport from Settings unless one is picked.
				const board = createBoard(
					"Untitled board",
					pitch ?? getPreferences().defaultPitch,
				);
				board.meta.folder = folder;
				await saveBoard(board);
				return board;
			},

			duplicateBoard: async (id) => {
				const original = boardsRef.current.find((b) => b.id === id);
				if (!original) return undefined;
				const now = new Date().toISOString();
				const copy: Board = {
					...structuredClone(original),
					id: newId(),
					meta: {
						...original.meta,
						title: `${original.meta.title} (copy)`,
						createdAt: now,
						updatedAt: now,
					},
				};
				await saveBoard(copy);
				return copy;
			},

			deleteBoard: async (id) => {
				setBoards((prev) => prev.filter((b) => b.id !== id));
				await store().remove(id);
			},

			moveToFolder: async (id, folder) => {
				const board = boardsRef.current.find((b) => b.id === id);
				if (board)
					await saveBoard({ ...board, meta: { ...board.meta, folder } });
			},

			/** Add imported boards. Boards whose id is already in the library get a new id. */
			addBoards: async (incoming) => {
				const ids = new Set(boardsRef.current.map((b) => b.id));
				const added: Board[] = [];
				for (const board of incoming) {
					const copy = ids.has(board.id) ? { ...board, id: newId() } : board;
					ids.add(copy.id);
					await saveBoard(copy);
					added.push(copy);
				}
				const newFolders = [
					...new Set(
						added
							.map((b) => b.meta.folder)
							.filter((f) => f && !folders.includes(f)),
					),
				];
				if (newFolders.length) await writeIndex([...folders, ...newFolders]);
				return added;
			},

			createFolder: async (name) => {
				const clean = name.trim();
				if (!clean || folders.includes(clean)) return;
				await writeIndex([...folders, clean]);
			},

			renameFolder: async (from, to) => {
				const clean = to.trim();
				if (!clean || from === clean) return;
				await writeIndex(
					folders
						.map((f) => (f === from ? clean : f))
						.filter((f, i, all) => all.indexOf(f) === i),
				);
				for (const board of boardsRef.current.filter(
					(b) => b.meta.folder === from,
				)) {
					await saveBoard({ ...board, meta: { ...board.meta, folder: clean } });
				}
			},

			/** Remove a folder; its boards stay in the library, just not in a folder. */
			deleteFolder: async (name) => {
				await writeIndex(folders.filter((f) => f !== name));
				for (const board of boardsRef.current.filter(
					(b) => b.meta.folder === name,
				)) {
					await saveBoard({ ...board, meta: { ...board.meta, folder: "" } });
				}
			},
		}),
		[status, error, problems, location, boards, folders, saveBoard, writeIndex],
	);

	return (
		<LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
	);
}

export function useLibrary(): LibraryContextValue {
	const context = useContext(LibraryContext);
	if (!context)
		throw new Error("useLibrary must be used inside <LibraryProvider>");
	return context;
}

/** Folders in use: those in the index plus any a board mentions (e.g. after an import). */
export function allFolders(folders: string[], boards: Board[]): string[] {
	const extra = boards
		.map((b) => b.meta.folder)
		.filter((f) => f && !folders.includes(f));
	return [...folders, ...new Set(extra)];
}
