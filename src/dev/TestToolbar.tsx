import { NodeType } from "../models/NodeType";

const nodeTypes = [NodeType.Player, NodeType.Cone];

function TestToolbar() {
	return (
		<div className="toolbar">
			{nodeTypes.map((type) => (
				<h3>{type}</h3>
			))}
		</div>
	);
}

export default TestToolbar;
