import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Node } from "../../models/Node";
import NodeRenderer from "./NodeRenderer";

/**
 * This component uses NodeRenderer to display the correct node marker and handles its drag and drop behavior.
 *
 * Drag behavior is handled here using dnd-kit and injected into the marker
 * components as props. The draggable container (target element) and the drag
 * handle (drag activator) may be different elements depending on the node
 * type. For example, the PlayerMarker can only be dragged by its sprite.
 */

function DraggableNode({ node }: { node: Node }) {
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: node.id,
		data: {
			from: "canvas-node",
			nodeType: node.getType(),
		},
	});

	const style = {
		left: node.x,
		top: node.y,
		transform: CSS.Translate.toString(transform),
	};

	// Draggable container (e.g., PlayerMarker container)
	const containerProps = {
		ref: setNodeRef,
		style: style,
	};

	// Drag handle (e.g., PlayerMarker sprite)
	const dragHandleProps = {
		...listeners,
		...attributes,
	};

	return (
		<NodeRenderer
			node={node}
			containerProps={containerProps}
			dragHandleProps={dragHandleProps}
		/>
	);
}

export default DraggableNode;
