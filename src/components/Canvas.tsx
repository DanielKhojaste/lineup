import { useDroppable } from "@dnd-kit/react";
import { RefObject } from "react";
import { Node } from "../models/Node";
import { mergeRefs } from "../utils/helpers";
import DraggableNode from "./nodes/DraggableNode";

type CanvasProps = {
	nodes: Node[];
	canvasRef: RefObject<HTMLElement | null>;
	onEditNode: (node: Node) => void;
};

function Canvas({ nodes, canvasRef, onEditNode }: CanvasProps) {
	const { ref: droppableRef } = useDroppable({
		id: "canvas",
	});

	const combinedRef = mergeRefs(canvasRef, droppableRef);

	return (
		<section id="canvas" className="dev-border">
			<div ref={combinedRef} className="pitch-wrapper">
				<div className="node-layer">
					{nodes.map((node) => (
						<DraggableNode
							key={node.id}
							node={node}
							canvasRef={canvasRef}
							onEditNode={onEditNode}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

export default Canvas;
