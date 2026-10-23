import {
	PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { clamp01 } from "../../model/board";
import {
	createLine,
	createPen,
	createText,
	createZone,
	drawingPoints,
	isLineTool,
} from "../../model/drawings";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";
import {
	Drawing,
	LineDrawing,
	Point,
	TextDrawing,
	ZoneDrawing,
} from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { PlaceTool, selectedDrawings } from "../../state/editor";
import { clientToBoard, isOnBoard } from "./coords";
import DrawingShape, { HandleId, SelectionOverlay } from "./Drawings";
import {
	controlFromMidpoint,
	lineMidpoint,
	simplify,
	toUnits,
} from "./geometry";
import NodeMarker from "./Markers";
import Pitch from "./Pitch";
import TextEditor from "./TextEditor";

/** Screen pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 3;
/** Shapes smaller than this (board units) when released are discarded as accidental clicks. */
const MIN_SHAPE = 8;

const PLACE_TOOLS = new Set<string>([
	"home",
	"away",
	"neutral",
	"keeper",
	"cone",
	"ball",
	"goal",
	"mannequin",
	"pole",
]);

type Pos = { x: number; y: number };

type Interaction = { pointerId: number; startClient: Pos } & (
	| { kind: "drag"; ids: string[]; start: Pos; started: boolean }
	| { kind: "marquee"; start: Pos; additive: boolean }
	| { kind: "line"; id: string; from: Point }
	| { kind: "zone"; id: string; anchor: Point }
	| { kind: "pen"; id: string; points: Point[] }
	| { kind: "handle"; id: string; handle: HandleId; original: Drawing }
	| { kind: "erase"; erased: Set<string> }
);

const clampPoint = (p: Pos): Point => [clamp01(p.x), clamp01(p.y)];

function blurActiveField() {
	const active = document.activeElement;
	if (active instanceof HTMLElement && active !== document.body) active.blur();
}

/** Hold Shift to snap a line to 15° steps. */
function snapAngle(from: Point, to: Point): Point {
	const a = toUnits(from);
	const b = toUnits(to);
	const len = Math.hypot(b.x - a.x, b.y - a.y);
	const step = Math.PI / 12;
	const angle = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / step) * step;
	return clampPoint({
		x: (a.x + Math.cos(angle) * len) / BOARD_WIDTH,
		y: (a.y + Math.sin(angle) * len) / BOARD_HEIGHT,
	});
}

/** A zone from an anchor corner to the pointer; Shift makes it square (in metres). */
function zoneRect(anchor: Point, to: Point, square: boolean) {
	let [x2, y2] = to;
	if (square) {
		const w = Math.abs(x2 - anchor[0]) * BOARD_WIDTH;
		const h = Math.abs(y2 - anchor[1]) * BOARD_HEIGHT;
		const side = Math.max(w, h);
		x2 = clamp01(
			anchor[0] + (Math.sign(x2 - anchor[0]) || 1) * (side / BOARD_WIDTH),
		);
		y2 = clamp01(
			anchor[1] + (Math.sign(y2 - anchor[1]) || 1) * (side / BOARD_HEIGHT),
		);
	}
	return {
		x: Math.min(anchor[0], x2),
		y: Math.min(anchor[1], y2),
		w: Math.abs(x2 - anchor[0]),
		h: Math.abs(y2 - anchor[1]),
	};
}

const OPPOSITE_CORNER: Record<string, (z: ZoneDrawing) => Point> = {
	nw: (z) => [z.x + z.w, z.y + z.h],
	ne: (z) => [z.x, z.y + z.h],
	sw: (z) => [z.x + z.w, z.y],
	se: (z) => [z.x, z.y],
};

export default function Board() {
	const { state, dispatch, boardRef, focusInspector } = useEditor();
	const { board, selection, tool, toolStyles } = state;
	const interaction = useRef<Interaction | null>(null);
	const [marquee, setMarquee] = useState<{ a: Pos; b: Pos } | null>(null);
	const [editingText, setEditingText] = useState<string | null>(null);
	const selected = new Set(selection);
	const drawingIds = new Set(board.drawings.map((d) => d.id));

	// Escape cancels whatever the pointer is doing and puts things back.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || !interaction.current) return;
			const current = interaction.current;
			interaction.current = null;
			if (
				current.kind !== "marquee" &&
				!(current.kind === "drag" && !current.started)
			) {
				dispatch({ type: "cancelGesture" });
			}
			setMarquee(null);
			e.stopImmediatePropagation();
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [dispatch]);

	// Leaving the text tool (or selecting something else) closes the text editor.
	useEffect(() => {
		if (editingText && !board.drawings.some((d) => d.id === editingText))
			setEditingText(null);
	}, [board.drawings, editingText]);

	const toBoard = (e: { clientX: number; clientY: number }) =>
		boardRef.current
			? clientToBoard(boardRef.current, e.clientX, e.clientY)
			: null;

	const itemAt = (clientX: number, clientY: number) =>
		document
			.elementFromPoint(clientX, clientY)
			?.closest<SVGGElement>("[data-item-id]")?.dataset.itemId ?? null;

	const startEditingText = (id: string) => {
		dispatch({ type: "beginGesture" });
		dispatch({ type: "select", ids: [id] });
		setEditingText(id);
	};

	const erase = (clientX: number, clientY: number, erased: Set<string>) => {
		const id = itemAt(clientX, clientY);
		if (id && drawingIds.has(id) && !erased.has(id)) {
			erased.add(id);
			dispatch({ type: "deleteItems", ids: [id] });
		}
	};

	const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
		if (e.button !== 0 || interaction.current) return;
		const point = toBoard(e);
		if (!point) return;

		// Finish any text edit first so it is recorded as its own undo step.
		blurActiveField();
		e.preventDefault();

		const target = e.target as Element;
		const startClient = { x: e.clientX, y: e.clientY };
		const pointerId = e.pointerId;
		const capture = () => e.currentTarget.setPointerCapture(pointerId);

		// Edit handles on a selected line or zone take priority over every tool but the eraser.
		const handleEl = target.closest<SVGElement>("[data-handle]");
		if (handleEl && tool !== "eraser") {
			const id = handleEl.dataset.itemId!;
			const original = board.drawings.find((d) => d.id === id);
			if (original) {
				capture();
				dispatch({ type: "beginGesture" });
				interaction.current = {
					kind: "handle",
					pointerId,
					startClient,
					id,
					handle: handleEl.dataset.handle as HandleId,
					original,
				};
				return;
			}
		}

		const hitId =
			target.closest<SVGGElement>("[data-item-id]")?.dataset.itemId ?? null;

		if (PLACE_TOOLS.has(tool)) {
			if (isOnBoard(point))
				dispatch({
					type: "place",
					tool: tool as PlaceTool,
					x: point.x,
					y: point.y,
				});
			return;
		}

		if (isLineTool(tool)) {
			// Starting on a marker anchors the line to its centre.
			const node = hitId ? board.nodes.find((n) => n.id === hitId) : undefined;
			const from: Point = node ? [node.x, node.y] : clampPoint(point);
			const drawing = createLine(tool, from, from, toolStyles.line);
			capture();
			dispatch({ type: "beginGesture" });
			dispatch({ type: "addDrawing", drawing });
			interaction.current = {
				kind: "line",
				pointerId,
				startClient,
				id: drawing.id,
				from,
			};
			return;
		}

		if (tool === "zone") {
			const anchor = clampPoint(point);
			const drawing = createZone(anchor[0], anchor[1], 0, 0, toolStyles.zone);
			capture();
			dispatch({ type: "beginGesture" });
			dispatch({ type: "addDrawing", drawing });
			interaction.current = {
				kind: "zone",
				pointerId,
				startClient,
				id: drawing.id,
				anchor,
			};
			return;
		}

		if (tool === "pen") {
			const first = clampPoint(point);
			const drawing = createPen([first], toolStyles.pen);
			capture();
			dispatch({ type: "beginGesture" });
			dispatch({ type: "clearSelection" });
			dispatch({ type: "addDrawing", drawing, select: false });
			interaction.current = {
				kind: "pen",
				pointerId,
				startClient,
				id: drawing.id,
				points: [first],
			};
			return;
		}

		if (tool === "text") {
			const existing = hitId
				? board.drawings.find((d) => d.id === hitId && d.kind === "text")
				: undefined;
			if (existing) {
				startEditingText(existing.id);
				return;
			}
			if (!isOnBoard(point)) return;
			const drawing = createText(point.x, point.y, "", toolStyles.text);
			dispatch({ type: "beginGesture" });
			dispatch({ type: "addDrawing", drawing });
			setEditingText(drawing.id);
			return;
		}

		if (tool === "eraser") {
			capture();
			dispatch({ type: "beginGesture" });
			const erased = new Set<string>();
			erase(e.clientX, e.clientY, erased);
			interaction.current = { kind: "erase", pointerId, startClient, erased };
			return;
		}

		// Select tool.
		capture();
		if (hitId) {
			const additive = e.shiftKey || e.ctrlKey || e.metaKey;
			const isSelected = selected.has(hitId);
			let ids: string[];
			if (additive) {
				dispatch({ type: "select", ids: [hitId], mode: "toggle" });
				if (isSelected) return; // Shift-clicking a selected item only deselects it.
				ids = [...selection, hitId];
			} else {
				ids = isSelected ? selection : [hitId];
				if (!isSelected) dispatch({ type: "select", ids: [hitId] });
			}
			interaction.current = {
				kind: "drag",
				pointerId,
				startClient,
				ids,
				start: point,
				started: false,
			};
			return;
		}

		interaction.current = {
			kind: "marquee",
			pointerId,
			startClient,
			start: point,
			additive: e.shiftKey || e.ctrlKey || e.metaKey,
		};
	};

	const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
		const current = interaction.current;
		if (!current || current.pointerId !== e.pointerId) return;
		const point = toBoard(e);
		if (!point) return;
		const moved = Math.hypot(
			e.clientX - current.startClient.x,
			e.clientY - current.startClient.y,
		);

		switch (current.kind) {
			case "drag": {
				if (!current.started) {
					if (moved < DRAG_THRESHOLD) return;
					current.started = true;
					dispatch({ type: "beginGesture" });
				}
				dispatch({
					type: "dragItems",
					ids: current.ids,
					dx: point.x - current.start.x,
					dy: point.y - current.start.y,
				});
				return;
			}
			case "marquee":
				if (moved >= DRAG_THRESHOLD) setMarquee({ a: current.start, b: point });
				return;
			case "line": {
				const to = e.shiftKey
					? snapAngle(current.from, clampPoint(point))
					: clampPoint(point);
				dispatch({ type: "updateDrawing", id: current.id, changes: { to } });
				return;
			}
			case "zone":
				dispatch({
					type: "updateDrawing",
					id: current.id,
					changes: zoneRect(current.anchor, clampPoint(point), e.shiftKey),
				});
				return;
			case "pen": {
				const next = clampPoint(point);
				const last = toUnits(current.points[current.points.length - 1]);
				const here = toUnits(next);
				if (Math.hypot(here.x - last.x, here.y - last.y) < 1.5) return;
				current.points = [...current.points, next];
				dispatch({
					type: "updateDrawing",
					id: current.id,
					changes: { points: current.points },
				});
				return;
			}
			case "handle": {
				const p = clampPoint(point);
				const d = current.original;
				if (d.kind === "line") {
					if (current.handle === "from" || current.handle === "to") {
						const fixed = current.handle === "from" ? d.to : d.from;
						const value = e.shiftKey ? snapAngle(fixed, p) : p;
						dispatch({
							type: "updateDrawing",
							id: d.id,
							changes: { [current.handle]: value },
						});
					} else {
						// Dragging the middle bends the line; dragging it back onto the
						// straight line straightens it again.
						const mid = toUnits(p);
						const straight = lineMidpoint({ ...d, control: undefined });
						const control =
							Math.hypot(mid.x - straight.x, mid.y - straight.y) < 6
								? undefined
								: clampPoint(
										toPosFromPoint(controlFromMidpoint(d.from, d.to, mid)),
								  );
						dispatch({
							type: "updateDrawing",
							id: d.id,
							changes: { control } as Partial<LineDrawing>,
						});
					}
				} else if (d.kind === "zone") {
					const anchor = OPPOSITE_CORNER[current.handle](d);
					dispatch({
						type: "updateDrawing",
						id: d.id,
						changes: zoneRect(anchor, p, e.shiftKey),
					});
				}
				return;
			}
			case "erase":
				erase(e.clientX, e.clientY, current.erased);
				return;
		}
	};

	const finish = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
		const current = interaction.current;
		if (!current || current.pointerId !== e.pointerId) return;
		interaction.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId);
		const end = cancelled ? "cancelGesture" : "endGesture";

		switch (current.kind) {
			case "drag":
				if (current.started) dispatch({ type: end });
				return;
			case "line": {
				const d = board.drawings.find((x) => x.id === current.id) as
					| LineDrawing
					| undefined;
				const a = toUnits(current.from);
				const b = d ? toUnits(d.to) : a;
				dispatch({
					type:
						!d || Math.hypot(b.x - a.x, b.y - a.y) < MIN_SHAPE
							? "cancelGesture"
							: end,
				});
				return;
			}
			case "zone": {
				const d = board.drawings.find((x) => x.id === current.id) as
					| ZoneDrawing
					| undefined;
				const tooSmall =
					!d || d.w * BOARD_WIDTH < MIN_SHAPE || d.h * BOARD_HEIGHT < MIN_SHAPE;
				dispatch({ type: tooSmall ? "cancelGesture" : end });
				return;
			}
			case "pen":
				if (!cancelled) {
					dispatch({
						type: "updateDrawing",
						id: current.id,
						changes: { points: simplify(current.points) },
					});
				}
				dispatch({ type: end });
				return;
			case "handle":
			case "erase":
				dispatch({ type: end });
				return;
			case "marquee": {
				const box = marquee;
				setMarquee(null);
				if (cancelled) return;
				if (!box) {
					if (!current.additive) dispatch({ type: "clearSelection" });
					return;
				}
				const [x1, x2] = [
					Math.min(box.a.x, box.b.x),
					Math.max(box.a.x, box.b.x),
				];
				const [y1, y2] = [
					Math.min(box.a.y, box.b.y),
					Math.max(box.a.y, box.b.y),
				];
				const inside = ([x, y]: Point) =>
					x >= x1 && x <= x2 && y >= y1 && y <= y2;
				const ids = [
					...board.drawings
						.filter((d) => drawingPoints(d).every(inside))
						.map((d) => d.id),
					...board.nodes.filter((n) => inside([n.x, n.y])).map((n) => n.id),
				];
				dispatch({
					type: "select",
					ids,
					mode: current.additive ? "add" : "replace",
				});
				return;
			}
		}
	};

	const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
		if (tool !== "select") return;
		// Pointer capture retargets the click to the <svg>, so look up what is under the pointer.
		const id = itemAt(e.clientX, e.clientY);
		if (!id) return;
		const drawing = board.drawings.find((d) => d.id === id);
		if (drawing?.kind === "text") {
			startEditingText(drawing.id);
			return;
		}
		if (board.nodes.some((n) => n.id === id && n.kind === "player")) {
			dispatch({ type: "select", ids: [id] });
			focusInspector();
		}
	};

	const finishTextEdit = () => {
		const id = editingText;
		setEditingText(null);
		if (!id) return;
		const d = board.drawings.find((x) => x.id === id) as
			| TextDrawing
			| undefined;
		if (d && d.text.trim() === "") dispatch({ type: "deleteItems", ids: [id] });
		dispatch({ type: "endGesture" });
	};

	const marqueeRect = marquee && {
		x: Math.min(marquee.a.x, marquee.b.x) * BOARD_WIDTH,
		y: Math.min(marquee.a.y, marquee.b.y) * BOARD_HEIGHT,
		width: Math.abs(marquee.a.x - marquee.b.x) * BOARD_WIDTH,
		height: Math.abs(marquee.a.y - marquee.b.y) * BOARD_HEIGHT,
	};

	const underMarkers = board.drawings.filter((d) => d.kind !== "text");
	const overMarkers = board.drawings.filter((d) => d.kind === "text");
	const editingDrawing = editingText
		? (board.drawings.find((d) => d.id === editingText) as
				| TextDrawing
				| undefined)
		: undefined;
	const mode =
		tool === "select"
			? "select"
			: tool === "eraser"
			  ? "erase"
			  : PLACE_TOOLS.has(tool)
			    ? "place"
			    : "draw";

	return (
		<section className={`board board--${mode}`} aria-label="Board">
			<svg
				ref={boardRef}
				className="board__svg"
				viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
				role="application"
				aria-label={`Pitch with ${board.nodes.length} markers and ${board.drawings.length} drawings`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={(e) => finish(e, false)}
				onPointerCancel={(e) => finish(e, true)}
				onDoubleClick={onDoubleClick}
			>
				<Pitch />
				<g className="board__drawings">
					{underMarkers.map((d) => (
						<DrawingShape key={d.id} drawing={d} />
					))}
				</g>
				<g className="board__nodes">
					{board.nodes.map((node) => (
						<NodeMarker
							key={node.id}
							node={node}
							selected={selected.has(node.id)}
							board={board}
						/>
					))}
				</g>
				<g className="board__drawings">
					{overMarkers.map((d) => (
						<DrawingShape
							key={d.id}
							drawing={d}
							editing={d.id === editingText}
						/>
					))}
				</g>
				{!editingText && (
					<SelectionOverlay drawings={selectedDrawings(state)} />
				)}
				{marqueeRect && <rect className="board__marquee" {...marqueeRect} />}
			</svg>
			{editingDrawing && (
				<TextEditor
					drawing={editingDrawing}
					onChange={(text) =>
						dispatch({
							type: "updateDrawing",
							id: editingDrawing.id,
							changes: { text },
						})
					}
					onDone={finishTextEdit}
				/>
			)}
			{board.nodes.length === 0 && board.drawings.length === 0 && (
				<p className="board__hint">
					Pick a tool on the left and click the pitch, or drag it on.
				</p>
			)}
		</section>
	);
}

function toPosFromPoint(p: Point): Pos {
	return { x: p[0], y: p[1] };
}
