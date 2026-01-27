import { DndContext } from "@dnd-kit/core";
import Node from "./nodes/Node";

function Canvas() {
	type Node = {
		id: string;
		x: number;
		y: number;
	};

	return (
		<div>
			<DndContext>
				<div className="canvas">
					<Node id="box-1" />
				</div>
			</DndContext>
		</div>
	);
}

export default Canvas;
