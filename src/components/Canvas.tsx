import { useDroppable } from "@dnd-kit/core";
import { Node } from "../models/Node";
import DraggableNode from "./nodes/DraggableNode";

type CanvasProps = {
	nodes: Node[];
};

function Canvas({ nodes }: CanvasProps) {
	const { setNodeRef } = useDroppable({
		id: "canvas",
	});

	return (
		<div id="canvas" ref={setNodeRef}>
			{nodes.map((node) => (
				<DraggableNode node={node} key={node.id} />
			))}
		</div>
	);
}

export default Canvas;
