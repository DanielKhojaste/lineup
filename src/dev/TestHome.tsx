import { useRef, useState } from "react";
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
	const canvasRef = useRef<HTMLElement | null>(null);

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
		const data = operation.source?.data;

		setActiveNodeType(data?.type);
		setActiveNodeOrigin(data?.from);
	};

	const handleDragEnd: DragEndHandler = ({ operation }) => {
		const { source, transform, target } = operation;
		setActiveNodeOrigin(null);
		setActiveNodeType(null);

		// Create new node on the canvas
		if (source?.data.from === "test-toolbar" && target?.id === "test-canvas") {
			const canvasRect = canvasRef.current?.getBoundingClientRect();

			/**
			 * `shape.current` is typed as a generic `Shape` in dnd-kit, which does not
			 * expose DOMRect properties like `left` and `top`. At runtime it is produced
			 * from `getBoundingClientRect()`, so casting to `DOMRect` is safe and removes
			 * the TypeScript error.
			 */
			const shape = operation.shape?.current as DOMRect | undefined;

			if (!shape || !canvasRect) return;

			const x = shape.left - canvasRect.left;
			const y = shape.top - canvasRect.top;

			const newNode = NodeFactory.create(activeNodeType as NodeType, { x, y });

			setNodes((prev) => [...prev, newNode]);
		}

		// Move existing canvas node
		if (source?.data.from === "canvas-node" && target?.id === "test-canvas") {
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
				<TestCanvas canvasRef={canvasRef} nodes={nodes} />

				<DragOverlay disabled={handleDragOverlay} dropAnimation={null}>
					<span>{activeNodeType}</span>
				</DragOverlay>
			</DragDropProvider>
		</main>
	);
}

export default TestHome;
