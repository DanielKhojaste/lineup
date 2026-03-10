import { DragDropProvider } from "@dnd-kit/react";
import TestCanvas from "./TestCanvas";
import TestToolbar from "./TestToolbar";

function TestHome() {
	return (
		<main className="testHome view">
			<DragDropProvider>
				<TestToolbar />
				<TestCanvas />
			</DragDropProvider>
		</main>
	);
}

export default TestHome;
