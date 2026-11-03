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
import { createSession, Session } from "../model/session";
import { Sport } from "../model/sports";
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
	sessions: Session[];
	/** Session topics the coach made up (kept in library.json). */
	topics: string[];
	addTopics: (topics: string[]) => Promise<void>;
	getSession: (id: string) => Session | undefined;
	createSession: (folder?: string, sport?: Sport | "") => Promise<Session>;
	saveSession: (session: Session) => Promise<void>;
	duplicateSession: (id: string) => Promise<Session | undefined>;
	deleteSession: (id: string) => Promise<void>;
	moveSessionToFolder: (id: string, folder: string) => Promise<void>;
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

const byUpdated = (
	a: { meta: { updatedAt: string } },
	b: { meta: { updatedAt: string } },
) =>
	b.meta.updatedAt.localeCompare(a.meta.updatedAt);

export function LibraryProvider({ children }: { children: ReactNode }) {
	const [status, setStatus] = useState<LibraryStatus>("loading");
	const [error, setError] = useState<string | null>(null);
	const [problems, setProblems] = useState<string[]>([]);
	const [location, setLocation] = useState("");
	const [boards, setBoards] = useState<Board[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const sessionsRef = useRef<Session[]>([]);
	sessionsRef.current = sessions;
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
				const [{ boards: loaded, sessions, problems }, index] = await Promise.all([
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
				setSessions(sessions.sort(byUpdated));
				setFolders(index.folders);
				indexRef.current = index;
				setTopics(index.topics);
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

	const [topics, setTopics] = useState<string[]>([]);
	const indexRef = useRef<LibraryIndex>({ version: 1, folders: [], topics: [] });

	const writeIndex = useCallback(async (next: string[]) => {
		setFolders(next);
		indexRef.current = { ...indexRef.current, folders: next };
		await store().saveIndex(indexRef.current);
	}, []);

	/** Remember topics the coach made up, so they're suggested in every session. */
	const addTopics = useCallback(async (added: string[]) => {
		const known = new Set(indexRef.current.topics.map((t) => t.toLowerCase()));
		const fresh = added
			.map((t) => t.trim())
			.filter((t) => t && !known.has(t.toLowerCase()));
		if (!fresh.length) return;
		indexRef.current = {
			...indexRef.current,
			topics: [...indexRef.current.topics, ...fresh],
		};
		setTopics(indexRef.current.topics);
		await store().saveIndex(indexRef.current);
	}, []);

	const saveBoard = useCallback(async (board: Board) => {
		const stamped = {
			...board,
			meta: { ...board.meta, updatedAt: new Date().toISOString() },
		};
		setBoards((prev) => [stamped, ...prev.filter((b) => b.id !== board.id)]);
		await store().save(stamped);
	}, []);

	const saveSession = useCallback(async (session: Session) => {
		const stamped = {
			...session,
			meta: { ...session.meta, updatedAt: new Date().toISOString() },
		};
		setSessions((prev) => [
			stamped,
			...prev.filter((s) => s.id !== session.id),
		]);
		await store().saveSession(stamped);
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

			sessions,
			topics,
			addTopics,
			getSession: (id) => sessionsRef.current.find((s) => s.id === id),
			saveSession,

			createSession: async (folder = "", sport = "") => {
				const session = createSession();
				session.header.sport = sport;
				session.meta.folder = folder;
				await saveSession(session);
				return session;
			},

			duplicateSession: async (id) => {
				const original = sessionsRef.current.find((s) => s.id === id);
				if (!original) return undefined;
				const now = new Date().toISOString();
				const copy: Session = {
					...structuredClone(original),
					id: newId(),
					meta: {
						...original.meta,
						title: `${original.meta.title} (copy)`,
						createdAt: now,
						updatedAt: now,
					},
				};
				await saveSession(copy);
				return copy;
			},

			deleteSession: async (id) => {
				setSessions((prev) => prev.filter((s) => s.id !== id));
				await store().removeSession(id);
			},

			moveSessionToFolder: async (id, folder) => {
				const session = sessionsRef.current.find((s) => s.id === id);
				if (session)
					await saveSession({ ...session, meta: { ...session.meta, folder } });
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
				for (const session of sessionsRef.current.filter(
					(s) => s.meta.folder === from,
				)) {
					await saveSession({
						...session,
						meta: { ...session.meta, folder: clean },
					});
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
				for (const session of sessionsRef.current.filter(
					(s) => s.meta.folder === name,
				)) {
					await saveSession({ ...session, meta: { ...session.meta, folder: "" } });
				}
			},
		}),
		[
			status,
			error,
			problems,
			location,
			boards,
			sessions,
			topics,
			addTopics,
			folders,
			saveBoard,
			saveSession,
			writeIndex,
		],
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

/** Folders in use: those in the index plus any a board or session mentions (e.g. after an import). */
export function allFolders(
	folders: string[],
	docs: { meta: { folder: string } }[],
): string[] {
	const extra = docs
		.map((b) => b.meta.folder)
		.filter((f) => f && !folders.includes(f));
	return [...folders, ...new Set(extra)];
}
