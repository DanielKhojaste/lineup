import { NodeType } from "../models/NodeType";
import ToolbarItem from "./nodes/ToolbarItem";

function Toolbar() {
	return (
		<div className="toolbar">
			<ToolbarItem type={NodeType.Player} />
			<ToolbarItem type={NodeType.Cone} />
		</div>
	);
}

export default Toolbar;
