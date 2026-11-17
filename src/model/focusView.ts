import { BOARD_HEIGHT, BOARD_WIDTH } from "./pitch";
import { fieldView } from "./sports";
import { Board } from "./types";

export interface View {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * The part of a board its drill uses: everything on it, with some room
 * around, at a given shape (3:2 by default), so a printed diagram can be
 * bigger than the whole field would allow. Falls back to the whole field when
 * the drill spreads over most of it, or the board is empty.
 */
export function focusView(board: Board, aspect = 3 / 2): View {
	const field = fieldView(board.pitch);
	const xs: number[] = [];
	const ys: number[] = [];
	const add = (x: number, y: number, r = 0) => {
		xs.push(x * BOARD_WIDTH - r, x * BOARD_WIDTH + r);
		ys.push(y * BOARD_HEIGHT - r, y * BOARD_HEIGHT + r);
	};
	for (const n of board.nodes) add(n.x, n.y, 26);
	for (const d of board.drawings) {
		if (d.kind === "line") {
			add(d.from[0], d.from[1]);
			add(d.to[0], d.to[1]);
			if (d.control) add(d.control[0], d.control[1]);
		} else if (d.kind === "zone") {
			add(d.x, d.y);
			add(d.x + d.w, d.y + d.h);
		} else if (d.kind === "pen") {
			for (const p of d.points) add(p[0], p[1]);
		} else {
			// Text: about 7 units a letter across, centred.
			const half = Math.min(d.text.length, 40) * 3.5;
			xs.push(d.x * BOARD_WIDTH - half, d.x * BOARD_WIDTH + half);
			ys.push(d.y * BOARD_HEIGHT - 16, d.y * BOARD_HEIGHT + 16);
		}
	}
	if (!xs.length) return field;
	const pad = field.width * 0.05;
	let minX = Math.min(...xs) - pad;
	let maxX = Math.max(...xs) + pad;
	let minY = Math.min(...ys) - pad;
	let maxY = Math.max(...ys) + pad;
	// Never closer than 40% of the field across, so a few cones still look like a drill.
	let w = Math.max(maxX - minX, field.width * 0.4);
	let h = maxY - minY;
	if (w / h < aspect) w = h * aspect;
	else h = w / aspect;
	if (w >= field.width * 0.85 || h >= field.height * 0.85) return field;
	const cx = (minX + maxX) / 2;
	const cy = (minY + maxY) / 2;
	const x = Math.min(Math.max(cx - w / 2, field.x), field.x + field.width - w);
	const y = Math.min(Math.max(cy - h / 2, field.y), field.y + field.height - h);
	return { x, y, width: w, height: h };
}
