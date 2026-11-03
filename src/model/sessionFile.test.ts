import { describe, expect, it } from "vitest";
import { createBoard } from "./board";
import { decodeDocumentText } from "./file";
import { createSession, Session } from "./session";
import {
	drillsOf,
	encodeSharedSession,
	parseSharedSession,
	sameDrill,
} from "./sessionFile";

function sessionWith(...boardIds: string[]): Session {
	const session = createSession("Thirds");
	session.blocks = boardIds.map((boardId, i) => ({
		id: `b${i}`,
		kind: "drill",
		boardId,
		stage: "",
		minutes: 10,
		notes: "",
	}));
	return session;
}

describe("shared session files", () => {
	it("carries the session's drills, once each", () => {
		const rondo = createBoard("Rondo");
		rondo.meta.folder = "Warm-ups";
		const run = createBoard("Third-man run");
		const boards = new Map([rondo, run].map((b) => [b.id, b]));
		const session = sessionWith(rondo.id, run.id, rondo.id, "gone");
		const drills = drillsOf(session, (id) => boards.get(id));
		expect(drills.map((d) => d.meta.title)).toEqual(["Rondo", "Third-man run"]);

		const shared = parseSharedSession(
			decodeDocumentText(encodeSharedSession(session, drills)),
		);
		expect(shared.session.id).toBe(session.id);
		expect(shared.drills.map((d) => d.id)).toEqual([rondo.id, run.id]);
		// Folders from the sender's library don't come along.
		expect(shared.drills[0].meta.folder).toBe("");
	});

	it("reads a session file without drills", () => {
		const session = sessionWith("a");
		expect(parseSharedSession(JSON.stringify(session)).drills).toEqual([]);
	});

	it("tells the same drill from an edited one", () => {
		const drill = createBoard("Rondo");
		const filed = { ...drill, meta: { ...drill.meta, folder: "X", updatedAt: "2030-01-01" } };
		expect(sameDrill(drill, filed)).toBe(true);
		const edited = { ...drill, meta: { ...drill.meta, title: "Rondo 5v2" } };
		expect(sameDrill(drill, edited)).toBe(false);
	});
});
