// Makes the basketball and volleyball example sessions in examples/ with
// Lineup's own code, so the files are exactly what the app writes.
//   npx vite-node scripts/make-examples.ts
import { writeFileSync } from "node:fs";
import { createBall, createBoard, createCone, createPlayer } from "../src/model/board";
import { createLine, DEFAULT_TOOL_STYLES } from "../src/model/drawings";
import { encodeBoardFile } from "../src/model/file";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../src/model/pitch";
import { createBreakBlock, createDrillBlock, createSession } from "../src/model/session";
import { encodeSharedSession } from "../src/model/sessionFile";
import { fieldLayout, Sport, SPORT_INFO } from "../src/model/sports";
import { Board } from "../src/model/types";

const CREATED = "2026-11-15T10:00:00.000Z";

/** A spot on a full court, in metres from the left end line and the top sideline. */
function spot(sport: Sport, along: number, across: number): [number, number] {
	const l = fieldLayout({ sport, variant: "full" });
	const { ends, sides } = SPORT_INFO[sport].margin;
	return [
		Math.round(((l.x + (along + ends) * l.scale) / BOARD_WIDTH) * 1000) / 1000,
		Math.round(((l.y + (across + sides) * l.scale) / BOARD_HEIGHT) * 1000) / 1000,
	];
}

function board(sport: Sport, title: string, setup: (b: Board) => void): Board {
	const b = createBoard(title, { sport, variant: "full" });
	b.meta.createdAt = b.meta.updatedAt = CREATED;
	setup(b);
	return b;
}

const arrow = (tool: "run" | "pass" | "dribble", from: [number, number], to: [number, number]) =>
	createLine(tool, from, to, DEFAULT_TOOL_STYLES.line);

// ------------------------------------------------------------ Basketball ---

const weave = board("basketball", "Three-man weave", (b) => {
	const at = (m: number, w: number) => spot("basketball", m, w);
	const left = createPlayer(...at(1.5, 3), "home", { number: 1, label: "G" });
	const mid = createPlayer(...at(1.5, 7.5), "home", { number: 2, label: "F" });
	const right = createPlayer(...at(1.5, 12), "home", { number: 3, label: "W" });
	b.nodes.push(left, mid, right, createBall(...at(2.1, 7.5)));
	b.drawings.push(
		arrow("pass", at(2, 7.5), at(6, 3.5)),
		arrow("run", at(2, 7.5), at(9, 12)),
		arrow("run", at(2, 3), at(9, 7.5)),
		arrow("run", at(2, 12), at(13, 3.5)),
	);
	b.meta.type = "drill";
	b.meta.tags = ["Passing", "Conditioning", "Layups"];
	b.notes = {
		...b.notes,
		stage: "Warm-up",
		category: "Warm-up",
		duration: "10 min",
		players: "3 per line",
		equipment: "1 ball per group",
		description:
			"Three lines on the baseline. The middle player passes to one side and runs behind the player they passed to; the ball goes the length of the court without a dribble and finishes with a layup. Come back the same way.",
		coachingPoints: [
			"Pass ahead of the runner, at chest height",
			"Go behind the player you passed to",
			"No dribbling: move the ball with passes",
		],
	};
});

const fastBreak = board("basketball", "2-on-1 fast break", (b) => {
	const at = (m: number, w: number) => spot("basketball", m, w);
	const guard = createPlayer(...at(9, 5.5), "home", { number: 1, label: "G" });
	const wing = createPlayer(...at(9, 10.5), "home", { number: 2, label: "W" });
	const defender = createPlayer(...at(20, 7.5), "away", { number: 5, label: "D" });
	const ball = createBall(...at(9.6, 5.5));
	b.nodes.push(guard, wing, defender, ball, createCone(...at(14, 7.5)));
	b.drawings.push(arrow("dribble", at(10, 5.5), at(19, 6.5)), arrow("run", at(10, 10.5), at(23, 11)));
	// Step 1: they attack; step 2: the defender commits and the guard passes for the layup.
	b.steps = [
		{
			id: "step-1",
			duration: 1.2,
			moves: { [guard.id]: { x: at(19, 6.5)[0], y: at(19, 6.5)[1] }, [ball.id]: { x: at(19.5, 6.6)[0], y: at(19.5, 6.6)[1] }, [wing.id]: { x: at(21, 11)[0], y: at(21, 11)[1] } },
		},
		{
			id: "step-2",
			duration: 1,
			moves: { [defender.id]: { x: at(20.5, 7.2)[0], y: at(20.5, 7.2)[1] }, [ball.id]: { x: at(24, 9.5)[0], y: at(24, 9.5)[1] }, [wing.id]: { x: at(24.5, 9)[0], y: at(24.5, 9)[1] } },
		},
	];
	b.meta.type = "play";
	b.meta.tags = ["Transition", "Fast break"];
	b.notes = {
		...b.notes,
		stage: "Activity",
		category: "Transition",
		duration: "15 min",
		players: "2 v 1",
		description:
			"Two attackers push the ball against one retreating defender. The ball handler attacks the middle; when the defender steps up, pass to the wing for the layup. If the defender stays with the wing, finish yourself.",
		coachingPoints: [
			"Stay wide: one lane apart",
			"Attack the defender's front foot",
			"Make the decision before the free-throw line",
		],
	};
});

const basketball = createSession("Fast break basics");
basketball.meta.createdAt = basketball.meta.updatedAt = CREATED;
basketball.header = {
	...basketball.header,
	sport: "basketball",
	team: "U14 Boys",
	description: "Running the floor: passing on the move, then finishing a 2-on-1.",
	topics: ["Transition", "Passing"],
	autoTime: true,
	playersMin: 9,
	playersMax: 12,
	equipment: "6 balls, 4 cones",
};
basketball.blocks = [createDrillBlock(weave.id, 10), createBreakBlock("Water break", 2), createDrillBlock(fastBreak.id, 15)];

// ------------------------------------------------------------ Volleyball ---

const pepper = board("volleyball", "Pepper in pairs", (b) => {
	const at = (m: number, w: number) => spot("volleyball", m, w);
	const pairs: [number, number][] = [
		[2.5, 2],
		[2.5, 7],
	];
	for (const [m, w] of pairs) {
		b.nodes.push(
			createPlayer(...at(m, w), "home", { number: 1 }),
			createPlayer(...at(m + 4, w), "away", { number: 2 }),
		);
		b.drawings.push(arrow("pass", at(m + 0.4, w - 0.3), at(m + 3.6, w - 0.3)), arrow("pass", at(m + 3.6, w + 0.3), at(m + 0.4, w + 0.3)));
	}
	b.nodes.push(createBall(...at(2.9, 2)));
	b.meta.type = "drill";
	b.meta.tags = ["Ball control", "Passing"];
	b.notes = {
		...b.notes,
		stage: "Warm-up",
		category: "Warm-up",
		duration: "8 min",
		players: "Pairs",
		equipment: "1 ball per pair",
		description: "Partners 4 m apart keep the ball going: pass, set, hit, and back again. Count the longest run without a mistake.",
		coachingPoints: ["Platform still, legs do the work", "Call the ball", "Controlled hits to your partner's middle"],
	};
});

const serveReceive = board("volleyball", "Serve receive to the setter", (b) => {
	const at = (m: number, w: number) => spot("volleyball", m, w);
	b.nodes.push(
		createPlayer(...at(-2, 4.5), "away", { number: 9, label: "S" }),
		createPlayer(...at(15, 2), "home", { number: 4, label: "OH" }),
		createPlayer(...at(15, 4.5), "home", { number: 7, label: "L" }),
		createPlayer(...at(15, 7), "home", { number: 2, label: "OH" }),
		createPlayer(...at(10.5, 6), "home", { number: 3, label: "S" }),
		createBall(...at(-1.4, 4.5)),
		createCone(...at(10.8, 6.6)),
	);
	b.drawings.push(arrow("pass", at(-1.2, 4.5), at(14.6, 4.3)), arrow("pass", at(14.6, 4.6), at(10.8, 6)));
	b.meta.type = "drill";
	b.meta.tags = ["Serve receive", "Passing"];
	b.notes = {
		...b.notes,
		stage: "Activity",
		category: "Serve receive",
		duration: "20 min",
		players: "6 to 9",
		equipment: "10 balls, 1 cone",
		description:
			"A server serves to three passers; the pass goes to the setter at the target cone. Score 3 for a perfect pass, 2 for one the setter can set, 1 for a free ball. First team to 25, then rotate.",
		coachingPoints: ["Get behind the ball early", "Angle the platform to the target", "Talk: call seams before the serve"],
	};
});

const volleyball = createSession("Serve receive");
volleyball.meta.createdAt = volleyball.meta.updatedAt = CREATED;
volleyball.header = {
	...volleyball.header,
	sport: "volleyball",
	team: "U16 Girls",
	description: "Ball control first, then passing a served ball to the target.",
	topics: ["Serve receive", "Ball control"],
	autoTime: true,
	playersMin: 8,
	playersMax: 12,
	equipment: "10 balls, 1 cone",
};
volleyball.blocks = [createDrillBlock(pepper.id, 8), createBreakBlock("Water break", 2), createDrillBlock(serveReceive.id, 20)];

// ----------------------------------------------------------------- Files ---

const out = (name: string, bytes: Uint8Array) => writeFileSync(`examples/${name}`, bytes);
out("basketball-three-man-weave.lineup", encodeBoardFile(weave));
out("basketball-2-on-1-fast-break.lineup", encodeBoardFile(fastBreak));
out("basketball-fast-break-basics.lineup-session", encodeSharedSession(basketball, [weave, fastBreak]));
out("volleyball-pepper-in-pairs.lineup", encodeBoardFile(pepper));
out("volleyball-serve-receive.lineup", encodeBoardFile(serveReceive));
out("volleyball-serve-receive.lineup-session", encodeSharedSession(volleyball, [pepper, serveReceive]));
console.log("Wrote 6 example files.");
