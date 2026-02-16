import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Node } from "../models/Node";
import { Player } from "../models/Player";
import { Cone } from "../models/Cone";
import MultiNodeView from "./nodes/MultiNodeView";

function Canvas() {
	// TODO: Move node creation to NodeFactory.ts
	const [nodes, setNodes] = useState<Node[]>([
		new Player("node101", 0, 0, 14, "Bonmati"),
		new Cone("node102", 100, 100),
	]);

	function handleDragEnd(event: DragEndEvent) {
		const { active, delta } = event;

		setNodes((prev) => {
			const next = [...prev];

			const node = next.find((n) => n.id === active.id);
			if (!node) return prev;

			node.moveBy(delta.x, delta.y);
			return next;
		});
	}

	return (
		<div className="canvas">
			<DndContext
				onDragEnd={handleDragEnd}
				modifiers={[restrictToParentElement]}
				autoScroll={false}
			>
				{nodes.map((node) => (
					<MultiNodeView node={node} key={node.id} />
				))}

				<DragOverlay className="drag-overlay" />
			</DndContext>
		</div>
	);
}

export default Canvas;
