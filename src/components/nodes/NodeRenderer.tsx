import { Node } from "../../models/Node";
import { NodeType } from "../../models/NodeType";
import ConeMarker from "./ConeMarker";
import PlayerMarker from "./PlayerMarker";

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
const renderMap = {
	[NodeType.Player]: PlayerMarker,
	[NodeType.Cone]: ConeMarker,
};

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
	// PENDING: Add error catching in case the node type is not in the render map.
	const Marker = renderMap[node.getType()];

	return (
		<Marker
			node={node}
			containerProps={containerProps}
			dragHandleProps={dragHandleProps}
		/>
	);
}

export default NodeRenderer;
