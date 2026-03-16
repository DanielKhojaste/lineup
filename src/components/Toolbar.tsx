import { NodeType } from "../models/NodeType";
import ToolbarItem from "./toolbar/ToolbarItem";

const nodeTypes = Object.values(NodeType);

function Toolbar() {
	return (
		<div className="toolbar">
			{nodeTypes.map((type) => (
				<ToolbarItem key={`toolbar-${type}`} type={type} />
			))}
		</div>
	);
}

export default Toolbar;
