import { Player } from "../../models/Player";

function PlayerMarker({
	player,
	containerProps,
	dragHandleProps,
}: {
	player: Player;
	containerProps: object;
	dragHandleProps: object;
}) {
	return (
		<div className="node player noselect" {...containerProps}>
			<div className="player__sprite" {...dragHandleProps}>
				<span className="player__number">
					{player.jerseyNumber ? player.jerseyNumber : null}
				</span>
			</div>
			<h3>{player.name}</h3>
		</div>
	);
}

export default PlayerMarker;
