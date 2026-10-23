import {
	Board,
	BallNode,
	BoardNode,
	ConeNode,
	PlayerNode,
	SCHEMA_VERSION,
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
	home: { name: "Home", color: "#ED1B24", keeperColor: "#F5C518" },
	away: { name: "Away", color: "#F2F4F5", keeperColor: "#22C55E" },
	neutral: { name: "Neutral", color: "#2F80ED", keeperColor: "#2F80ED" },
};

export function createBoard(title = "Untitled board"): Board {
	const now = new Date().toISOString();

	return {
		schemaVersion: SCHEMA_VERSION,
		id: newId(),
		meta: { title, tags: [], createdAt: now, updatedAt: now },
		notes: {
			category: "",
			ageGroup: "",
			duration: "",
			players: "",
			area: "",
			equipment: "",
			description: "",
			coachingPoints: [],
		},
		pitch: { sport: "soccer", variant: "full" },
		teams: structuredClone(DEFAULT_TEAMS),
		display: { showLabels: true },
		nodes: [],
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

/**
 * The lowest shirt number not yet used by players of the given team.
 * Keepers start counting at 1, outfield players at 2 (1 is the keeper's).
 */
export function nextShirtNumber(
	nodes: BoardNode[],
	team: TeamId,
	keeper = false,
): number {
	const used = new Set(
		nodes
			.filter((n): n is PlayerNode => n.kind === "player" && n.team === team)
			.map((n) => n.number)
			.filter((n): n is number => typeof n === "number"),
	);

	let candidate = keeper ? 1 : 2;
	while (used.has(candidate)) candidate++;
	return candidate;
}

export function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}
