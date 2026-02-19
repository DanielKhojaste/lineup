import { useDraggable } from "@dnd-kit/core";
import { NodeType } from "../../models/NodeType";

function ToolbarItem({ type }: { type: NodeType }) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: `toolbar-${type}`,
		data: {
			from: "toolbar",
			nodeType: type,
		},
	});

	const style = {
		transform: transform
			? `translate3d(${transform.x}px, ${transform.y}px, 0)`
			: undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className="toolbar__item"
		>
			{type}
		</div>
	);
}

export default ToolbarItem;
