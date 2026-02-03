import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type NodeProps = {
	id: string;
	x: number;
	y: number;
};

function Node({ id, x, y }: NodeProps) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

	const style = {
		left: x,
		top: y,
		transform: CSS.Translate.toString(transform),
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className="node"
		/>
	);
}

export default Node;
