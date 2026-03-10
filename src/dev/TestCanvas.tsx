import { DragDropProvider } from "@dnd-kit/react";
import TestPlayer from "./TestPlayer";

function TestCanvas() {
	return (
		<section id="canvas" className="dev-border">
			<DragDropProvider>
				<TestPlayer name="Aitana" jerseyNumber={14} />
			</DragDropProvider>
		</section>
	);
}

export default TestCanvas;
