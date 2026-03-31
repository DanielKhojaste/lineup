import { PointerActivationConstraints } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, PointerSensor } from "@dnd-kit/react";
import { useRef, useState } from "react";
import Canvas from "../components/Canvas";
import { DoubleClickSensor } from "../components/sensors/DoubleClickSensor";
import Toolbar from "../components/Toolbar";
import NodePreview from "../components/toolbar/NodePreview";
import { Node } from "../models/Node";
import { NodeFactory } from "../models/NodeFactory";
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

function Home() {
	// Refs:
	const canvasRef = useRef<HTMLElement | null>(null);

	// Sensors:
	const doubleClickSensor = DoubleClickSensor.configure({
		onDoubleClick: (source) => {
			console.log("Node double clicked:", source.id);
		},
	});

	const pointerSensor = PointerSensor.configure({
		activationConstraints: [
			new PointerActivationConstraints.Distance({ value: 5 }),
		],
	});

	// States:
	const [activeNodeOrigin, setActiveNodeOrigin] = useState<string | null>(null);
	const [activeNodeType, setActiveNodeType] = useState<NodeType | null>(null);
	const [editingNode, setEditingNode] = useState<Node | null>(null);
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 0.1, y: 0.1 }),
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

		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (!canvasRect) return;

		// Create new node on the canvas
		if (source?.data.from === "toolbar" && target?.id === "canvas") {
			/**
			 * `shape.current` is typed as a generic `Shape` in dnd-kit, which does
			 * not expose DOMRect properties like `left` and `top`. At runtime it is
			 * produced from `getBoundingClientRect()`, so casting to `DOMRect` is
			 * safe and removes the TypeScript error.
			 */
			const shape = operation.shape?.current as DOMRect | undefined;

			if (!shape || !canvasRect) return;

			// Normalize node coordinates based on canvas dimensions
			const x = (shape.left - canvasRect.left) / canvasRect.width;
			const y = (shape.top - canvasRect.top) / canvasRect.height;

			const newNode = NodeFactory.create(activeNodeType as NodeType, { x, y });

			setNodes((prev) => [...prev, newNode]);
		}

		// Move existing canvas node
		if (source?.data.from === "canvas-node" && target?.id === "canvas") {
			setNodes((prev) =>
				prev.map((node) => {
					if (node.id !== source?.id) return node;

					const dx = transform.x / canvasRect.width;
					const dy = transform.y / canvasRect.height;

					node.moveBy(dx, dy);
					return node;
				}),
			);
		}
	};

	function handleDragOverlay() {
		// The drag overlay should only be displayed when a node is being dragged from the toolbar
		if (activeNodeOrigin === "toolbar") {
			return false;
		}

		return true;
	}

	return (
		<main className="home view">
			<DragDropProvider
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				sensors={[pointerSensor, doubleClickSensor]}
			>
				<Toolbar />
				<Canvas
					canvasRef={canvasRef}
					nodes={nodes}
					onEditNode={setEditingNode}
				/>

				<DragOverlay disabled={handleDragOverlay} dropAnimation={null}>
					<NodePreview
						className="drag-overlay"
						type={activeNodeType as NodeType}
					/>
				</DragOverlay>
			</DragDropProvider>
		</main>
	);
}

export default Home;
