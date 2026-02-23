import { Node } from "../../models/Node";
import { NodeType } from "../../models/NodeType";
import ConeMarker from "./ConeMarker";
import PlayerMarker from "./PlayerMarker";

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
type NodeRendererProps = {
	node: Node;
	containerProps: object;
	dragHandleProps: object;
};

function NodeRenderer({
	node,
	containerProps,
	dragHandleProps,
}: NodeRendererProps) {
	const type = node.getType();

	if (type === NodeType.Player) {
		return (
			<PlayerMarker
				player={node}
				containerProps={containerProps}
				dragHandleProps={dragHandleProps}
			/>
		);
	}
	if (type === NodeType.Cone) {
		return (
			<ConeMarker
				cone={node}
				containerProps={containerProps}
				dragHandleProps={dragHandleProps}
			/>
		);
	}

	return <></>;
}

export default NodeRenderer;
