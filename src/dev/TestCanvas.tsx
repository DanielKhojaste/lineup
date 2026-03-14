import { RefObject } from "react";
import { useDroppable } from "@dnd-kit/react";
import TestDraggable from "./TestDraggable";
import { Node } from "../models/Node";

type CanvasProps = {
	nodes: Node[];
	canvasRef: RefObject<HTMLElement | null>;
};

function TestCanvas({ nodes, canvasRef }: CanvasProps) {
	const { ref: droppableRef } = useDroppable({
		id: "test-canvas",
	});

	function combinedRef(element: HTMLElement | null) {
		canvasRef.current = element;
		droppableRef(element);
	}

	return (
		<section ref={combinedRef} id="canvas" className="dev-border">
			{nodes.map((node) => (
				<TestDraggable key={node.id} node={node} canvasRef={canvasRef} />
			))}
		</section>
	);
}

export default TestCanvas;
