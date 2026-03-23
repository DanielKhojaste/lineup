import ConeIcon from "../../assets/Nodes/Cone.svg?react";
import { BaseMarkerProps } from "./marker.types";

function ConeMarker({
	containerRef,
	handleRef,
	style,
	className,
}: BaseMarkerProps) {
	return (
		<div ref={containerRef} style={style} className="node cone drag-handle">
			<ConeIcon
				className={`cone-icon ${className}`}
				fill="#7814ff"
				strokeWidth={0}
				stroke="#000"
			/>
		</div>
	);
}

export default ConeMarker;
