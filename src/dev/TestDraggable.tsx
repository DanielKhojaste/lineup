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

	return (
		<div>
			<span ref={ref} className="noselect">
				{node.getType()}
			</span>
		</div>
	);
}

export default TestDraggable;
