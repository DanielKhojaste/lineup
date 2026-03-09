import { useRef, useState } from "react";
import {
	DndContext,
	DragEndEvent,
	DragMoveEvent,
	DragOverlay,
	DragStartEvent,
} from "@dnd-kit/core";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";
import { Node } from "../models/Node";
import { NodeFactory } from "../models/NodeFactory";
import { NodeType } from "../models/NodeType";
import NodePreview from "../components/toolbar/NodePreview";

function Home() {
	const canvasRef = useRef<HTMLDivElement | null>(null);
	const dragStartPosition = useRef<{ x: number; y: number } | null>(null);

	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);

	const [activeNodeType, setActiveNodeType] = useState<NodeType | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [pointerPosition, setPointerPosition] = useState({ x: 0, y: 0 });

	function handleDragStart(event: DragStartEvent) {
		const { active } = event;
		const data = active.data.current;

		if (data?.from === "toolbar") {
			setActiveNodeType(data.nodeType);
		}

		if (data?.from === "canvas-node") {
			const node = nodes.find((n) => n.id === active.id);
			if (node) {
				dragStartPosition.current = { x: node.x, y: node.y };
			}
		}
	}

	function handleDragMove(event: DragMoveEvent) {
		const { active, delta } = event;
		const data = active.data.current;

		if (data?.from !== "canvas-node") return;

		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (!canvasRect || !dragStartPosition.current) return;

		const start = dragStartPosition.current;

		const nextX = start.x + delta.x;
		const nextY = start.y + delta.y;

		setNodes((prev) => {
			const next = [...prev];
			const node = next.find((n) => n.id === active.id);
			if (!node) return prev;

			// TODO: The clamp function only works for the top and left side of the canvas at the time. Must be fixed by updating to the new DND engine.
			node.moveTo(
				{
					x: nextX,
					y: nextY,
				},
				{
					width: canvasRect.width,
					height: canvasRect.height,
				},
			);

			return next;
		});
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveNodeType(null);
		dragStartPosition.current = null;

		const { active, over } = event;
		const data = active.data.current;
		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (!canvasRect) return;

		if (data?.from === "toolbar" && over?.id === "canvas") {
			const translated = active.rect.current.translated;
			if (!translated) return;

			const x = translated.left - canvasRect.left;
			const y = translated.top - canvasRect.top;

			const newNode = NodeFactory.create(data.nodeType, { x, y });

			setNodes((prev) => [...prev, newNode]);
		}
	}

	return (
		<main className="home view">
			<DndContext
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
				autoScroll={false}
			>
				<Toolbar />
				<Canvas ref={canvasRef} nodes={nodes} />

				<DragOverlay className="drag-overlay">
					{activeNodeType ? <NodePreview type={activeNodeType} /> : null}
				</DragOverlay>
			</DndContext>
		</main>
	);
}

export default Home;
