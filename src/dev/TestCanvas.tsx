import { DragDropProvider } from "@dnd-kit/react";
import TestPlayer from "./TestPlayer";
import { useRef } from "react";

function TestCanvas() {
	const canvasRef = useRef<HTMLElement | null>(null);

	return (
		<section ref={canvasRef} id="canvas" className="dev-border">
			<DragDropProvider>
				<TestPlayer canvasRef={canvasRef} name="Aitana" jerseyNumber={14} />
			</DragDropProvider>
		</section>
	);
}

export default TestCanvas;
