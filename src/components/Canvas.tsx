import { RefObject } from "react";
import { useDroppable } from "@dnd-kit/react";
import DraggableNode from "./nodes/DraggableNode";
import { Node } from "../models/Node";

type CanvasProps = {
	nodes: Node[];
	canvasRef: RefObject<HTMLElement | null>;
};

function Canvas({ nodes, canvasRef }: CanvasProps) {
	const { ref: droppableRef } = useDroppable({
		id: "canvas",
	});

	function combinedRef(element: HTMLElement | null) {
		canvasRef.current = element;
		droppableRef(element);
	}

	return (
		<section id="canvas" className="dev-border">
			<div ref={combinedRef} className="pitch-wrapper">
				<div className="node-layer">
					{nodes.map((node) => (
						<DraggableNode key={node.id} node={node} canvasRef={canvasRef} />
					))}
				</div>
			</div>
		</section>
	);
}

export default Canvas;
