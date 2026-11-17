import { memo } from "react";
import { fieldView } from "../../model/sports";
import { Board, Drawing } from "../../model/types";
import DrawingShape from "./Drawings";
import NodeMarker from "./Markers";
import Pitch from "./Pitch";

interface BoardPreviewProps {
	board: Board;
	className?: string;
	/** Rendered size for exports; previews scale to their container. */
	width?: number;
	height?: number;
	/** Extra SVG content (e.g. a <style> block for standalone exports). */
	children?: React.ReactNode;
	/** Show only this part of the board (e.g. the area a drill uses); the whole field otherwise. */
	view?: { x: number; y: number; width: number; height: number };
	/** For printing: a white pitch, and white lines and arrows in dark ink. */
	ink?: boolean;
}

/** On a white pitch, white drawings print in dark ink instead. */
const INK = "#2B3440";
const inked = (d: Drawing): Drawing =>
	/^#?f{3}(f{3})?$/i.test(d.color.trim()) || d.color.toLowerCase() === "white" ? { ...d, color: INK } : d;

/** A read-only picture of a board: library thumbnails and image export. */
function BoardPreview({
	board,
	className,
	width,
	height,
	children,
	view: shown,
	ink = false,
}: BoardPreviewProps) {
	// Just the field, like the editor shows it (or the part asked for).
	const view = shown ?? fieldView(board.pitch);
	const drawings = ink ? board.drawings.map(inked) : board.drawings;
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			// "board-picture": theme effects (spice, desert night) never draw over a board.
			className={`board-picture${className ? ` ${className}` : ""}`}
			viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
			width={width}
			height={height}
			role="img"
			aria-label={`Preview of ${board.meta.title}`}
		>
			{children}
			<Pitch pitch={board.pitch} ink={ink} />
			{drawings
				.filter((d) => d.kind !== "text")
				.map((d) => (
					<DrawingShape key={d.id} drawing={d} />
				))}
			{board.nodes.map((node) => (
				<NodeMarker key={node.id} node={node} selected={false} board={board} />
			))}
			{drawings
				.filter((d) => d.kind === "text")
				.map((d) => (
					<DrawingShape key={d.id} drawing={d} />
				))}
		</svg>
	);
}

export default memo(BoardPreview);
