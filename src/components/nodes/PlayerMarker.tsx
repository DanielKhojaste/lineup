import { Player } from "../../models/Player";

function PlayerMarker({
	player,
	draggableProps,
}: {
	player: Player;
	draggableProps: object;
}) {
	return (
		<div className="node player" {...draggableProps}>
			<div className="player__sprite"></div>
			<h2>Player</h2>
			<span>#7</span>
		</div>
	);
}

export default PlayerMarker;
