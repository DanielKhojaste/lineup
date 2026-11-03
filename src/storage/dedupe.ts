import { fileNameFor } from "../model/file";
import { newId } from "../model/board";

/**
 * Documents read from a folder, with the file each came from. Two files can
 * hold the same document id (a file copied into the library folder by hand,
 * or one that was saved again under its id while the copy stayed). The app
 * keys everything by id, so a repeat gets a new id and is reported, to be
 * written back under that id.
 */
export function giveRepeatsNewIds<T extends { id: string }>(
	loaded: { doc: T; file: string }[],
): { docs: { doc: T; file: string }[]; changed: { doc: T; file: string }[] } {
	const seen = new Set<string>();
	const changed: { doc: T; file: string }[] = [];
	const docs = loaded.map((entry) => {
		if (!seen.has(entry.doc.id)) {
			seen.add(entry.doc.id);
			return entry;
		}
		const renewed = { ...entry, doc: { ...entry.doc, id: newId() } };
		seen.add(renewed.doc.id);
		changed.push(renewed);
		return renewed;
	});
	return { docs, changed };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The file name a document is saved under: its title ("Cool Board.lineup").
 * When another document already has that name, the date and time it was made
 * are added ("Untitled board (2026-11-02 18.05).lineup"), and if that's taken
 * too, the start of its id. `taken` holds the other files' names, lower-cased
 * (Windows and macOS don't tell "a" and "A" apart).
 */
export function libraryFileName(
	title: string,
	extension: string,
	createdAt: string,
	id: string,
	taken: Set<string>,
	fallback = "Untitled",
): string {
	const base = fileNameFor(title || fallback, extension).slice(0, -(extension.length + 1));
	const free = (name: string) => !taken.has(name.toLowerCase());
	const plain = `${base}.${extension}`;
	if (free(plain)) return plain;
	const d = new Date(createdAt);
	const stamp = Number.isNaN(d.getTime())
		? ""
		: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}.${pad(d.getMinutes())}`;
	const dated = `${base} (${stamp}).${extension}`;
	if (stamp && free(dated)) return dated;
	return `${base} (${stamp ? `${stamp}, ` : ""}${id.slice(0, 8)}).${extension}`;
}
