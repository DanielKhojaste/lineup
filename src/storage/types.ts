import { isSport, Sport } from "../model/sports";
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
	/** A colour for a folder ("#5FB15F"), by its name; a folder without one uses the theme's. */
	folderColors?: Record<string, string>;
	/** Which sports each team plays: "U12 Girls" can be a soccer team and a basketball team. */
	teamSports?: Record<string, Sport[]>;
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
		...(index.folderColors && typeof index.folderColors === "object"
			? {
					folderColors: Object.fromEntries(
						Object.entries(index.folderColors as Record<string, unknown>).filter(
							(e): e is [string, string] => typeof e[1] === "string" && /^#[0-9a-f]{6}$/i.test(e[1]),
						),
					),
				}
			: {}),
		...(index.teamSports && typeof index.teamSports === "object"
			? {
					teamSports: Object.fromEntries(
						Object.entries(index.teamSports as Record<string, unknown>).map(([team, sports]) => [
							team,
							Array.isArray(sports) ? [...new Set(sports.filter(isSport))] : [],
						]),
					),
				}
			: {}),
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
