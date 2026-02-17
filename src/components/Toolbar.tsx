import { Node } from "../models/Node";
import { NodeFactory } from "../models/NodeFactory";
import { NodeType } from "../models/NodeType";

type ToolbarProps = {
	nodes: Node[];
	setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
};

function Toolbar({ nodes, setNodes }: ToolbarProps) {
	function onCreatePlayer() {
		const newPlayer = NodeFactory.create(NodeType.Player, {
			x: 120,
			y: 40,
		});

		setNodes((prev) => [...prev, newPlayer]);
	}

	function onCreateCone() {
		const newCone = NodeFactory.create(NodeType.Cone, { x: 120, y: 100 });

		setNodes((prev) => [...prev, newCone]);
	}

	return (
		<div className="toolbar">
			<div className="node-palette">
				<li className="node-palette__item" onClick={onCreatePlayer}>
					Player
				</li>
				<li className="node-palette__item" onClick={onCreateCone}>
					Cone
				</li>
			</div>
		</div>
	);
}

export default Toolbar;
