import { useDraggable } from "@dnd-kit/react";
import { NodeType } from "../../models/NodeType";
import NodePreview from "./NodePreview";

function ToolbarItem({ type }: { type: NodeType }) {
	const { ref, handleRef } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "toolbar",
			type,
		},
	});

	return <NodePreview type={type} containerRef={ref} handleRef={handleRef} />;
}

export default ToolbarItem;
