import { CSSProperties, RefCallback } from "react";

type PlayerMarkerProps = {
	jerseyNumber?: number;
	name?: string;
	position?: string;
	containerRef?: RefCallback<HTMLDivElement>;
	handleRef?: RefCallback<HTMLDivElement>;
	style?: CSSProperties;
	className?: string;
};

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
