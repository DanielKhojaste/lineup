function PlayerMarker({
	jerseyNumber,
	name,
	position,
	containerProps,
	dragHandleProps,
}: {
	jerseyNumber?: number;
	name?: string;
	position?: string;
	containerProps: object;
	dragHandleProps: object;
}) {
	return (
		<div className="node player noselect" {...containerProps}>
			<div className="player__sprite drag-handle" {...dragHandleProps}>
				<span className="player__number">
					{jerseyNumber ? jerseyNumber : null}
				</span>
			</div>
			<h3>{name}</h3>
		</div>
	);
}

export default PlayerMarker;
