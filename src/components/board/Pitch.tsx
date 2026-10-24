import { memo } from "react";
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	PITCH_LENGTH,
	PITCH_WIDTH,
	RUN_OFF,
} from "../../model/pitch";

const GRASS = "#2D6A48";
const STRIPE_COUNT = 10;

/** A full-size soccer pitch with markings, drawn in board units (10 per metre). */
function Pitch() {
	const L = PITCH_LENGTH;
	const W = PITCH_WIDTH;
	const cy = W / 2;
	const stripe = L / STRIPE_COUNT;

	// Penalty arc: radius 9.15 m around the penalty spot (11 m), outside the 16.5 m box.
	const arcDx = 165 - 110;
	const arcDy = Math.sqrt(91.5 ** 2 - arcDx ** 2);

	return (
		<g className="pitch" aria-hidden="true">
			<rect
				x={0}
				y={0}
				width={BOARD_WIDTH}
				height={BOARD_HEIGHT}
				rx={8}
				fill={GRASS}
			/>
			<g transform={`translate(${RUN_OFF} ${RUN_OFF})`}>
				<g fill="#000" fillOpacity={0.07}>
					{Array.from({ length: STRIPE_COUNT / 2 }, (_, i) => (
						<rect
							key={i}
							x={i * stripe * 2}
							y={-RUN_OFF}
							width={stripe}
							height={W + RUN_OFF * 2}
						/>
					))}
				</g>
				<g fill="none" stroke="#fff" strokeOpacity={0.82} strokeWidth={3}>
					<rect x={0} y={0} width={L} height={W} />
					<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
					<circle cx={L / 2} cy={cy} r={91.5} />
					<rect x={0} y={cy - 201.5} width={165} height={403} />
					<rect x={L - 165} y={cy - 201.5} width={165} height={403} />
					<rect x={0} y={cy - 91.5} width={55} height={183} />
					<rect x={L - 55} y={cy - 91.5} width={55} height={183} />
					<path d={`M165 ${cy - arcDy}A91.5 91.5 0 0 1 165 ${cy + arcDy}`} />
					<path
						d={`M${L - 165} ${cy - arcDy}A91.5 91.5 0 0 0 ${L - 165} ${
							cy + arcDy
						}`}
					/>
					<rect x={-18} y={cy - 36.6} width={18} height={73.2} />
					<rect x={L} y={cy - 36.6} width={18} height={73.2} />
					<path d={`M0 10A10 10 0 0 0 10 0M${L - 10} 0A10 10 0 0 0 ${L} 10`} />
					<path
						d={`M0 ${W - 10}A10 10 0 0 1 10 ${W}M${
							L - 10
						} ${W}A10 10 0 0 1 ${L} ${W - 10}`}
					/>
				</g>
				<g fill="#fff" fillOpacity={0.82}>
					<circle cx={L / 2} cy={cy} r={4} />
					<circle cx={110} cy={cy} r={4} />
					<circle cx={L - 110} cy={cy} r={4} />
				</g>
			</g>
		</g>
	);
}

export default memo(Pitch);
