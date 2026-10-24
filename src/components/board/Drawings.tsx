import { memo } from "react";
import { boundsOf, drawingPoints } from "../../model/drawings";
import {
	Drawing,
	LineDrawing,
	PenDrawing,
	TextDrawing,
	ZoneDrawing,
} from "../../model/types";
import { luminance } from "../../theme/color";
import {
	lineGeometry,
	lineMidpoint,
	penPath,
	penStrokeWidth,
	textBox,
	textLines,
	toUnits,
} from "./geometry";

/** Invisible stroke width around thin shapes so they are easy to click. */
const HIT_PADDING = 14;

function LineShape({ d }: { d: LineDrawing }) {
	const g = lineGeometry(d);
	return (
		<>
			<path
				className="drawing__hit"
				d={g.hitPath}
				strokeWidth={Math.max(18, g.strokeWidth + HIT_PADDING)}
			/>
			<path
				d={g.path}
				fill="none"
				stroke={d.color}
				strokeWidth={g.strokeWidth}
				strokeDasharray={g.dash}
				strokeLinecap={g.dash ? "butt" : "round"}
				strokeLinejoin="round"
			/>
			{g.heads.map((head, i) => (
				<path
					key={i}
					d={head}
					fill={d.color}
					stroke={d.color}
					strokeWidth={1}
					strokeLinejoin="round"
				/>
			))}
		</>
	);
}

function ZoneShape({ d }: { d: ZoneDrawing }) {
	const a = toUnits([d.x, d.y]);
	const b = toUnits([d.x + d.w, d.y + d.h]);
	const common = {
		className: "drawing__zone",
		fill: d.color,
		fillOpacity: 0.16,
		stroke: d.color,
		strokeWidth: 2.5,
		strokeDasharray: d.dashed ? "10 7" : undefined,
	};
	return d.shape === "ellipse" ? (
		<ellipse
			cx={(a.x + b.x) / 2}
			cy={(a.y + b.y) / 2}
			rx={(b.x - a.x) / 2}
			ry={(b.y - a.y) / 2}
			{...common}
		/>
	) : (
		<rect
			x={a.x}
			y={a.y}
			width={b.x - a.x}
			height={b.y - a.y}
			rx={4}
			{...common}
		/>
	);
}

function PenShape({ d }: { d: PenDrawing }) {
	const path = penPath(d);
	const width = penStrokeWidth(d);
	return (
		<>
			<path
				className="drawing__hit"
				d={path}
				strokeWidth={width + HIT_PADDING}
			/>
			<path
				d={path}
				fill="none"
				stroke={d.color}
				strokeWidth={width}
				strokeOpacity={d.highlighter ? 0.4 : 1}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</>
	);
}

function TextShape({ d, hidden }: { d: TextDrawing; hidden: boolean }) {
	const box = textBox(d);
	const centre = toUnits([d.x, d.y]);
	const light = luminance(d.color) > 0.4;
	return (
		<g opacity={hidden ? 0 : 1}>
			<rect
				className="drawing__text-box"
				x={box.x}
				y={box.y}
				width={box.width}
				height={box.height}
				rx={6}
				fill={
					d.background
						? light
							? "rgba(10, 14, 18, 0.62)"
							: "rgba(255, 255, 255, 0.78)"
						: "transparent"
				}
			/>
			<text
				className="drawing__text"
				x={centre.x}
				y={centre.y}
				fontSize={box.size}
				fill={d.color}
				textAnchor="middle"
				dominantBaseline="central"
			>
				{textLines(d).map((line, i) => (
					<tspan key={i} x={centre.x} dy={i === 0 ? 0 : box.lineHeight}>
						{line || " "}
					</tspan>
				))}
			</text>
		</g>
	);
}

interface DrawingShapeProps {
	drawing: Drawing;
	/** Hide a text drawing while it is being edited in place. */
	editing?: boolean;
}

function DrawingShape({ drawing, editing = false }: DrawingShapeProps) {
	return (
		<g className={`drawing drawing--${drawing.kind}`} data-item-id={drawing.id}>
			{drawing.kind === "line" && <LineShape d={drawing} />}
			{drawing.kind === "zone" && <ZoneShape d={drawing} />}
			{drawing.kind === "pen" && <PenShape d={drawing} />}
			{drawing.kind === "text" && <TextShape d={drawing} hidden={editing} />}
		</g>
	);
}

export default memo(DrawingShape);

/** Box around a drawing in board units, padded for its stroke. */
export function drawingBox(d: Drawing) {
	if (d.kind === "text") {
		const b = textBox(d);
		return { x: b.x, y: b.y, width: b.width, height: b.height };
	}
	const { minX, minY, maxX, maxY } = boundsOf(drawingPoints(d));
	const a = toUnits([minX, minY]);
	const b = toUnits([maxX, maxY]);
	const pad = d.kind === "pen" ? penStrokeWidth(d) / 2 + 6 : 8;
	return {
		x: a.x - pad,
		y: a.y - pad,
		width: b.x - a.x + pad * 2,
		height: b.y - a.y + pad * 2,
	};
}

export type HandleId = "from" | "to" | "bend" | "nw" | "ne" | "sw" | "se";

function Handle({
	id,
	x,
	y,
	itemId,
	shape = "circle",
}: {
	id: HandleId;
	x: number;
	y: number;
	itemId: string;
	shape?: "circle" | "diamond";
}) {
	const common = {
		className: `handle handle--${id}`,
		"data-handle": id,
		"data-item-id": itemId,
	};
	return shape === "diamond" ? (
		<rect
			{...common}
			x={x - 7}
			y={y - 7}
			width={14}
			height={14}
			rx={2}
			transform={`rotate(45 ${x} ${y})`}
		/>
	) : (
		<circle {...common} cx={x} cy={y} r={8} />
	);
}

/** Selection outlines, plus edit handles when exactly one line or zone is selected. */
export function SelectionOverlay({ drawings }: { drawings: Drawing[] }) {
	const single = drawings.length === 1 ? drawings[0] : null;

	return (
		<g className="selection-overlay">
			{drawings.map((d) => {
				if (d.kind === "line" && single) return null;
				const box = drawingBox(d);
				return <rect key={d.id} className="selection-box" {...box} rx={6} />;
			})}
			{single?.kind === "line" &&
				(() => {
					const from = toUnits(single.from);
					const to = toUnits(single.to);
					const mid = lineMidpoint(single);
					return (
						<>
							<Handle
								id="bend"
								x={mid.x}
								y={mid.y}
								itemId={single.id}
								shape="diamond"
							/>
							<Handle id="from" x={from.x} y={from.y} itemId={single.id} />
							<Handle id="to" x={to.x} y={to.y} itemId={single.id} />
						</>
					);
				})()}
			{single?.kind === "zone" &&
				(() => {
					const a = toUnits([single.x, single.y]);
					const b = toUnits([single.x + single.w, single.y + single.h]);
					return (
						<>
							<Handle id="nw" x={a.x} y={a.y} itemId={single.id} />
							<Handle id="ne" x={b.x} y={a.y} itemId={single.id} />
							<Handle id="sw" x={a.x} y={b.y} itemId={single.id} />
							<Handle id="se" x={b.x} y={b.y} itemId={single.id} />
						</>
					);
				})()}
		</g>
	);
}
