import { BaseMarkerProps } from "./marker.types";

export interface PlayerMarkerProps extends BaseMarkerProps {
	jerseyNumber?: number;
	name?: string;
	position?: string;
}

function PlayerMarker({
	jerseyNumber,
	name,
	position,
	containerRef,
	handleRef,
	style,
	className,
}: PlayerMarkerProps) {
	return (
		<div
			ref={containerRef}
			style={style}
			className={`node player noselect ${className}`}
		>
			<div ref={handleRef} className="player__sprite drag-handle">
				<span className="player__number">
					{jerseyNumber ? jerseyNumber : null}
				</span>
			</div>
			<span className="player__name">{name}</span>
		</div>
	);
}

export default PlayerMarker;
