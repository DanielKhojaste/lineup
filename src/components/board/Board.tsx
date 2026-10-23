import {
	PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../../model/pitch";
import { useEditor } from "../../state/EditorContext";
import { clientToBoard, isOnBoard } from "./coords";
import NodeMarker from "./Markers";
import Pitch from "./Pitch";

/** Screen pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 3;

type Point = { x: number; y: number };

type Interaction =
	| {
			kind: "drag";
			pointerId: number;
			ids: string[];
			start: Point;
			startClient: Point;
			started: boolean;
	  }
	| {
			kind: "marquee";
			pointerId: number;
			start: Point;
			startClient: Point;
			additive: boolean;
	  };

function blurActiveField() {
	const active = document.activeElement;
	if (active instanceof HTMLElement && active !== document.body) active.blur();
}

export default function Board() {
	const { state, dispatch, boardRef, focusInspector } = useEditor();
	const { board, selection, tool } = state;
	const interaction = useRef<Interaction | null>(null);
	const [marquee, setMarquee] = useState<{ a: Point; b: Point } | null>(null);
	const selected = new Set(selection);

	// Escape cancels a drag in progress and puts the markers back.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" || !interaction.current) return;
			if (interaction.current.kind === "drag" && interaction.current.started) {
				dispatch({ type: "cancelGesture" });
			}
			interaction.current = null;
			setMarquee(null);
			e.stopImmediatePropagation();
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [dispatch]);

	const toBoard = (e: ReactPointerEvent) =>
		boardRef.current
			? clientToBoard(boardRef.current, e.clientX, e.clientY)
			: null;

	const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
		if (e.button !== 0 || interaction.current) return;
		const point = toBoard(e);
		if (!point) return;

		// Finish any text edit first so it is recorded as its own undo step.
		blurActiveField();
		e.preventDefault();

		if (tool !== "select") {
			if (isOnBoard(point))
				dispatch({ type: "place", tool, x: point.x, y: point.y });
			return;
		}

		const nodeEl = (e.target as Element).closest<SVGGElement>("[data-node-id]");
		const startClient = { x: e.clientX, y: e.clientY };
		e.currentTarget.setPointerCapture(e.pointerId);

		if (nodeEl) {
			const id = nodeEl.dataset.nodeId!;
			const additive = e.shiftKey || e.ctrlKey || e.metaKey;
			const isSelected = selected.has(id);
			let ids: string[];

			if (additive) {
				dispatch({ type: "select", ids: [id], mode: "toggle" });
				if (isSelected) return; // Shift-clicking a selected marker only deselects it.
				ids = [...selection, id];
			} else {
				ids = isSelected ? selection : [id];
				if (!isSelected) dispatch({ type: "select", ids: [id] });
			}

			interaction.current = {
				kind: "drag",
				pointerId: e.pointerId,
				ids,
				start: point,
				startClient,
				started: false,
			};
			return;
		}

		interaction.current = {
			kind: "marquee",
			pointerId: e.pointerId,
			start: point,
			startClient,
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

		if (current.kind === "drag") {
			if (!current.started) {
				if (moved < DRAG_THRESHOLD) return;
				current.started = true;
				dispatch({ type: "beginGesture" });
			}
			dispatch({
				type: "dragNodes",
				ids: current.ids,
				dx: point.x - current.start.x,
				dy: point.y - current.start.y,
			});
			return;
		}

		if (moved >= DRAG_THRESHOLD) setMarquee({ a: current.start, b: point });
	};

	const finish = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
		const current = interaction.current;
		if (!current || current.pointerId !== e.pointerId) return;
		interaction.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId))
			e.currentTarget.releasePointerCapture(e.pointerId);

		if (current.kind === "drag") {
			if (current.started)
				dispatch({ type: cancelled ? "cancelGesture" : "endGesture" });
			return;
		}

		const box = marquee;
		setMarquee(null);
		if (cancelled) return;
		if (!box) {
			if (!current.additive) dispatch({ type: "clearSelection" });
			return;
		}

		const [x1, x2] = [Math.min(box.a.x, box.b.x), Math.max(box.a.x, box.b.x)];
		const [y1, y2] = [Math.min(box.a.y, box.b.y), Math.max(box.a.y, box.b.y)];
		const ids = board.nodes
			.filter((n) => n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2)
			.map((n) => n.id);
		dispatch({
			type: "select",
			ids,
			mode: current.additive ? "add" : "replace",
		});
	};

	const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
		if (tool !== "select") return;
		// Pointer capture retargets the click to the <svg>, so look up what is under the pointer.
		const nodeEl = document
			.elementFromPoint(e.clientX, e.clientY)
			?.closest<SVGGElement>("[data-node-id]");
		if (!nodeEl) return;
		dispatch({ type: "select", ids: [nodeEl.dataset.nodeId!] });
		focusInspector();
	};

	const marqueeRect = marquee && {
		x: Math.min(marquee.a.x, marquee.b.x) * BOARD_WIDTH,
		y: Math.min(marquee.a.y, marquee.b.y) * BOARD_HEIGHT,
		width: Math.abs(marquee.a.x - marquee.b.x) * BOARD_WIDTH,
		height: Math.abs(marquee.a.y - marquee.b.y) * BOARD_HEIGHT,
	};

	return (
		<section
			className={`board board--${tool === "select" ? "select" : "place"}`}
			aria-label="Board"
		>
			<svg
				ref={boardRef}
				className="board__svg"
				viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
				role="application"
				aria-label={`Pitch with ${board.nodes.length} ${
					board.nodes.length === 1 ? "marker" : "markers"
				}`}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={(e) => finish(e, false)}
				onPointerCancel={(e) => finish(e, true)}
				onDoubleClick={onDoubleClick}
			>
				<Pitch />
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
				{marqueeRect && <rect className="board__marquee" {...marqueeRect} />}
			</svg>
			{board.nodes.length === 0 && (
				<p className="board__hint">
					Pick a player or piece of equipment in the tool rail, then click the
					pitch. You can also drag it straight on.
				</p>
			)}
		</section>
	);
}
