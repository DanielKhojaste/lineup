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
			<h2>{player.name}</h2>
			<span>#{player.jerseyNumber}</span>
		</div>
	);
}

export default PlayerMarker;
