import { forwardRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Node } from "../models/Node";
import DraggableNode from "./nodes/DraggableNode";

type CanvasProps = {
	nodes: Node[];
};

function Canvas(
	{ nodes }: CanvasProps,
	externalRef: React.ForwardedRef<HTMLDivElement>,
) {
	const { setNodeRef } = useDroppable({
		id: "canvas",
	});

	return (
		<div
			id="canvas"
			ref={(node) => {
				// Pass the ref to DND Kit
				setNodeRef(node);

				// Pass the ref to Home
				if (typeof externalRef === "function") {
					externalRef(node);
				} else if (externalRef) {
					externalRef.current = node;
				}
			}}
		>
			{nodes.map((node) => (
				<DraggableNode node={node} key={node.id} />
			))}
		</div>
	);
}

export default forwardRef(Canvas);
