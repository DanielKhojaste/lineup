/**
 * Board geometry in SVG user units. A full soccer pitch is 105 × 68 m, drawn at
 * 10 units per metre, with a 3 m run-off area on every side so markers can sit
 * just outside the lines (subs, coaches, balls waiting to be played in).
 */
export const PITCH_LENGTH = 1050;
export const PITCH_WIDTH = 680;
export const RUN_OFF = 30;

export const BOARD_WIDTH = PITCH_LENGTH + RUN_OFF * 2;
export const BOARD_HEIGHT = PITCH_WIDTH + RUN_OFF * 2;

/** Marker sizes in board units. */
export const PLAYER_RADIUS = 18;
export const BALL_RADIUS = 9;
export const CONE_SIZE = 20;

export function toBoardUnits(x: number, y: number) {
	return { x: x * BOARD_WIDTH, y: y * BOARD_HEIGHT };
}

export function toNormalized(x: number, y: number) {
	return { x: x / BOARD_WIDTH, y: y / BOARD_HEIGHT };
}
