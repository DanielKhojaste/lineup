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
