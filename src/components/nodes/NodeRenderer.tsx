import { Node } from "../../models/Node";
import { NODE_REGISTRY } from "./nodeRegistry";
import { CSSProperties, RefCallback } from "react";

type NodeRendererProps = {
	node: Node;
	containerRef: RefCallback<HTMLDivElement>;
	handleRef: RefCallback<HTMLDivElement>;
	isPreview?: boolean;
	style?: CSSProperties;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function NodeRenderer({
	node,
	containerRef,
	handleRef,
	isPreview = false,
	style = {},
}: NodeRendererProps) {
	const nodeDefinition = NODE_REGISTRY[node.getType()];
	const Marker = nodeDefinition.Marker;

	return (
		<Marker
			{...nodeDefinition.getNodeProps(node)}
			containerRef={containerRef}
			handleRef={handleRef}
			style={style}
		/>
	);
}

export default NodeRenderer;
