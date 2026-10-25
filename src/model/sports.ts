import { BOARD_HEIGHT, BOARD_WIDTH } from "./pitch";
import { PitchSettings } from "./types";

export const SPORTS = [
	"soccer",
	"futsal",
	"basketball",
	"volleyball",
	"handball",
	"hockey",
] as const;

export type Sport = (typeof SPORTS)[number];
export type FieldVariant = "full" | "half";

export interface SportInfo {
	name: string;
	/** What the playing area is called: pitch, court or field. */
	surface: string;
	/** Playing area, in metres: length is goal to goal (or end line to end line). */
	length: number;
	width: number;
	/** Space drawn around the lines, in metres (run-off or free zone). */
	margin: number;
	/** A full-size goal in metres, or null for sports without goals (or with hoops). */
	goal: { width: number; depth: number } | null;
	/** Typical number of players a side, for hints. */
	players: number;
}

export const SPORT_INFO: Record<Sport, SportInfo> = {
	soccer: {
		name: "Soccer",
		surface: "pitch",
		length: 105,
		width: 68,
		margin: 3,
		goal: { width: 7.32, depth: 2 },
		players: 11,
	},
	futsal: {
		name: "Futsal",
		surface: "court",
		length: 40,
		width: 20,
		margin: 2,
		goal: { width: 3, depth: 1 },
		players: 5,
	},
	basketball: {
		name: "Basketball",
		surface: "court",
		length: 28,
		width: 15,
		margin: 2,
		goal: null,
		players: 5,
	},
	volleyball: {
		name: "Volleyball",
		surface: "court",
		length: 18,
		width: 9,
		margin: 3,
		goal: null,
		players: 6,
	},
	handball: {
		name: "Handball",
		surface: "court",
		length: 40,
		width: 20,
		margin: 2,
		goal: { width: 3, depth: 1 },
		players: 7,
	},
	hockey: {
		name: "Field hockey",
		surface: "field",
		length: 91.4,
		width: 55,
		margin: 3,
		goal: { width: 3.66, depth: 1.2 },
		players: 11,
	},
};

export const DEFAULT_PITCH: PitchSettings = {
	sport: "soccer",
	variant: "full",
};

export function isSport(value: unknown): value is Sport {
	return (
		typeof value === "string" && (SPORTS as readonly string[]).includes(value)
	);
}

/**
 * Where the field sits on the board. Every board has the same drawing space
 * (BOARD_WIDTH × BOARD_HEIGHT units); a field is scaled to fit it and centred,
 * so marker sizes and saved positions mean the same thing for every sport.
 * A half field is turned so its goal (or hoop, or net) is at the top.
 */
export interface FieldLayout {
	/** Board units per metre. */
	scale: number;
	/** Board position of the corner of the drawn area (lines plus margin). */
	x: number;
	y: number;
	/** Size of the drawn area in metres, as it appears (after turning a half field). */
	across: number;
	down: number;
	half: boolean;
}

export function fieldLayout(pitch: PitchSettings): FieldLayout {
	const info = SPORT_INFO[pitch.sport];
	const half = pitch.variant === "half";
	const m = info.margin;
	// A half field shows a little past halfway, so the centre circle reads.
	const across = (half ? info.width : info.length) + m * 2;
	const down = (half ? info.length / 2 : info.width) + m * 2;
	const scale = Math.min(BOARD_WIDTH / across, BOARD_HEIGHT / down);
	return {
		scale,
		x: (BOARD_WIDTH - across * scale) / 2,
		y: (BOARD_HEIGHT - down * scale) / 2,
		across,
		down,
		half,
	};
}

/** The size of a full goal in board units for this sport, if it has goals. */
export function goalSize(pitch: PitchSettings) {
	const goal = SPORT_INFO[pitch.sport].goal;
	if (!goal) return null;
	const { scale } = fieldLayout(pitch);
	return { width: goal.width * scale, depth: goal.depth * scale };
}

export function pitchLabel(pitch: PitchSettings): string {
	const info = SPORT_INFO[pitch.sport];
	return pitch.variant === "half"
		? `${info.name}, half ${info.surface}`
		: info.name;
}
