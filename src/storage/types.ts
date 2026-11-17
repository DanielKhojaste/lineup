import { CalendarData } from "../model/calendar";
import { Plan } from "../model/plan";
import { Session } from "../model/session";
import { Board } from "../model/types";

/** Library-wide data that isn't part of any one board. */
export interface LibraryIndex {
	version: 1;
	/** Folder names in display order, including empty folders. */
	folders: string[];
	/** Session topics the coach made up, suggested again in every session. */
	topics: string[];
	/**
	 * The coach's teams, offered wherever a team is asked for. Missing in older
	 * libraries: then it's filled in from the teams already used.
	 */
	teams?: string[];
}

export const EMPTY_INDEX: LibraryIndex = { version: 1, folders: [], topics: [] };

/** Read library.json, keeping only what makes sense. */
export function cleanIndex(raw: unknown): LibraryIndex {
	const index = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
	const strings = (v: unknown) =>
		Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
	return {
		version: 1,
		folders: strings(index.folders),
		topics: strings(index.topics),
		...(Array.isArray(index.teams) ? { teams: strings(index.teams) } : {}),
	};
}

/** Everything in the library, plus the files that couldn't be read. */
export interface LibraryContents {
	boards: Board[];
	sessions: Session[];
	plans: Plan[];
	problems: string[];
}

/**
 * Where boards live. The desktop app keeps them as files in Documents\Lineup;
 * in a plain browser (development) they go to localStorage. A cloud library
 * would be another implementation of this interface.
 */
export interface LibraryStore {
	/** Shown to the user, e.g. "Documents\Lineup". */
	readonly location: string;
	loadAll(): Promise<LibraryContents>;
	save(board: Board): Promise<void>;
	remove(id: string): Promise<void>;
	saveSession(session: Session): Promise<void>;
	removeSession(id: string): Promise<void>;
	savePlan(plan: Plan): Promise<void>;
	removePlan(id: string): Promise<void>;
	loadCalendar(): Promise<CalendarData>;
	saveCalendar(calendar: CalendarData): Promise<void>;
	loadIndex(): Promise<LibraryIndex>;
	saveIndex(index: LibraryIndex): Promise<void>;
}
