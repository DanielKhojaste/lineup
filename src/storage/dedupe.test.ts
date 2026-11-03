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
