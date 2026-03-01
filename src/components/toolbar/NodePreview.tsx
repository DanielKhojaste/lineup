import { NodeType } from "../../models/NodeType";
import { NODE_REGISTRY } from "../nodes/nodeRegistry";

/**
 * This component renders the appropriate marker component for a given Node model.
 **/
function NodePreview({ type }: { type: NodeType }) {
	const nodeDefintion = NODE_REGISTRY[type];
	const Marker = nodeDefintion.Marker;

	return <Marker containerProps={{}} dragHandleProps={{}} />;
}

export default NodePreview;
