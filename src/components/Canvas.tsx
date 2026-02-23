import { Node } from "../models/Node";
import DraggableNode from "./nodes/DraggableNode";

type CanvasProps = {
	nodes: Node[];
};

function Canvas({ nodes }: CanvasProps) {
	return (
		<div id="canvas">
			{nodes.map((node) => (
				<DraggableNode node={node} key={node.id} />
			))}
		</div>
	);
}

export default Canvas;
