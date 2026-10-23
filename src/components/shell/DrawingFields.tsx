import { DRAW_COLORS, ToolStyles } from "../../model/drawings";
import {
	ArrowHeads,
	Drawing,
	LineStroke,
	StrokeWidth,
	TextSize,
} from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { DrawingPatch } from "../../state/editor";
import { BoardTextarea } from "../ui/fields";
import { common, Segmented, Swatches } from "../ui/controls";

const STROKES: { value: LineStroke; label: string }[] = [
	{ value: "solid", label: "Run" },
	{ value: "dashed", label: "Pass" },
	{ value: "wavy", label: "Dribble" },
];
const HEADS: { value: ArrowHeads; label: string }[] = [
	{ value: "none", label: "None" },
	{ value: "end", label: "End" },
	{ value: "both", label: "Both" },
];
const WIDTHS: { value: StrokeWidth; label: string }[] = [
	{ value: "thin", label: "Thin" },
	{ value: "medium", label: "Medium" },
	{ value: "thick", label: "Thick" },
];
const TEXT_SIZES: { value: TextSize; label: string }[] = [
	{ value: "small", label: "S" },
	{ value: "medium", label: "M" },
	{ value: "large", label: "L" },
];

/** Style properties that carry over to the next drawing of each kind. */
const TOOL_STYLE_KEYS: { [K in keyof ToolStyles]: (keyof ToolStyles[K])[] } = {
	line: ["color", "width"],
	zone: ["color", "shape", "dashed"],
	pen: ["color", "width", "highlighter"],
	text: ["color", "size", "background"],
};

/** Which tool-style group each drawing kind uses. */
const STYLE_GROUP: Record<Drawing["kind"], keyof ToolStyles> = {
	line: "line",
	zone: "zone",
	pen: "pen",
	text: "text",
};

/** Style controls for one or more selected drawings. */
export function DrawingFields({ drawings }: { drawings: Drawing[] }) {
	const { dispatch } = useEditor();
	const ids = drawings.map((d) => d.id);
	const kinds = new Set(drawings.map((d) => d.kind));
	const lines = drawings.filter((d) => d.kind === "line");
	const zones = drawings.filter((d) => d.kind === "zone");
	const pens = drawings.filter((d) => d.kind === "pen");
	const texts = drawings.filter((d) => d.kind === "text");

	const update = (patch: DrawingPatch) => {
		dispatch({ type: "updateDrawings", ids, patch });
		// Remember the style for the next drawing of the same kind.
		for (const kind of kinds) {
			const group = STYLE_GROUP[kind];
			const style = Object.fromEntries(
				Object.entries(patch).filter(([key]) =>
					(TOOL_STYLE_KEYS[group] as string[]).includes(key),
				),
			);
			if (Object.keys(style).length)
				dispatch({ type: "setToolStyle", key: group, patch: style });
		}
	};

	const single = drawings.length === 1 ? drawings[0] : null;

	return (
		<>
			<Swatches
				label="Colour"
				value={common(drawings, (d) => d.color)}
				colors={DRAW_COLORS}
				custom
				onChange={(color) => update({ color })}
			/>
			{kinds.size === 1 && lines.length > 0 && (
				<>
					<Segmented
						label="Type"
						value={common(lines, (d) => d.stroke)}
						options={STROKES}
						onChange={(stroke) => update({ stroke })}
					/>
					<Segmented
						label="Arrowheads"
						value={common(lines, (d) => d.heads)}
						options={HEADS}
						onChange={(heads) => update({ heads })}
					/>
					<Segmented
						label="Width"
						value={common(lines, (d) => d.width)}
						options={WIDTHS}
						onChange={(width) => update({ width })}
					/>
					{lines.some((d) => d.control) ? (
						<button
							type="button"
							className="link-button"
							onClick={() => update({ straighten: true })}
						>
							Straighten
						</button>
					) : (
						<p className="muted small">
							Drag the diamond in the middle of a line to bend it.
						</p>
					)}
				</>
			)}
			{kinds.size === 1 && zones.length > 0 && (
				<>
					<Segmented
						label="Shape"
						value={common(zones, (d) => d.shape)}
						options={[
							{ value: "rect", label: "Rectangle" },
							{ value: "ellipse", label: "Ellipse" },
						]}
						onChange={(shape) => update({ shape })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={zones.every((d) => d.dashed)}
							onChange={(e) => update({ dashed: e.target.checked })}
						/>
						Dashed border
					</label>
				</>
			)}
			{kinds.size === 1 && pens.length > 0 && (
				<>
					<Segmented
						label="Width"
						value={common(pens, (d) => d.width)}
						options={WIDTHS}
						onChange={(width) => update({ width })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={pens.every((d) => d.highlighter)}
							onChange={(e) => update({ highlighter: e.target.checked })}
						/>
						Highlighter
					</label>
				</>
			)}
			{kinds.size === 1 && texts.length > 0 && (
				<>
					{single?.kind === "text" && (
						<BoardTextarea
							label="Text"
							rows={2}
							value={single.text}
							onValue={(text) =>
								dispatch({
									type: "updateDrawing",
									id: single.id,
									changes: { text },
								})
							}
						/>
					)}
					<Segmented
						label="Size"
						value={common(texts, (d) => d.size)}
						options={TEXT_SIZES}
						onChange={(size) => update({ size })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={texts.every((d) => d.background)}
							onChange={(e) => update({ background: e.target.checked })}
						/>
						Background
					</label>
				</>
			)}
		</>
	);
}

const TOOL_HINTS: Record<string, string> = {
	run: "Drag on the pitch to draw a run. Start on a player to attach it. Hold Shift to snap the angle.",
	pass: "Drag on the pitch to draw a pass. Start on a player to attach it. Hold Shift to snap the angle.",
	dribble: "Drag on the pitch to draw a dribble. Hold Shift to snap the angle.",
	line: "Drag on the pitch to draw a line. Hold Shift to snap the angle.",
	zone: "Drag on the pitch to mark out a zone. Hold Shift for a square.",
	pen: "Draw freehand on the pitch.",
	text: "Click the pitch to write. Ctrl+Enter or Esc to finish.",
	eraser:
		"Click or drag over drawings to remove them. Players and equipment stay put.",
};

/** Style for the next drawing, shown while a draw tool is active and nothing is selected. */
export function ToolOptions({ tool }: { tool: string }) {
	const { state, dispatch } = useEditor();
	const styles = state.toolStyles;
	const set = <K extends keyof ToolStyles>(
		key: K,
		patch: Partial<ToolStyles[K]>,
	) => dispatch({ type: "setToolStyle", key, patch });

	const group: keyof ToolStyles | null =
		tool === "zone"
			? "zone"
			: tool === "pen"
			  ? "pen"
			  : tool === "text"
			    ? "text"
			    : tool === "eraser"
			      ? null
			      : "line";

	return (
		<>
			<p className="muted">{TOOL_HINTS[tool]}</p>
			{group && (
				<Swatches
					label="Colour"
					value={styles[group].color}
					colors={DRAW_COLORS}
					custom
					onChange={(color) => set(group, { color })}
				/>
			)}
			{group === "line" && (
				<Segmented
					label="Width"
					value={styles.line.width}
					options={WIDTHS}
					onChange={(width) => set("line", { width })}
				/>
			)}
			{group === "zone" && (
				<>
					<Segmented
						label="Shape"
						value={styles.zone.shape}
						options={[
							{ value: "rect", label: "Rectangle" },
							{ value: "ellipse", label: "Ellipse" },
						]}
						onChange={(shape) => set("zone", { shape })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={styles.zone.dashed}
							onChange={(e) => set("zone", { dashed: e.target.checked })}
						/>
						Dashed border
					</label>
				</>
			)}
			{group === "pen" && (
				<>
					<Segmented
						label="Width"
						value={styles.pen.width}
						options={WIDTHS}
						onChange={(width) => set("pen", { width })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={styles.pen.highlighter}
							onChange={(e) => set("pen", { highlighter: e.target.checked })}
						/>
						Highlighter
					</label>
				</>
			)}
			{group === "text" && (
				<>
					<Segmented
						label="Size"
						value={styles.text.size}
						options={TEXT_SIZES}
						onChange={(size) => set("text", { size })}
					/>
					<label className="check">
						<input
							type="checkbox"
							checked={styles.text.background}
							onChange={(e) => set("text", { background: e.target.checked })}
						/>
						Background
					</label>
				</>
			)}
		</>
	);
}

export function describeDrawing(d: Drawing): string {
	switch (d.kind) {
		case "line":
			if (d.heads === "none")
				return d.stroke === "solid"
					? "Line"
					: d.stroke === "dashed"
					  ? "Dashed line"
					  : "Wavy line";
			return d.stroke === "solid"
				? "Run arrow"
				: d.stroke === "dashed"
				  ? "Pass arrow"
				  : "Dribble arrow";
		case "zone":
			return d.shape === "ellipse" ? "Zone (ellipse)" : "Zone";
		case "pen":
			return d.highlighter ? "Highlighter" : "Ink";
		case "text":
			return d.text.trim() ? `Text: ${d.text.trim().split("\n")[0]}` : "Text";
	}
}
