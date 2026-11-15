/**
 * Marker sizes: change these to tune how big players and equipment look.
 * See docs/customizing.md.
 *
 * Boards store a size as a number (0.75, 1, 1.3 or 1.6, shown as S, M, L and
 * XL), so these numbers must stay the same once boards use them. How big each
 * one is *drawn* is set below, and can be changed freely.
 */

/** The sizes a board's players and equipment can have, and their labels. */
export const MARKER_SCALES = [
	{ value: 0.75, label: "S" },
	{ value: 1, label: "M" },
	{ value: 1.3, label: "L" },
	{ value: 1.6, label: "XL" },
] as const;

/**
 * How big players are drawn for each size, as a multiple of the original
 * player (1 = 18 board units across the radius, the size of M before v0.8.1).
 * [stored size, drawn size]. Sizes in between are worked out along the way.
 */
export const PLAYER_DRAWN_SIZES: [stored: number, drawn: number][] = [
	[0.75, 0.66],
	[1, 0.82],
	[1.3, 1],
	[1.6, 1.3],
];

/** The sizes new boards start with until the coach picks their own (they're remembered after that). */
export const DEFAULT_SIZES = {
	players: 1,
	equipment: 1,
};
