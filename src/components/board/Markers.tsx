import { memo } from "react";
import {
	BALL_RADIUS,
	CONE_SIZE,
	PLAYER_RADIUS,
	toBoardUnits,
} from "../../model/pitch";
import { Board, BoardNode, ConeNode, PlayerNode } from "../../model/types";
import { readableOn } from "../../theme/color";

interface MarkerProps<T extends BoardNode> {
	node: T;
	selected: boolean;
	board: Board;
}

export function playerFill(node: PlayerNode, teams: Board["teams"]): string {
	const team = teams[node.team];
	return node.keeper ? team.keeperColor : team.color;
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
	const fill = playerFill(node, board.teams);
	const ink = readableOn(fill, "#FFFFFF", "#15181B");
	const outline = ink === "#FFFFFF" ? "#FFFFFF" : "#15181B";
	const caption = [node.label, node.name].filter(Boolean).join(" · ");
	const numberText = node.number !== undefined ? String(node.number) : "";

	return (
		<>
			<SelectionRing r={PLAYER_RADIUS} selected={selected} />
			<circle
				r={PLAYER_RADIUS}
				fill={fill}
				stroke={outline}
				strokeWidth={2.5}
			/>
			{numberText && (
				<text
					className="marker__number"
					fill={ink}
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
			data-node-id={node.id}
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
		</g>
	);
}

export default memo(NodeMarker);
export { describe as describeNode };
