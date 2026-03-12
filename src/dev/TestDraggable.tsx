import { useDraggable } from "@dnd-kit/react";
import NodeRenderer from "../components/nodes/NodeRenderer";
import { Node } from "../models/Node";

function TestDraggable({ node }: { node: Node }) {
	const { ref, handleRef } = useDraggable({
		id: `${node.id}`,
		data: {
			from: "canvas-node",
			type: "test-node",
		},
	});

	const style = {
		position: "absolute" as const,
		left: node.x,
		top: node.y,
	};

	return (
		<div ref={ref} style={style}>
			<span className="noselect">{node.getType()}</span>
		</div>
	);
}

export default TestDraggable;
