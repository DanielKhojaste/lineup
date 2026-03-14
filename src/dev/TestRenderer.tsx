import { Node } from "../models/Node";
import { NODE_REGISTRY } from "../components/nodes/nodeRegistry";
import { CSSProperties, RefCallback } from "react";

type TestRendererProps = {
	node: Node;
	draggableRef: RefCallback<HTMLDivElement>;
	isPreview?: boolean;
	style?: CSSProperties;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function TestRenderer({
	node,
	draggableRef,
	isPreview = false,
	style,
}: TestRendererProps) {
	const nodeDefintion = NODE_REGISTRY[node.getType()];
	// TODO: The markers should be modified to take a ref as well as a CSS style object.
	const Marker = nodeDefintion.Marker;

	return (
		<div ref={draggableRef} style={style} className="node noselect">
			{node.getType()}
		</div>
	);
}

export default TestRenderer;
