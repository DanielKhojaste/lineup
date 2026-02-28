import { NodeType } from "../models/NodeType";
import ToolbarItem from "./ToolbarItem";

const nodeTypes = [NodeType.Player, NodeType.Cone];

function Toolbar() {
	return (
		<div className="toolbar">
			{nodeTypes.map((type) => (
				<ToolbarItem type={type} />
			))}
		</div>
	);
}

export default Toolbar;
