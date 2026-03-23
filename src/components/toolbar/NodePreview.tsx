import { RefCallback } from "react";
import { NodeType } from "../../models/NodeType";
import { NODE_REGISTRY } from "../nodes/nodeRegistry";

type NodePreviewProps = {
	type: NodeType;
	containerRef?: RefCallback<HTMLDivElement>;
	handleRef?: RefCallback<HTMLDivElement>;
	className?: string;
};

/**
 * This component renders a node marker without requiring a node instance. Used for the drag overlay preview as well as the toolbar items.
 **/
function NodePreview({
	type,
	containerRef,
	handleRef,
	className,
}: NodePreviewProps) {
	const nodeDefintion = NODE_REGISTRY[type];
	const Marker = nodeDefintion.Marker;

	return (
		<Marker
			containerRef={containerRef}
			handleRef={handleRef}
			style={{}}
			className={className}
		/>
	);
}

export default NodePreview;
