import { CSSProperties, RefCallback } from "react";
import ConeIcon from "../../assets/Nodes/Cone.svg?react";

type ConeMarkerProps = {
	containerRef: RefCallback<HTMLDivElement>;
	handleRef: RefCallback<HTMLDivElement>;
	style: CSSProperties;
};

function ConeMarker({ containerRef, handleRef, style }: ConeMarkerProps) {
	return (
		<div ref={containerRef} style={style} className="node cone drag-handle">
			<ConeIcon
				className="cone-icon"
				fill="#7814ff"
				strokeWidth={0}
				stroke="#000"
			/>
		</div>
	);
}

export default ConeMarker;
