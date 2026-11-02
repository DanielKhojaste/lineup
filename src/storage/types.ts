import { Session } from "../model/session";
import { Board } from "../model/types";

/** Library-wide data that isn't part of any one board. */
export interface LibraryIndex {
	version: 1;
	/** Folder names in display order, including empty folders. */
	folders: string[];
}

export const EMPTY_INDEX: LibraryIndex = { version: 1, folders: [] };

/** Everything in the library, plus the files that couldn't be read. */
export interface LibraryContents {
	boards: Board[];
	sessions: Session[];
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
	loadIndex(): Promise<LibraryIndex>;
	saveIndex(index: LibraryIndex): Promise<void>;
}
