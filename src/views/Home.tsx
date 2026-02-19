import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
import { Node } from "../models/Node";
import { Player } from "../models/Player";
import { Cone } from "../models/Cone";
import { NodeFactory } from "../models/NodeFactory";
import { NodeType } from "../models/NodeType";

function Home() {
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	function handleDragEnd(event: DragEndEvent) {
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
		<DndContext
			onDragEnd={handleDragEnd}
			modifiers={[restrictToParentElement]}
			autoScroll={false}
		>
			<main className="home view">
				<Toolbar />
				<Canvas nodes={nodes} />
			</main>
		</DndContext>
	);
}

export default Home;
