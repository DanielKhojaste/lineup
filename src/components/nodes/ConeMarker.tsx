import { Cone } from "../../models/Cone";
import ConeIcon from "../../assets/Nodes/Cone.svg?react";

function ConeMarker({
	cone,
	draggableProps,
}: {
	cone: Cone;
	draggableProps: object;
}) {
	return (
		<div className="node cone drag-handle" {...draggableProps}>
			<ConeIcon
				className="cone-icon"
				fill="#7814ff"
				strokeWidth={0}
				stroke="#000"
			/>
			{/* <span>svgviewer-output (8)</span> */}
		</div>
	);
}

export default ConeMarker;
