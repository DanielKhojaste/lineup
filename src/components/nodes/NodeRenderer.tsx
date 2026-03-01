import { Node } from "../../models/Node";
import { NODE_REGISTRY } from "./nodeRegistry";

type NodeRendererProps = {
	node: Node;
	containerProps: object;
	dragHandleProps: object;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function NodeRenderer({
	node,
	containerProps,
	dragHandleProps,
}: NodeRendererProps) {
	const nodeDefintion = NODE_REGISTRY[node.getType()];
	const Marker = nodeDefintion.Marker;

	return (
		<Marker
			{...nodeDefintion.getNodeProps(node)}
			containerProps={containerProps}
			dragHandleProps={dragHandleProps}
		/>
	);
}

export default NodeRenderer;
