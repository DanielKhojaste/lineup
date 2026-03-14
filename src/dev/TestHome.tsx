import { useState } from "react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import TestCanvas from "./TestCanvas";
import TestToolbar from "./TestToolbar";
import { NodeFactory } from "../models/NodeFactory";
import { Node } from "../models/Node";
import { NodeType } from "../models/NodeType";

/**
 * The drag handler types are inferred from DragDropProvider instead of
 * importing event types directly. The drag event types featured in the docs are
 * incompatible in this context. The DragDropProvider already enforces the
 * correct type before usage. Contributors can safely update this if the
 * provider changes types.
 */
type DragStartHandler = NonNullable<
	React.ComponentProps<typeof DragDropProvider>["onDragStart"]
>;

type DragEndHandler = NonNullable<
	React.ComponentProps<typeof DragDropProvider>["onDragEnd"]
>;

function TestHome() {
	const [activeNodeOrigin, setActiveNodeOrigin] = useState<string | null>(null);
	const [activeNodeType, setActiveNodeType] = useState<NodeType | null>(null);
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);

	const handleDragStart: DragStartHandler = ({ operation }) => {
		console.log("---- handleDragStart ----");
		console.log(operation);
		const data = operation.source?.data;

		setActiveNodeType(data?.type);
		setActiveNodeOrigin(data?.from);
	};

	const handleDragEnd: DragEndHandler = ({ operation }) => {
		console.log(operation);
		const { source, transform, target } = operation;

		// Create new node on the canvas
		if (source?.data.from == "test-toolbar" && target?.id === "test-canvas") {
			console.log("Create new node on the canvas");
			// pass
		}

		// Move existing canvas node
		if (source?.data.from === "canvas-node" && target?.id === "test-canvas") {
			console.log("Move existing canvas node");

			setNodes((prev) =>
				prev.map((node) => {
					if (node.id !== source?.id) return node;

					node.moveBy(transform.x, transform.y);
					return node;
				}),
			);
		}
	};

	function handleDragOverlay() {
		// The drag overlay should only be displayed when a node is being dragged from the toolbar
		if (activeNodeOrigin == "test-toolbar") {
			return false;
		}

		return true;
	}

	return (
		<main className="home view">
			<DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<TestToolbar />
				<TestCanvas nodes={nodes} />

				<DragOverlay disabled={handleDragOverlay}>
					<span>Overlaaay!</span>
				</DragOverlay>
			</DragDropProvider>
		</main>
	);
}

export default TestHome;
