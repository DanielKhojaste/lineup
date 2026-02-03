import { useState, useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import Node from "./nodes/Node";

type NodeType = {
	id: string;
	x: number;
	y: number;
};

function Canvas() {
	const initialNodes: NodeType[] = [
		{ id: "player1", x: 34, y: 56 },
		{ id: "player2", x: 128, y: 80 },
	];

	const [nodes, setNodes] = useState<NodeType[]>([]);

	return (
		<div>
			<DndContext>
				<div className="canvas">
					<Node id="node1" x={0} y={0} />
				</div>
			</DndContext>
		</div>
	);
}

export default Canvas;
