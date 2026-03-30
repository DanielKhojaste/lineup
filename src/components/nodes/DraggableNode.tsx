import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { useDraggable } from "@dnd-kit/react";
import { RefObject } from "react";
import { Node } from "../../models/Node";
import NodeRenderer from "./NodeRenderer";

type DraggableNodeProps = {
	node: Node;
	canvasRef: RefObject<HTMLElement | null>;
	onEditNode: (node: Node) => void;
};

function DraggableNode({ node, canvasRef, onEditNode }: DraggableNodeProps) {
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
		left: `${node.x * 100}%`,
		top: `${node.y * 100}%`,
	};

	function tempDoubleClick(node: Node) {
		console.log(`Double Click: ${node.id}`);
	}

	return (
		<NodeRenderer
			node={node}
			containerRef={ref}
			handleRef={handleRef}
			style={style}
			onDoubleClick={() => {
				tempDoubleClick(node);
			}}
		/>
	);
}

export default DraggableNode;
