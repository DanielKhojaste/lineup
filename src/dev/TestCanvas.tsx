import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import TestPlayer from "./TestPlayer";
import { useRef } from "react";

function TestCanvas() {
	const canvasRef = useRef<HTMLElement | null>(null);
	const { ref: droppableRef } = useDroppable({
		id: "test-canvas",
	});

	const combinedRef = (element: HTMLElement) => {
		canvasRef.current = element;
		droppableRef(element);
	};

	return (
		<section ref={combinedRef} id="canvas" className="dev-border">
			<TestPlayer canvasRef={canvasRef} name="Aitana" jerseyNumber={14} />
		</section>
	);
}

export default TestCanvas;
