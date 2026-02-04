import { useState, useEffect } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import Node from "./nodes/Node";

type NodeType = {
	id: string;
	x: number;
	y: number;
};

function Canvas() {
	const [nodes, setNodes] = useState<NodeType[]>([
		{ id: "player1", x: 0, y: 0 },
		{ id: "player2", x: 34, y: 56 },
		{ id: "player3", x: 128, y: 80 },
	]);

	function handleDragEnd(event: DragEndEvent) {
		const { active, delta } = event;

		setNodes((prev) =>
			prev.map((node) =>
				node.id === active.id
					? { ...node, x: node.x + delta.x, y: node.y + delta.y }
					: node,
			),
		);
	}

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd}>
				<div className="canvas">
					{nodes.map((node) => (
						<Node id={node.id} x={node.x} y={node.y} key={node.id} />
					))}
				</div>
			</DndContext>
		</div>
	);
}

export default Canvas;
