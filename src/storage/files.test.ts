import { describe, expect, it } from "vitest";
import { createBoard } from "../model/board";
import { encodeBoardFile } from "../model/file";
import { createSession, encodeSessionFile } from "../model/session";
import { readLibraryDocument } from "./files";

describe("readLibraryDocument", () => {
	it("reads a session file as a session", () => {
		const session = createSession("Playing through the thirds");
		const doc = readLibraryDocument(encodeSessionFile(session));
		expect(doc.kind).toBe("session");
		if (doc.kind === "session") {
			expect(doc.session.id).toBe(session.id);
			expect(doc.session.meta.title).toBe("Playing through the thirds");
		}
	});

	it("reads a board file as a board", () => {
		const board = createBoard("Rondo");
		const doc = readLibraryDocument(encodeBoardFile(board));
		expect(doc.kind).toBe("board");
		if (doc.kind === "board") expect(doc.board.id).toBe(board.id);
	});
});
