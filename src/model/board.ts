import { DEFAULT_SIZES, PLAYER_DRAWN_SIZES } from "../config/sizes";
import {
	BallNode,
	Board,
	BoardType,
	BoardNode,
	ConeNode,
	GoalNode,
	Kit,
	MannequinNode,
	PitchSettings,
	PlayerNode,
	PoleNode,
	SCHEMA_VERSION,
	ShirtNumber,
	TeamId,
} from "./types";

export function newId(): string {
	return crypto.randomUUID();
}

export const CONE_COLORS = [
	"#FF8A00",
	"#F5D90A",
	"#ED1B24",
	"#2F80ED",
	"#F2F4F5",
	"#7814FF",
] as const;

export const DEFAULT_TEAMS: Board["teams"] = {
	home: { name: "Home", color: "#ED1B24" },
	away: { name: "Away", color: "#F2F4F5" },
	neutral: { name: "Neutral", color: "#2F80ED" },
};

export const BOARD_TYPE_LABELS: Record<BoardType, { one: string; many: string }> = {
	drill: { one: "Drill", many: "Drills" },
	play: { one: "Play", many: "Plays" },
	lineup: { one: "Line-up", many: "Line-ups" },
	setpiece: { one: "Set piece", many: "Set pieces" },
	other: { one: "Other", many: "Other" },
};

/** Suggested names for the part of a session a drill is. Coaches can type their own. */
export const DRILL_STAGES = [
	"Warm-up",
	"Activity",
	"Small-sided game (SSG)",
	"Scrimmage",
	"Cool-down",
];

/** Marker sizes on offer, as a factor of the normal size. */
export { MARKER_SCALES } from "../config/sizes";

/**
 * How big players are drawn for each player size: since v0.8.1 each size is
 * what the one below it used to be (XL is the old L, L the old M…), because
 * big players looked unrealistic next to the field. Sizes in between (from
 * older files) are worked out along the way.
 */
const PLAYER_DRAWN = PLAYER_DRAWN_SIZES;

export function playerDrawnSize(stored: number): number {
	const [first] = PLAYER_DRAWN;
	const last = PLAYER_DRAWN[PLAYER_DRAWN.length - 1];
	if (stored <= first[0]) return (stored / first[0]) * first[1];
	if (stored >= last[0]) return (stored / last[0]) * last[1];
	for (let i = 1; i < PLAYER_DRAWN.length; i++) {
		const [a, da] = PLAYER_DRAWN[i - 1];
		const [b, db] = PLAYER_DRAWN[i];
		if (stored <= b) return da + ((stored - a) / (b - a)) * (db - da);
	}
	return stored;
}

/** How much bigger (or smaller) than normal a marker is drawn on this board. */
export function markerScale(
	node: BoardNode,
	display: Board["display"],
): number {
	if (node.kind === "goal") return 1;
	const own = node.scale ?? 1;
	return node.kind === "player"
		? playerDrawnSize(display.playerScale) * own
		: display.equipmentScale * own;
}

/** Degrees the rotate buttons and Shift+R turn a goal or mannequin by. */
export const ROTATE_STEP = 15;

/** The kit a player is drawn in: their own if they have one, otherwise the team's. */
export function playerKit(node: PlayerNode, teams: Board["teams"]): Kit {
	if (node.color) return { color: node.color, stripes: node.stripes };
	const team = teams[node.team];
	return { color: team.color, stripes: team.stripes };
}

export function createBoard(
	title = "Untitled board",
	pitch: PitchSettings = { sport: "soccer", variant: "full" },
): Board {
	const now = new Date().toISOString();

	return {
		schemaVersion: SCHEMA_VERSION,
		id: newId(),
		meta: {
			title,
			type: "drill",
			tags: [],
			folder: "",
			createdAt: now,
			updatedAt: now,
		},
		notes: {
			stage: "",
			category: "",
			ageGroup: "",
			duration: "",
			players: "",
			area: "",
			equipment: "",
			description: "",
			coachingPoints: [],
			variations: [],
		},
		pitch: { ...pitch },
		teams: structuredClone(DEFAULT_TEAMS),
		display: {
			showLabels: true,
			playerScale: DEFAULT_SIZES.players,
			equipmentScale: DEFAULT_SIZES.equipment,
		},
		nodes: [],
		drawings: [],
		steps: [],
	};
}

export function createPlayer(
	x: number,
	y: number,
	team: TeamId,
	options: Partial<Omit<PlayerNode, "id" | "kind" | "x" | "y" | "team">> = {},
): PlayerNode {
	return { id: newId(), kind: "player", x, y, team, keeper: false, ...options };
}

export function createCone(
	x: number,
	y: number,
	color: string = CONE_COLORS[0],
): ConeNode {
	return { id: newId(), kind: "cone", x, y, color };
}

export function createBall(x: number, y: number): BallNode {
	return { id: newId(), kind: "ball", x, y };
}

export function createGoal(
	x: number,
	y: number,
	size: GoalNode["size"] = "full",
): GoalNode {
	// Goals placed on the left half face right (into the pitch), and vice versa.
	return { id: newId(), kind: "goal", x, y, size, rotation: x < 0.5 ? 0 : 180 };
}

export const MANNEQUIN_COLOR = "#F5D90A";
export const POLE_COLOR = "#FF5C8A";

export function createMannequin(x: number, y: number): MannequinNode {
	return {
		id: newId(),
		kind: "mannequin",
		x,
		y,
		color: MANNEQUIN_COLOR,
		rotation: x < 0.5 ? 0 : 180,
	};
}

export function createPole(x: number, y: number): PoleNode {
	return { id: newId(), kind: "pole", x, y, color: POLE_COLOR };
}

/**
 * The lowest shirt number (from 1) not yet used by players of the given team.
 */
export function nextShirtNumber(nodes: BoardNode[], team: TeamId): number {
	const used = new Set(
		nodes
			.filter((n): n is PlayerNode => n.kind === "player" && n.team === team)
			.map((n) => n.number)
			.filter((n): n is number => typeof n === "number"),
	);

	let candidate = 1;
	while (used.has(candidate)) candidate++;
	return candidate;
}

export function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

/**
 * A shirt number typed by the user: digits only, 0–999. "00" is kept (it's a
 * real number in basketball and hockey); other leading zeros are dropped, so
 * "07" is 7 and "000" is 00. Empty means no number.
 */
export function parseShirtNumber(text: string): ShirtNumber | undefined {
	const digits = text.replace(/\D/g, "").slice(0, 3);
	if (digits === "") return undefined;
	if (/^00+$/.test(digits)) return "00";
	return Number(digits);
}
