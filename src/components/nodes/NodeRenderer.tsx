import { Node } from "../../models/Node";
import { NODE_REGISTRY } from "./nodeRegistry";
import { CSSProperties, RefCallback } from "react";

type NodeRendererProps = {
	node: Node;
	draggableRef: RefCallback<HTMLDivElement>;
	isPreview?: boolean;
	style?: CSSProperties;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function NodeRenderer({
	node,
	draggableRef,
	isPreview = false,
	style,
}: NodeRendererProps) {
	const nodeDefinition = NODE_REGISTRY[node.getType()];
	const Marker = nodeDefinition.Marker;

	return (
		<div ref={draggableRef} style={style} className="node noselect">
			{node.getType()}
		</div>
	);
}

export default NodeRenderer;
