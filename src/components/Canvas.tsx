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
		<section ref={combinedRef} id="canvas" className="dev-border">
			{nodes.map((node) => (
				<DraggableNode key={node.id} node={node} canvasRef={canvasRef} />
			))}
		</section>
	);
}

export default Canvas;
