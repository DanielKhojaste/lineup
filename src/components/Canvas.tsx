import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Node } from "../models/Node";
import DraggableNode from "./nodes/DraggableNode";

type CanvasProps = {
	nodes: Node[];
};

function Canvas({ nodes }: CanvasProps) {
	return (
		<div id="canvas">
			{nodes.map((node) => (
				<DraggableNode node={node} key={node.id} />
			))}
		</div>
	);
}

export default Canvas;
