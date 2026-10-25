import { Bounds } from "../../model/sports";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";

/**
 * Convert a pointer position into normalised board coordinates. Values outside
 * 0–1 mean the pointer is beside the pitch (in the letterbox around it).
 */
export function clientToBoard(
	svg: SVGSVGElement,
	clientX: number,
	clientY: number,
) {
	const matrix = svg.getScreenCTM();
	if (!matrix) return null;
	const point = new DOMPoint(clientX, clientY).matrixTransform(
		matrix.inverse(),
	);
	return { x: point.x / BOARD_WIDTH, y: point.y / BOARD_HEIGHT };
}

/** Whether a point is on the board, or on the given part of it (a field's bounds). */
export function isOnBoard(
	point: { x: number; y: number } | null,
	bounds: Bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 },
): point is { x: number; y: number } {
	return (
		!!point &&
		point.x >= bounds.minX &&
		point.x <= bounds.maxX &&
		point.y >= bounds.minY &&
		point.y <= bounds.maxY
	);
}
