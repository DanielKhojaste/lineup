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
		expect(second).toBe("cool board (2026-11-02 18-05).lineup");
		taken.add(second.toLowerCase());
		const third = libraryFileName("Cool Board", "lineup", created, "cccccccc-3", taken);
		expect(third).toBe("Cool Board (2026-11-02 18-05, cccccccc).lineup");
		expect(libraryFileName("", "lineup-session", created, "d", new Set(), "Untitled session")).toBe(
			"Untitled session.lineup-session",
		);
	});
});

describe("safe file names", () => {
	it("works on every system", async () => {
		const { fileNameFor, FILE_NAME_MAX } = await import("../model/file");
		expect(fileNameFor("U9/U10: 4v2?", "lineup")).toBe("U9-U10 4v2.lineup");
		expect(fileNameFor("CON", "lineup")).toBe("CON_.lineup");
		expect(fileNameFor("com1.backup", "lineup")).toBe("com1.backup_.lineup");
		expect(fileNameFor("Nul", "lineup-session")).toBe("Nul_.lineup-session");
		expect(fileNameFor("Console", "lineup")).toBe("Console.lineup");
		expect(fileNameFor("Rondo...  ", "lineup")).toBe("Rondo.lineup");
		expect(fileNameFor("???", "lineup")).toBe("Untitled board.lineup");
		expect(fileNameFor("...", "lineup-session", "Untitled session")).toBe(
			"Untitled session.lineup-session",
		);
		const long = fileNameFor("x".repeat(300), "lineup-session");
		expect(long.length).toBeLessThanOrEqual(FILE_NAME_MAX + ".lineup-session".length);
	});

	it("renames older files that have dots in the time", async () => {
		const { libraryFileName } = await import("./dedupe");
		const created = new Date(2026, 10, 3, 11, 16).toISOString();
		const name = libraryFileName("", "lineup-session", created, "e", new Set(["untitled session.lineup-session"]), "Untitled session");
		expect(name).toBe("Untitled session (2026-11-03 11-16).lineup-session");
	});
});
