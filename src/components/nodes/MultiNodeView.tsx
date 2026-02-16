import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Node } from "../../models/Node";
import { NodeType } from "../../models/NodeType";
import PlayerMarker from "./PlayerMarker";
import { Player } from "../../models/Player";
import { Cone } from "../../models/Cone";
import ConeMarker from "./ConeMarker";

function MultiNodeView({ node }: { node: Node }) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({ id: node.id });

	const style = {
		left: node.x,
		top: node.y,
		transform: CSS.Translate.toString(transform),
	};

	const draggableProps = {
		ref: setNodeRef,
		style: style,
		...listeners,
		...attributes,
	};

	function displayNode() {
		if (node instanceof Player) {
			return <PlayerMarker player={node} draggableProps={draggableProps} />;
		}
		if (node instanceof Cone) {
			return <ConeMarker cone={node} draggableProps={draggableProps} />;
		} else {
			return <></>;
		}
	}

	return <>{displayNode()}</>;
}

export default MultiNodeView;
