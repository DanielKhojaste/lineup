import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { useDraggable } from "@dnd-kit/react";
import { RefObject } from "react";

type TestPlayerProps = {
	canvasRef: RefObject<HTMLElement | null>;
	name: string;
	jerseyNumber: number;
};

function TestPlayer({ canvasRef, name, jerseyNumber }: TestPlayerProps) {
	const { ref, handleRef } = useDraggable({
		id: `player-${name}`,
		data: {
			from: "canvas-node",
			type: "test-player",
		},
		modifiers: [
			RestrictToElement.configure({
				element: () => canvasRef.current,
			}),
		],
	});

	return (
		<div ref={ref} className="node player noselect">
			<div ref={handleRef} className="player__sprite drag-handle">
				<span className="player__number">{jerseyNumber}</span>
			</div>
			<h3>{name}</h3>
		</div>
	);
}

export default TestPlayer;
