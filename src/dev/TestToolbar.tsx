import { NodeType } from "../models/NodeType";
import TestToolbarItem from "./TestToolbarItem";

const nodeTypes = Object.values(NodeType);

function TestToolbar() {
	return (
		<div className="toolbar">
			{nodeTypes.map((type) => (
				<TestToolbarItem key={`toolbar-${type}`} type={type} />
			))}
		</div>
	);
}

export default TestToolbar;
