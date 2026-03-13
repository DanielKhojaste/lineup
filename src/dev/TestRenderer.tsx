import { Node } from "../models/Node";
import { NODE_REGISTRY } from "../components/nodes/nodeRegistry";
import { RefObject, CSSProperties } from "react";

type TestRendererProps = {
	node: Node;
	draggableRef: RefObject<HTMLDivElement | null>;
	style: CSSProperties;
};

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function TestRenderer({ node, draggableRef, style }: TestRendererProps) {
	const nodeDefintion = NODE_REGISTRY[node.getType()];
	const Marker = nodeDefintion.Marker;

	return (
		<div ref={draggableRef} style={style}>
			{node.getType()}
		</div>
	);
}

export default TestRenderer;
