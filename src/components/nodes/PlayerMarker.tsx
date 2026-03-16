import { CSSProperties, RefCallback } from "react";

type PlayerMarkerProps = {
	jerseyNumber?: number;
	name?: string;
	position?: string;
	containerRef: RefCallback<HTMLDivElement>;
	handleRef: RefCallback<HTMLDivElement>;
	style: CSSProperties;
};

function PlayerMarker({
	jerseyNumber,
	name,
	position,
	containerRef,
	handleRef,
	style,
}: PlayerMarkerProps) {
	return (
		<div ref={containerRef} style={style} className="node player noselect">
			<div ref={handleRef} className="player__sprite drag-handle">
				<span className="player__number">
					{jerseyNumber ? jerseyNumber : null}
				</span>
			</div>
			<h3>{name}</h3>
		</div>
	);
}

export default PlayerMarker;
