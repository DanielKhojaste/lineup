import { memo } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";
import { Board } from "../../model/types";
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
}

/** A read-only picture of a board: library thumbnails and image export. */
function BoardPreview({
	board,
	className,
	width,
	height,
	children,
}: BoardPreviewProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
			width={width}
			height={height}
			role="img"
			aria-label={`Preview of ${board.meta.title}`}
		>
			{children}
			<Pitch pitch={board.pitch} />
			{board.drawings
				.filter((d) => d.kind !== "text")
				.map((d) => (
					<DrawingShape key={d.id} drawing={d} />
				))}
			{board.nodes.map((node) => (
				<NodeMarker key={node.id} node={node} selected={false} board={board} />
			))}
			{board.drawings
				.filter((d) => d.kind === "text")
				.map((d) => (
					<DrawingShape key={d.id} drawing={d} />
				))}
		</svg>
	);
}

export default memo(BoardPreview);
