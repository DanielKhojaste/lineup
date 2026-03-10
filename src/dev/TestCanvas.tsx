import { DragDropProvider } from "@dnd-kit/react";
import TestDraggable from "./TestDraggable";

function TestCanvas() {
	return (
		<section>
			<DragDropProvider>
				<TestDraggable name="Cool" />
			</DragDropProvider>
		</section>
	);
}

export default TestCanvas;
