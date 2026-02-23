import { useDraggable } from "@dnd-kit/core";
import { NodeType } from "../models/NodeType";

function ToolbarItem({ type }: { type: NodeType }) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "toolbar",
			nodeType: type,
		},
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className="toolbar__item"
		>
			{type}
		</div>
	);
}

export default ToolbarItem;
