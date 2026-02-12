import { Cone } from "../../models/Cone";
import ConeIcon from "../../assets/Nodes/Cones/Flat 1.1 - InkScape - Stroke 2px.svg?react";

function ConeMarker({
	cone,
	draggableProps,
}: {
	cone: Cone;
	draggableProps: object;
}) {
	return (
		<div className="node cone" {...draggableProps}>
			<ConeIcon className="cone-icon" />
		</div>
	);
}

export default ConeMarker;
