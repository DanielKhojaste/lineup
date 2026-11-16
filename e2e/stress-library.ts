/**
 * A library built to break layouts: very long titles, team names and
 * folder names, a session with every soccer topic, a plan with many weeks,
 * topics and sessions, and a busy calendar. Written straight into the
 * browser's library (localStorage), the way the app stores it in a browser.
 */
import { createBoard } from "../src/model/board";
import { createEntry, createEvent, EMPTY_CALENDAR, sampleSeason } from "../src/model/calendar";
import { serializeBoard } from "../src/model/file";
import { createPlan, createTopic } from "../src/model/plan";
import { createDrillBlock, createSession } from "../src/model/session";
import { TOPIC_PRESETS } from "../src/model/topics";

const LONG =
	"Playing out from the back under a high press with the full-backs inverted into midfield";
const LONG_WORD = "Supercalifragilisticexpialidocious-pressing-triggers-and-cover-shadows";
const LONG_TEAM = "U14 Girls Academy Development Squad (Tuesday and Thursday group)";
const LONG_FOLDER = "Autumn block: transition, counter-pressing and rest defence";

/** Today, as the calendar stores dates ("2026-11-16"), plus some days. */
function day(offset: number) {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface StressLibrary {
	/** localStorage keys and values. */
	storage: Record<string, string>;
	ids: { cool: string; long: string; empty: string; plan: string; board: string };
}

export function stressLibrary(): StressLibrary {
	const boards = [LONG, LONG_WORD, "Rondo 4v2", "Finishing", "Crossing and finishing"].map((title, i) => {
		const board = createBoard(title, { sport: "soccer", variant: i % 2 ? "half" : "full" });
		board.meta.tags = [...TOPIC_PRESETS.soccer];
		board.meta.folders = [LONG_FOLDER, "Pressing", "Warm-ups"];
		return board;
	});

	// "Cool Session": every soccer topic, a long team and description.
	const cool = createSession("Cool Session");
	cool.header.team = LONG_TEAM;
	cool.header.topics = [...TOPIC_PRESETS.soccer];
	cool.header.description = `${LONG}. ${LONG_WORD}. `.repeat(6);
	cool.meta.folders = [LONG_FOLDER];
	cool.blocks = boards.map((b) => createDrillBlock(b.id));

	const long = createSession(LONG);
	long.header.team = LONG_TEAM;
	long.header.topics = [LONG_WORD, ...TOPIC_PRESETS.soccer.slice(0, 5)];
	long.blocks = [createDrillBlock(boards[1].id)];

	const empty = createSession(LONG_WORD);

	const plan = createPlan(`${LONG} (season plan)`);
	plan.team = LONG_TEAM;
	plan.sport = "soccer";
	plan.description = `${LONG}. `.repeat(8);
	plan.topics = Array.from({ length: 10 }, (_, i) => {
		const week = createTopic(TOPIC_PRESETS.soccer.slice(i, i + 8));
		week.notes = i % 3 ? "" : `${LONG}. ${LONG_WORD}`;
		week.sessionIds = [cool.id, long.id, empty.id].slice(0, (i % 3) + 1);
		return week;
	});

	const season = sampleSeason();
	season.name = `${LONG_FOLDER} (${season.name})`;
	season.phases = season.phases.map((p) => ({ ...p, name: `${p.name}: ${LONG_WORD}` }));
	const calendar = {
		...EMPTY_CALENDAR,
		seasons: [season],
		entries: [
			...[-9, -2, 0, 0, 0, 1, 2, 3, 3, 5, 9, 16].map((offset, i) =>
				createEntry([cool.id, long.id, empty.id][i % 3], day(offset), {
					team: LONG_TEAM,
					time: i % 2 ? "18:30" : null,
					log: offset < 0 ? `${LONG}. ${LONG_WORD}` : "",
				}),
			),
			createEvent("match", day(0), `${LONG_WORD} Athletic`, { away: true, team: LONG_TEAM }),
			createEvent("match", day(4), "Riverside", { time: "10:00" }),
			createEvent("event", day(2), `${LONG} (parents' evening)`),
		],
	};

	const byId = <T extends { id: string }>(items: T[], text: (x: T) => string) =>
		JSON.stringify(Object.fromEntries(items.map((x) => [x.id, text(x)])));

	const storage = {
		"lineup.library.boards": byId(boards, serializeBoard),
		"lineup.library.sessions": byId([cool, long, empty], (s) => JSON.stringify(s)),
		"lineup.library.plans": byId([plan], (p) => JSON.stringify(p)),
		"lineup.library.calendar": JSON.stringify(calendar),
		"lineup.library.index": JSON.stringify({
			version: 1,
			folders: [LONG_FOLDER, "Pressing", "Warm-ups"],
			topics: [LONG_WORD],
		}),
	};
	return {
		storage,
		ids: { cool: cool.id, long: long.id, empty: empty.id, plan: plan.id, board: boards[0].id },
	};
}
