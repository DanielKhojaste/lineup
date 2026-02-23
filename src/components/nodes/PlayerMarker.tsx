import { Player } from "../../models/Player";

function PlayerMarker({
	node,
	containerProps,
	dragHandleProps,
}: {
	node: Player;
	containerProps: object;
	dragHandleProps: object;
}) {
	return (
		<div className="node player noselect" {...containerProps}>
			<div className="player__sprite drag-handle" {...dragHandleProps}>
				<span className="player__number">
					{node.jerseyNumber ? node.jerseyNumber : null}
				</span>
			</div>
			<h3>{node.name}</h3>
		</div>
	);
}

export default PlayerMarker;
