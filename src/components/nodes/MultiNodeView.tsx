import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Node } from "../../models/Node";
import { NodeType } from "../../models/NodeType";
import PlayerMarker from "./PlayerMarker";
import { Player } from "../../models/Player";
import { Cone } from "../../models/Cone";
import ConeMarker from "./ConeMarker";

/**
 * Renders the appropriate marker component for a given Node model.
 *
 * Drag behavior is handled here using dnd-kit and injected into the marker
 * components as props. The draggable container (target element) and the drag
 * handle (drag activator) may be different elements depending on the node
 * type. For example, the PlayerMarker can only be dragged by its sprite.
 */

function MultiNodeView({ node }: { node: Node }) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: node.id,
			data: {
				from: "canvas-node",
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

	function displayNode() {
		if (node instanceof Player) {
			return (
				<PlayerMarker
					player={node}
					containerProps={containerProps}
					dragHandleProps={dragHandleProps}
				/>
			);
		}
		if (node instanceof Cone) {
			return (
				<ConeMarker
					cone={node}
					draggableProps={{ ...containerProps, ...dragHandleProps }}
				/>
			);
		} else {
			return <></>;
		}
	}

	return <>{displayNode()}</>;
}

export default MultiNodeView;
