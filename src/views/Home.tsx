import { useRef, useState } from "react";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
import { Node } from "../models/Node";
import { NodeFactory } from "../models/NodeFactory";
import { NodeType } from "../models/NodeType";

function Home() {
	const canvasRef = useRef<HTMLDivElement | null>(null);
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);
	const [activeNodeType, setActiveNodeType] = useState(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	function handleDragStart(event: DragStartEvent) {
		const { active } = event;
		const data = active.data.current;

		// PENDING: Only save the active node type when the origin is the toolbar.

		/**
		 * When creating a node by dragging one from the toolbar, we save the active node type in the state. This will be used in the drag overlay to display a preview of its location on the canvas.
		 */
		if (data?.from === "toolbar") {
			setActiveNodeType(data.nodeType);
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveNodeType(null);

		const { active, delta, over } = event;
		const data = active.data.current;

		if (data?.from === "toolbar") {
			// Create node
		}

		if (data?.from === "canvas-node") {
			// Move existing node
			setNodes((prev) => {
				const next = [...prev];

				const node = next.find((n) => n.id === active.id);
				if (!node) return prev;

				node.moveBy(delta.x, delta.y);
				return next;
			});
		}
	}

	return (
		<main className="home view">
			<DndContext
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				modifiers={[restrictToParentElement]}
				autoScroll={false}
			>
				<Toolbar />
				<Canvas ref={canvasRef} nodes={nodes} />

				<DragOverlay className="drag-overlay">
					{activeNodeType ? <h3>{activeNodeType}</h3> : null}
				</DragOverlay>
			</DndContext>
		</main>
	);
}

export default Home;
