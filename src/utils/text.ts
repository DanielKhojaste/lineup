/** Shorten text to at most `max` characters, ending with an ellipsis when cut. */
export function truncate(text: string, max: number): string {
	const chars = [...text];
	if (chars.length <= max) return text;
	return `${chars
		.slice(0, max - 1)
		.join("")
		.trimEnd()}…`;
}

/**
 * The longest text each kind of field takes. Long enough for real use, short
 * enough that nothing breaks a layout. Places that show the text again (titles
 * on cards, messages) also cut it short with an ellipsis.
 */
export const TEXT_LIMITS = {
	/** Board and session titles. */
	title: 100,
	search: 80,
	folder: 40,
	/** Team names, player names, theme names. */
	name: 40,
	/** A player's position label on the board ("CM", "LW"). */
	label: 6,
	/** A tag or a topic. */
	tag: 30,
	/** One-line details: age group, duration, players, area. */
	short: 60,
	/** Equipment lists and other longer single lines. */
	line: 200,
	/** One coaching point, variation or progression. */
	point: 300,
	/** Descriptions and notes. */
	long: 5000,
	/** Text drawn on the board. */
	boardText: 200,
} as const;
