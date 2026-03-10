import { DragDropProvider } from "@dnd-kit/react";
import TestCanvas from "./TestCanvas";
import TestToolbar from "./TestToolbar";

function TestHome() {
	/**
	 * Using `any` for `event` to keep code simple and readable.
	 * TypeScript would otherwise require explicit types here.
	 * The DragDropProvider already enforces the correct type at usage.
	 * The DragStartEvent type is incompatible in this context.
	 * Contributors can safely update this if the provider changes types.
	 */
	function handleDragStart(event: any) {
		console.log(event.operation);
	}

	return (
		<main className="testHome view">
			<DragDropProvider onDragStart={handleDragStart}>
				<TestToolbar />
				<TestCanvas />
			</DragDropProvider>
		</main>
	);
}

export default TestHome;
