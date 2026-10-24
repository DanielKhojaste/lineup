import { useEffect, useLayoutEffect, useState } from "react";
import { PLAYER_RADIUS, toBoardUnits } from "../../model/pitch";
import { BoardNode } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { selectedDrawings, selectedNodes } from "../../state/editor";
import { Icon } from "../Icon";
import { drawingBox } from "./Drawings";
import { GOAL_SIZES } from "./Markers";

/** Rough extent of a marker around its centre, in board units. */
function nodeExtent(node: BoardNode, showLabels: boolean) {
	switch (node.kind) {
		case "player":
			return {
				up: PLAYER_RADIUS + 6,
				down:
					PLAYER_RADIUS + (showLabels && (node.label || node.name) ? 26 : 6),
			};
		case "goal": {
			const { width } = GOAL_SIZES[node.size];
			return { up: width / 2 + 6, down: width / 2 + 6 };
		}
		default:
			return { up: 18, down: 18 };
	}
}

/**
 * A small bar under the current selection with a delete button, so deleting
 * doesn't depend on knowing the keyboard shortcut.
 */
export default function FloatingActions({ hidden }: { hidden: boolean }) {
	const { state, dispatch, boardRef } = useEditor();
	const [position, setPosition] = useState<{
		left: number;
		top: number;
		above: boolean;
	} | null>(null);
	const [, setTick] = useState(0);
	const nodes = selectedNodes(state);
	const drawings = selectedDrawings(state);
	const count = nodes.length + drawings.length;

	// Re-measure when the window (and so the board) changes size.
	useEffect(() => {
		const svg = boardRef.current;
		if (!svg) return;
		const observer = new ResizeObserver(() => setTick((t) => t + 1));
		observer.observe(svg);
		return () => observer.disconnect();
	}, [boardRef]);

	useLayoutEffect(() => {
		const svg = boardRef.current;
		const section = svg?.parentElement;
		const matrix = svg?.getScreenCTM();
		if (!svg || !section || !matrix || count === 0) {
			setPosition((prev) => (prev === null ? prev : null));
			return;
		}

		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const node of nodes) {
			const c = toBoardUnits(node.x, node.y);
			const e = nodeExtent(node, state.board.display.showLabels);
			minX = Math.min(minX, c.x - 20);
			maxX = Math.max(maxX, c.x + 20);
			minY = Math.min(minY, c.y - e.up);
			maxY = Math.max(maxY, c.y + e.down);
		}
		for (const d of drawings) {
			const b = drawingBox(d);
			minX = Math.min(minX, b.x);
			maxX = Math.max(maxX, b.x + b.width);
			minY = Math.min(minY, b.y);
			maxY = Math.max(maxY, b.y + b.height);
		}

		const origin = section.getBoundingClientRect();
		const bottom = new DOMPoint((minX + maxX) / 2, maxY).matrixTransform(
			matrix,
		);
		const top = new DOMPoint((minX + maxX) / 2, minY).matrixTransform(matrix);
		// Flip above the selection when there isn't room underneath.
		const above = bottom.y + 48 > origin.bottom;
		const next = {
			left: Math.round(bottom.x - origin.left),
			top: Math.round((above ? top.y - 8 : bottom.y + 8) - origin.top),
			above,
		};
		// This runs after every render, so only update when the spot actually moved.
		setPosition((prev) =>
			prev &&
			prev.left === next.left &&
			prev.top === next.top &&
			prev.above === next.above
				? prev
				: next,
		);
	});

	if (hidden || !position || count === 0) return null;
	const ids = [...nodes, ...drawings].map((item) => item.id);

	return (
		<div
			className={`floating-actions${
				position.above ? " floating-actions--above" : ""
			}`}
			style={{ left: position.left, top: position.top }}
			role="toolbar"
			aria-label="Selection actions"
		>
			<button
				type="button"
				className="floating-actions__button floating-actions__button--danger"
				aria-label={count > 1 ? `Delete ${count} items (Del)` : "Delete (Del)"}
				title={count > 1 ? `Delete ${count} items (Del)` : "Delete (Del)"}
				onPointerDown={(e) => e.stopPropagation()}
				onClick={() => dispatch({ type: "deleteItems", ids })}
			>
				<Icon name="trash" size={16} />
			</button>
		</div>
	);
}
