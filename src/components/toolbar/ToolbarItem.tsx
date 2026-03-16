import { useDraggable } from "@dnd-kit/react";
import { NodeType } from "../../models/NodeType";

function ToolbarItem({ type }: { type: NodeType }) {
	const { ref } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "toolbar",
			type,
		},
	});

	return <h3 ref={ref}>{type}</h3>;
}

export default ToolbarItem;
