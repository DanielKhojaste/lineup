import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { useDraggable } from "@dnd-kit/react";
import { RefObject } from "react";
import { Node } from "../../models/Node";
import NodeRenderer from "./NodeRenderer";

type DraggableNodeProps = {
	node: Node;
	canvasRef: RefObject<HTMLElement | null>;
};

function DraggableNode({ node, canvasRef }: DraggableNodeProps) {
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

	return (
		<NodeRenderer
			node={node}
			containerRef={ref}
			handleRef={handleRef}
			style={style}
		/>
	);
}

export default DraggableNode;
