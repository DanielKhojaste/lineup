import { memo } from "react";
import {
	BALL_RADIUS,
	CONE_SIZE,
	PLAYER_RADIUS,
	toBoardUnits,
} from "../../model/pitch";
import {
	Board,
	BoardNode,
	ConeNode,
	GoalNode,
	MannequinNode,
	PlayerNode,
	PoleNode,
} from "../../model/types";
import { playerKit } from "../../model/board";
import { readableOn } from "../../theme/color";
import { truncate } from "../../utils/text";

/** Longest caption (position · name) drawn under a player before it is cut short. */
export const CAPTION_MAX = 22;

interface MarkerProps<T extends BoardNode> {
	node: T;
	selected: boolean;
	board: Board;
}

/** Number of vertical bands in a striped kit (kit colour, stripe, kit, stripe, kit). */
const STRIPE_BANDS = 5;

/**
 * The stripe bands of a striped kit, as circle segments. Built as plain paths
 * rather than a clip path so that boards drawn several times on one page (the
 * library previews) never share an SVG id.
 */
export function stripePaths(r: number): string[] {
	const width = (2 * r) / STRIPE_BANDS;
	const paths: string[] = [];
	for (let band = 1; band < STRIPE_BANDS; band += 2) {
		const a = -r + band * width;
		const b = a + width;
		const ya = Math.sqrt(r * r - a * a);
		const yb = Math.sqrt(r * r - b * b);
		paths.push(
			`M${a} ${-ya}A${r} ${r} 0 0 1 ${b} ${-yb}L${b} ${yb}A${r} ${r} 0 0 1 ${a} ${ya}Z`,
		);
	}
	return paths;
}

function SelectionRing({ r, selected }: { r: number; selected: boolean }) {
	return (
		<>
			<circle className="marker__hover" r={r + 6} />
			{selected && <circle className="marker__selection" r={r + 7} />}
		</>
	);
}

function PlayerMarker({ node, selected, board }: MarkerProps<PlayerNode>) {
	const kit = playerKit(node, board.teams);
	const fill = kit.color;
	const ink = readableOn(fill, "#FFFFFF", "#15181B");
	const outline = ink === "#FFFFFF" ? "#FFFFFF" : "#15181B";
	const caption = truncate(
		[node.label, node.name].filter(Boolean).join(" · "),
		CAPTION_MAX,
	);
	const numberText = node.number !== undefined ? String(node.number) : "";

	return (
		<>
			<SelectionRing r={PLAYER_RADIUS} selected={selected} />
			<circle r={PLAYER_RADIUS} fill={fill} />
			{kit.stripes &&
				stripePaths(PLAYER_RADIUS).map((d) => (
					<path key={d} d={d} fill={kit.stripes} />
				))}
			<circle
				r={PLAYER_RADIUS}
				fill="none"
				stroke={outline}
				strokeWidth={2.5}
			/>
			{numberText && (
				<text
					className="marker__number"
					fill={ink}
					// On stripes, a thin edge in the kit colour keeps the number readable.
					stroke={kit.stripes ? fill : undefined}
					strokeWidth={kit.stripes ? 3 : undefined}
					paintOrder="stroke"
					fontSize={numberText.length > 2 ? 13 : 16}
					textAnchor="middle"
					dominantBaseline="central"
				>
					{numberText}
				</text>
			)}
			{board.display.showLabels && caption && (
				<text
					className="marker__caption"
					y={PLAYER_RADIUS + 16}
					textAnchor="middle"
				>
					{caption}
				</text>
			)}
		</>
	);
}

function ConeMarker({ node, selected }: MarkerProps<ConeNode>) {
	const s = CONE_SIZE;
	return (
		<>
			<SelectionRing r={s * 0.75} selected={selected} />
			<path
				d={`M0 ${-s * 0.75}L${s * 0.62} ${s * 0.55}H${-s * 0.62}Z`}
				fill={node.color}
				stroke="#15181B"
				strokeOpacity={0.6}
				strokeWidth={1.5}
				strokeLinejoin="round"
			/>
		</>
	);
}

function BallMarker({ selected }: MarkerProps<BoardNode>) {
	const r = BALL_RADIUS;
	return (
		<>
			<SelectionRing r={r + 4} selected={selected} />
			<circle r={r} fill="#FFFFFF" stroke="#15181B" strokeWidth={2} />
			<path
				d={`M0 ${-r * 0.45}L${r * 0.43} ${-r * 0.14}L${r * 0.27} ${r * 0.37}H${
					-r * 0.27
				}L${-r * 0.43} ${-r * 0.14}Z`}
				fill="#15181B"
			/>
		</>
	);
}

export const GOAL_SIZES = {
	full: { width: 73.2, depth: 20 },
	mini: { width: 36, depth: 12 },
};

function GoalMarker({ node, selected }: MarkerProps<GoalNode>) {
	const { width: w, depth: d } = GOAL_SIZES[node.size];
	const half = w / 2;
	const netLines = [];
	for (let y = -half + 8; y < half; y += 8) netLines.push(`M${-d} ${y}H0`);
	for (let x = -d + d / 3; x < 0; x += d / 3)
		netLines.push(`M${x} ${-half}V${half}`);

	return (
		<g transform={`rotate(${node.rotation})`}>
			<rect
				className="marker__hover marker__hover--box"
				x={-d - 6}
				y={-half - 6}
				width={d + 12}
				height={w + 12}
				rx={4}
			/>
			{selected && (
				<rect
					className="marker__selection"
					x={-d - 7}
					y={-half - 7}
					width={d + 14}
					height={w + 14}
					rx={5}
				/>
			)}
			<rect
				x={-d}
				y={-half}
				width={d}
				height={w}
				fill="#FFFFFF"
				fillOpacity={0.14}
			/>
			<path
				d={netLines.join("")}
				stroke="#FFFFFF"
				strokeOpacity={0.35}
				strokeWidth={1}
			/>
			<path
				d={`M0 ${-half}H${-d}V${half}H0`}
				fill="none"
				stroke="#FFFFFF"
				strokeWidth={3}
				strokeLinejoin="round"
			/>
			<line
				x1={0}
				y1={-half}
				x2={0}
				y2={half}
				stroke="#FFFFFF"
				strokeWidth={4}
				strokeLinecap="round"
			/>
		</g>
	);
}

function MannequinMarker({ node, selected }: MarkerProps<MannequinNode>) {
	return (
		<>
			<SelectionRing r={17} selected={selected} />
			<g transform={`rotate(${node.rotation})`}>
				<ellipse
					rx={7}
					ry={15}
					fill={node.color}
					stroke="#15181B"
					strokeWidth={1.8}
				/>
				<circle
					cx={1.5}
					r={6}
					fill={node.color}
					stroke="#15181B"
					strokeWidth={1.8}
				/>
				<path d="M9 -3.5L14 0L9 3.5Z" fill="#15181B" />
			</g>
		</>
	);
}

function PoleMarker({ node, selected }: MarkerProps<PoleNode>) {
	return (
		<>
			<SelectionRing r={10} selected={selected} />
			<circle
				r={9}
				fill="#FFFFFF"
				fillOpacity={0.22}
				stroke="#FFFFFF"
				strokeOpacity={0.6}
				strokeWidth={1.5}
			/>
			<circle r={4.5} fill={node.color} stroke="#15181B" strokeWidth={1.5} />
		</>
	);
}

function describe(node: BoardNode, board: Board): string {
	switch (node.kind) {
		case "player": {
			const team = board.teams[node.team].name;
			const role = node.keeper ? "keeper" : "player";
			const number = node.number !== undefined ? ` #${node.number}` : "";
			return `${team} ${role}${number}${node.label ? `, ${node.label}` : ""}${
				node.name ? `, ${node.name}` : ""
			}`;
		}
		case "cone":
			return "Cone";
		case "ball":
			return "Ball";
		case "goal":
			return node.size === "mini" ? "Mini goal" : "Goal";
		case "mannequin":
			return "Mannequin";
		case "pole":
			return "Pole";
	}
}

interface NodeMarkerProps {
	node: BoardNode;
	selected: boolean;
	board: Board;
}

function NodeMarker({ node, selected, board }: NodeMarkerProps) {
	const { x, y } = toBoardUnits(node.x, node.y);
	return (
		<g
			className={`marker marker--${node.kind}${selected ? " is-selected" : ""}`}
			transform={`translate(${x} ${y})`}
			data-item-id={node.id}
			role="img"
			aria-label={describe(node, board)}
		>
			{node.kind === "player" && (
				<PlayerMarker node={node} selected={selected} board={board} />
			)}
			{node.kind === "cone" && (
				<ConeMarker node={node} selected={selected} board={board} />
			)}
			{node.kind === "ball" && (
				<BallMarker node={node} selected={selected} board={board} />
			)}
			{node.kind === "goal" && (
				<GoalMarker node={node} selected={selected} board={board} />
			)}
			{node.kind === "mannequin" && (
				<MannequinMarker node={node} selected={selected} board={board} />
			)}
			{node.kind === "pole" && (
				<PoleMarker node={node} selected={selected} board={board} />
			)}
		</g>
	);
}

export default memo(NodeMarker);
export { describe as describeNode };
