import { CSSProperties, RefCallback } from "react";
import { Node } from "../../models/Node";
import { NODE_REGISTRY } from "./nodeRegistry";

type NodeRendererProps = {
	node: Node;
	containerRef: RefCallback<HTMLDivElement>;
	handleRef: RefCallback<HTMLDivElement>;
	style?: CSSProperties;
	onDoubleClick?: () => void;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function NodeRenderer({
	node,
	containerRef,
	handleRef,
	style = {},
	onDoubleClick,
}: NodeRendererProps) {
	const nodeDefinition = NODE_REGISTRY[node.getType()];
	const Marker = nodeDefinition.Marker;

	return (
		<Marker
			{...nodeDefinition.getNodeProps(node)}
			containerRef={containerRef}
			handleRef={handleRef}
			style={style}
			onDoubleClick={onDoubleClick}
		/>
	);
}

export default NodeRenderer;
