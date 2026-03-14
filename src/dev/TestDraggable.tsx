import { useDraggable } from "@dnd-kit/react";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { Node } from "../models/Node";
import { RefObject } from "react";
import TestRenderer from "./TestRenderer";

type DraggableProps = {
	node: Node;
	canvasRef: RefObject<HTMLElement | null>;
};

function TestDraggable({ node, canvasRef }: DraggableProps) {
	const { ref, handleRef } = useDraggable({
		id: `${node.id}`,
		data: {
			from: "canvas-node",
			type: node.getType(),
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

	return <TestRenderer node={node} draggableRef={ref} style={style} />;
}

export default TestDraggable;
