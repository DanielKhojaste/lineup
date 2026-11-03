import { describe, expect, it } from "vitest";
import { giveRepeatsNewIds } from "./dedupe";

describe("documents that share an id", () => {
	it("keeps the first and gives the others new ids", () => {
		const { docs, changed } = giveRepeatsNewIds([
			{ doc: { id: "a", title: "Barça" }, file: "a.lineup" },
			{ doc: { id: "b", title: "Rondo" }, file: "b.lineup" },
			{ doc: { id: "a", title: "Barça" }, file: "barca-real-madrid-2023.lineup" },
		]);
		const ids = docs.map((d) => d.doc.id);
		expect(new Set(ids).size).toBe(3);
		expect(ids.slice(0, 2)).toEqual(["a", "b"]);
		expect(changed).toHaveLength(1);
		expect(changed[0].file).toBe("barca-real-madrid-2023.lineup");
		expect(changed[0].doc.title).toBe("Barça");
	});
});

describe("library file names", () => {
	it("names files after the title, adding the date and then the id when taken", async () => {
		const { libraryFileName } = await import("./dedupe");
		const created = new Date(2026, 10, 2, 18, 5).toISOString();
		const taken = new Set<string>();
		const first = libraryFileName("Cool Board", "lineup", created, "aaaaaaaa-1", taken);
		expect(first).toBe("Cool Board.lineup");
		taken.add(first.toLowerCase());
		const second = libraryFileName("cool board", "lineup", created, "bbbbbbbb-2", taken);
		expect(second).toBe("cool board (2026-11-02 18.05).lineup");
		taken.add(second.toLowerCase());
		const third = libraryFileName("Cool Board", "lineup", created, "cccccccc-3", taken);
		expect(third).toBe("Cool Board (2026-11-02 18.05, cccccccc).lineup");
		expect(libraryFileName("", "lineup-session", created, "d", new Set(), "Untitled session")).toBe(
			"Untitled session.lineup-session",
		);
	});
});
