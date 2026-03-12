import { useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import TestCanvas from "./TestCanvas";
import TestToolbar from "./TestToolbar";
import { NodeFactory } from "../models/NodeFactory";
import { Node } from "../models/Node";
import { NodeType } from "../models/NodeType";

function TestHome() {
	const [nodes, setNodes] = useState<Node[]>([
		NodeFactory.create(NodeType.Player, {
			x: 0,
			y: 0,
			jerseyNumber: 14,
			name: "Bonmati",
		}),
		NodeFactory.create(NodeType.Cone, { x: 100, y: 100 }),
	]);

	/**
	 * Using `any` for `event` to keep code simple and readable.
	 * TypeScript would otherwise require explicit types here.
	 * The DragDropProvider already enforces the correct type at usage.
	 * The DragStartEvent type is incompatible in this context.
	 * Contributors can safely update this if the provider changes types.
	 */
	function handleDragStart(event: any) {
		console.log("---- handleDragStart ----");
		console.log(event);
		console.log(event.operation);
	}

	function handleDragEnd(event: any) {
		console.log("---- handleDragEnd ----");
		console.log(event);
		const { transform } = event.operation;
	}

	return (
		<main className="testHome view">
			<DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<TestToolbar />
				<TestCanvas nodes={nodes} />
			</DragDropProvider>
		</main>
	);
}

export default TestHome;
