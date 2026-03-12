import { useDraggable } from "@dnd-kit/react";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import NodeRenderer from "../components/nodes/NodeRenderer";
import { Node } from "../models/Node";
import { RefObject } from "react";

type DraggableProps = {
	node: Node;
	canvasRef: RefObject<HTMLElement | null>;
};

function TestDraggable({ node, canvasRef }: DraggableProps) {
	const { ref, handleRef } = useDraggable({
		id: `${node.id}`,
		data: {
			from: "canvas-node",
			type: "test-node",
		},
		modifiers: [
			RestrictToElement.configure({
				element: () => canvasRef.current,
			}),
		],
	});

	const style = {
		position: "absolute" as const,
		left: node.x,
		top: node.y,
	};

	return (
		<div ref={ref} style={style}>
			<span className="noselect">{node.getType()}</span>
		</div>
	);
}

export default TestDraggable;
