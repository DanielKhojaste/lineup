import { useDraggable } from "@dnd-kit/react";
import { CSS } from "@dnd-kit/utilities";

function DraggableNode({ node }: { node: Node }) {
	const { ref, handleRef } = useDraggable({
		id: "tempId",
		data: {
			from: "canvas-node",
			type: "test-node",
		},
	});

	return (
		<div ref={ref}>
			<span>Node</span>
		</div>
	);
}

export default DraggableNode;
