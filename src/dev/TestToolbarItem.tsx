import { useDraggable } from "@dnd-kit/react";
import { NodeType } from "../models/NodeType";

function TestToolbarItem({ type }: { type: NodeType }) {
	const { ref } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "test-toolbar",
			type,
		},
	});

	return <h3 ref={ref}>{type}</h3>;
}

export default TestToolbarItem;
