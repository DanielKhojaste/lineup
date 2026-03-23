import { useDraggable } from "@dnd-kit/react";
import { NodeType } from "../../models/NodeType";
import NodeRenderer from "../nodes/NodeRenderer";
import { NodeFactory } from "../../models/NodeFactory";
import NodePreview from "./NodePreview";

function ToolbarItem({ type }: { type: NodeType }) {
	const { ref, handleRef } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "toolbar",
			type,
		},
	});

	const previewNode = NodeFactory.create(type, { x: 0, y: 0 });

	return <NodePreview type={type} containerRef={ref} handleRef={handleRef} />;
}

export default ToolbarItem;
