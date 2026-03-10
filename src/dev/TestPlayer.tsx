import { useDraggable } from "@dnd-kit/react";

type TestPlayerProps = {
	name: string;
	jerseyNumber: number;
};

function TestPlayer({ name, jerseyNumber }: TestPlayerProps) {
	const { ref, handleRef } = useDraggable({
		id: `player-${name}`,
		data: {
			from: "canvas-node",
			type: "test-player",
		},
	});

	return (
		<div ref={ref} className="node player noselect">
			<div className="player__sprite drag-handle">
				<span className="player__number">{jerseyNumber}</span>
			</div>
			<h3>{name}</h3>
		</div>
	);
}

export default TestPlayer;
