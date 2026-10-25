import { memo, ReactNode } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";
import { fieldLayout, Sport, SPORT_INFO } from "../../model/sports";
import { PitchSettings } from "../../model/types";

/** Colours of each playing surface: inside the lines, around them, and the lines. */
const SURFACES: Record<
	Sport,
	{
		floor: string;
		outside: string;
		line: string;
		stripes?: boolean;
		key?: string;
	}
> = {
	soccer: {
		floor: "#2D6A48",
		outside: "#2D6A48",
		line: "#FFFFFF",
		stripes: true,
	},
	hockey: { floor: "#2463A6", outside: "#2E7D4F", line: "#FFFFFF" },
	futsal: { floor: "#2F6FAE", outside: "#C9783E", line: "#FFFFFF" },
	handball: {
		floor: "#2F6FAE",
		outside: "#C9783E",
		line: "#FFFFFF",
		key: "#4B8FD0",
	},
	basketball: {
		floor: "#C8925C",
		outside: "#A87542",
		line: "#FFFFFF",
		key: "#A85A3A",
	},
	volleyball: { floor: "#DB7A3C", outside: "#2F6FAE", line: "#FFFFFF" },
};

/** Line width on the board, whatever the sport's scale. */
const LINE_UNITS = 3;

interface Draw {
	/** Length and width of the playing area in metres. */
	L: number;
	W: number;
	/** Line width in metres. */
	lw: number;
	colors: (typeof SURFACES)[Sport];
}

/** Arc of radius r around (cx, cy) between two angles in degrees (0 = +x, clockwise). */
function arc(cx: number, cy: number, r: number, from: number, to: number) {
	const a = (from * Math.PI) / 180;
	const b = (to * Math.PI) / 180;
	const large = Math.abs(to - from) > 180 ? 1 : 0;
	const sweep = to > from ? 1 : 0;
	return `M${cx + r * Math.cos(a)} ${
		cy + r * Math.sin(a)
	}A${r} ${r} 0 ${large} ${sweep} ${cx + r * Math.cos(b)} ${
		cy + r * Math.sin(b)
	}`;
}

/** Draw the same markings at both ends: `end` draws the left end (x grows into the field). */
function bothEnds(L: number, end: ReactNode) {
	return (
		<>
			<g>{end}</g>
			<g transform={`translate(${L} 0) scale(-1 1)`}>{end}</g>
		</>
	);
}

/**
 * Goal-area shape used by futsal and handball: quarter circles of radius r
 * around each post, joined by a straight line.
 */
function dShape(cy: number, post: number, r: number) {
	return `M0 ${cy - post - r}A${r} ${r} 0 0 1 ${r} ${cy - post}L${r} ${
		cy + post
	}A${r} ${r} 0 0 1 0 ${cy + post + r}`;
}

function soccer({ L, W, lw, colors }: Draw) {
	const cy = W / 2;
	// Penalty arc: radius 9.15 m around the spot (11 m), outside the 16.5 m box.
	const dx = 16.5 - 11;
	const dy = Math.sqrt(9.15 ** 2 - dx ** 2);
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			<circle cx={L / 2} cy={cy} r={9.15} />
			<circle
				cx={L / 2}
				cy={cy}
				r={lw * 1.3}
				fill={colors.line}
				stroke="none"
			/>
			{bothEnds(
				L,
				<>
					<rect x={0} y={cy - 20.15} width={16.5} height={40.3} />
					<rect x={0} y={cy - 9.15} width={5.5} height={18.3} />
					<path d={`M16.5 ${cy - dy}A9.15 9.15 0 0 1 16.5 ${cy + dy}`} />
					<rect x={-2} y={cy - 3.66} width={2} height={7.32} />
					<circle
						cx={11}
						cy={cy}
						r={lw * 1.3}
						fill={colors.line}
						stroke="none"
					/>
					<path d={`M0 1A1 1 0 0 0 1 0M0 ${W - 1}A1 1 0 0 1 1 ${W}`} />
				</>,
			)}
		</>
	);
}

function futsal({ L, W, lw, colors }: Draw) {
	const cy = W / 2;
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			<circle cx={L / 2} cy={cy} r={3} />
			<circle
				cx={L / 2}
				cy={cy}
				r={lw * 1.3}
				fill={colors.line}
				stroke="none"
			/>
			{bothEnds(
				L,
				<>
					<path d={dShape(cy, 1.58, 6)} />
					<rect x={-1} y={cy - 1.5} width={1} height={3} />
					<circle
						cx={6}
						cy={cy}
						r={lw * 1.3}
						fill={colors.line}
						stroke="none"
					/>
					<circle
						cx={10}
						cy={cy}
						r={lw * 1.3}
						fill={colors.line}
						stroke="none"
					/>
					<path
						d={`M0 0.25A0.25 0.25 0 0 0 0.25 0M0 ${
							W - 0.25
						}A0.25 0.25 0 0 1 0.25 ${W}`}
					/>
				</>,
			)}
		</>
	);
}

function handball({ L, W, lw, colors }: Draw) {
	const cy = W / 2;
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			{bothEnds(
				L,
				<>
					<path d={`${dShape(cy, 1.5, 6)}Z`} fill={colors.key} stroke="none" />
					<path d={dShape(cy, 1.5, 6)} />
					{/* The 9 m line is cut off by the sidelines. */}
					<clipPath id="handball-court">
						<rect x={-1} y={0} width={L + 2} height={W} />
					</clipPath>
					<path
						d={dShape(cy, 1.5, 9)}
						strokeDasharray={`${lw * 3} ${lw * 3}`}
						clipPath="url(#handball-court)"
					/>
					<line x1={7} y1={cy - 0.5} x2={7} y2={cy + 0.5} />
					<line x1={4} y1={cy - 0.075} x2={4} y2={cy + 0.075} />
					<rect x={-1} y={cy - 1.5} width={1} height={3} />
				</>,
			)}
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
		</>
	);
}

function basketball({ L, W, lw, colors }: Draw) {
	const cy = W / 2;
	const hoop = 1.575;
	// The three-point line runs straight from the baseline, 0.9 m in from the
	// sideline, until it meets the 6.75 m arc around the hoop.
	const side = 0.9;
	const r3 = 6.75;
	const straight = hoop + Math.sqrt(r3 ** 2 - (cy - side) ** 2);
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			<circle cx={L / 2} cy={cy} r={1.8} />
			{bothEnds(
				L,
				<>
					<rect
						x={0}
						y={cy - 2.45}
						width={5.8}
						height={4.9}
						fill={colors.key}
						stroke="none"
					/>
					<path
						d={`M0 ${side}H${straight}A${r3} ${r3} 0 0 1 ${straight} ${
							W - side
						}H0`}
					/>
					<path d={arc(5.8, cy, 1.8, -90, 90)} />
					<path d={arc(5.8, cy, 1.8, 90, 270)} strokeDasharray="0.4 0.35" />
					<path
						d={`M1.2 ${cy - 1.25}H${hoop}A1.25 1.25 0 0 1 ${hoop} ${
							cy + 1.25
						}H1.2`}
					/>
					<line
						x1={1.2}
						y1={cy - 0.9}
						x2={1.2}
						y2={cy + 0.9}
						strokeWidth={lw * 1.6}
					/>
					<circle
						cx={hoop}
						cy={cy}
						r={0.225}
						stroke="#FF7A1A"
						strokeOpacity={1}
						strokeWidth={lw * 1.2}
					/>
				</>,
			)}
		</>
	);
}

function volleyball({ L, W, lw }: Draw) {
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			<line x1={L / 2 - 3} y1={0} x2={L / 2 - 3} y2={W} />
			<line x1={L / 2 + 3} y1={0} x2={L / 2 + 3} y2={W} />
			{/* Net and posts, 1 m outside the sidelines. */}
			<line
				x1={L / 2}
				y1={-1}
				x2={L / 2}
				y2={W + 1}
				stroke="#15181B"
				strokeOpacity={0.9}
				strokeWidth={lw * 2.2}
			/>
			<circle cx={L / 2} cy={-1} r={0.2} fill="#15181B" stroke="none" />
			<circle cx={L / 2} cy={W + 1} r={0.2} fill="#15181B" stroke="none" />
		</>
	);
}

function hockey({ L, W, lw, colors }: Draw) {
	const cy = W / 2;
	return (
		<>
			<line x1={L / 2} y1={0} x2={L / 2} y2={W} />
			<line x1={22.9} y1={0} x2={22.9} y2={W} />
			<line x1={L - 22.9} y1={0} x2={L - 22.9} y2={W} />
			{bothEnds(
				L,
				<>
					<path d={dShape(cy, 1.83, 14.63)} />
					<path
						d={dShape(cy, 1.83, 19.63)}
						strokeDasharray={`${lw * 4} ${lw * 4}`}
					/>
					<rect x={-1.2} y={cy - 1.83} width={1.2} height={3.66} />
					<circle
						cx={6.475}
						cy={cy}
						r={lw * 1.3}
						fill={colors.line}
						stroke="none"
					/>
				</>,
			)}
		</>
	);
}

const MARKINGS: Record<Sport, (d: Draw) => ReactNode> = {
	soccer,
	futsal,
	basketball,
	volleyball,
	handball,
	hockey,
};

const STRIPE_COUNT = 10;

/**
 * The field or court for a board's sport, drawn to scale and fitted into the
 * board. A half field is turned so its goal end is at the top.
 */
function Pitch({ pitch }: { pitch: PitchSettings }) {
	const info = SPORT_INFO[pitch.sport];
	const colors = SURFACES[pitch.sport];
	const layout = fieldLayout(pitch);
	const { scale: s, half } = layout;
	const L = info.length;
	const W = info.width;
	const m = info.margin;
	const lw = LINE_UNITS / s;
	// A half volleyball court is drawn with the net at the top (the half from the
	// net to the end line); other half fields put their goal end at the top.
	const netOnTop = half && pitch.sport === "volleyball";
	// Metres → board units. A half field swaps its axes (a mirror rather than a
	// turn, which is the same for a symmetric field) so its top end is on top.
	const toBoard = half
		? `translate(${layout.x + m * s} ${
				layout.y + m * s
		  }) scale(${s}) matrix(0 1 1 0 0 0)${
				netOnTop ? ` translate(${-L / 2} 0)` : ""
		  }`
		: `translate(${layout.x + m * s} ${layout.y + m * s}) scale(${s})`;
	// On a half field, only one end shows, to just past halfway.
	const shown = netOnTop
		? { x: L / 2 - m, y: -m, w: L / 2 + m * 2, h: W + m * 2 }
		: half
		  ? { x: -m, y: -m, w: L / 2 + m * 2, h: W + m * 2 }
		  : { x: -m, y: -m, w: L + m * 2, h: W + m * 2 };
	const clipId = `pitch-clip-${pitch.sport}-${pitch.variant}`;

	return (
		<g className={`pitch pitch--${pitch.sport}`} aria-hidden="true">
			<rect
				x={0}
				y={0}
				width={BOARD_WIDTH}
				height={BOARD_HEIGHT}
				rx={8}
				fill={colors.outside}
			/>
			<g transform={toBoard}>
				<clipPath id={clipId}>
					<rect x={shown.x} y={shown.y} width={shown.w} height={shown.h} />
				</clipPath>
				<g clipPath={`url(#${clipId})`}>
					<rect
						x={shown.x}
						y={shown.y}
						width={shown.w}
						height={shown.h}
						fill={colors.outside}
					/>
					<rect x={0} y={0} width={L} height={W} fill={colors.floor} />
					{colors.stripes && (
						<g fill="#000" fillOpacity={0.07}>
							{Array.from({ length: STRIPE_COUNT / 2 }, (_, i) => (
								<rect
									key={i}
									x={(i * L * 2) / STRIPE_COUNT}
									y={-m}
									width={L / STRIPE_COUNT}
									height={W + m * 2}
								/>
							))}
						</g>
					)}
					<g
						className="pitch__lines"
						fill="none"
						stroke={colors.line}
						strokeOpacity={0.85}
						strokeWidth={lw}
					>
						<rect x={0} y={0} width={L} height={W} />
						{MARKINGS[pitch.sport]({ L, W, lw, colors })}
					</g>
				</g>
			</g>
		</g>
	);
}

export default memo(Pitch);
