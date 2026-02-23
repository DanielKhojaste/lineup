import { Cone } from "../../models/Cone";
import ConeIcon from "../../assets/Nodes/Cone.svg?react";

function ConeMarker({
	cone,
	containerProps,
	dragHandleProps,
}: {
	cone: Cone;
	containerProps: object;
	dragHandleProps: object;
}) {
	return (
		<div
			className="node cone drag-handle"
			{...containerProps}
			{...dragHandleProps}
		>
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
