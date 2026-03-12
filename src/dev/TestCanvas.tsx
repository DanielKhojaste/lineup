import { useRef } from "react";
import { useDroppable } from "@dnd-kit/react";
import TestDraggable from "./TestDraggable";
import { Node } from "../models/Node";

type CanvasProps = {
	nodes: Node[];
};

function TestCanvas({ nodes }: CanvasProps) {
	const canvasRef = useRef<HTMLElement | null>(null);
	const { ref: droppableRef } = useDroppable({
		id: "test-canvas",
	});

	const combinedRef = (element: HTMLElement) => {
		canvasRef.current = element;
		droppableRef(element);
	};

	return (
		<section ref={combinedRef} id="canvas" className="dev-border">
			{nodes.map((node) => (
				<TestDraggable node={node} key={node.id} />
			))}
		</section>
	);
}

export default TestCanvas;
