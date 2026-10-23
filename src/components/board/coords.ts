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

export function isOnBoard(
	point: { x: number; y: number } | null,
): point is { x: number; y: number } {
	return (
		!!point && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
	);
}
