import { useDraggable } from "@dnd-kit/react";
import { CSS } from "@dnd-kit/utilities";

function TestDraggable({ name }: { name: string }) {
	const { ref, handleRef } = useDraggable({
		id: "tempId",
		data: {
			from: "canvas-node",
			type: "test-node",
		},
	});

	return (
		<div ref={ref}>
			<span>{name}</span>
		</div>
	);
}

export default TestDraggable;
