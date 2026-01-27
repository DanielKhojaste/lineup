import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function Node({ id }: { id: string }) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });

	const style = {
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
