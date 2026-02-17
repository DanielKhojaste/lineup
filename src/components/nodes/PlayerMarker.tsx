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
			<div className="player__sprite">
				<span className="player__number">
					{player.jerseyNumber ? player.jerseyNumber : null}
				</span>
			</div>
			<h3>{player.name}</h3>
		</div>
	);
}

export default PlayerMarker;
