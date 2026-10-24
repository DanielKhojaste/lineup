import { PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { MANNEQUIN_COLOR, POLE_COLOR } from "../../model/board";
import { Board } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { PlaceTool, Tool } from "../../state/editor";
import { clientToBoard, isOnBoard } from "../board/coords";
import { Icon, IconName } from "../Icon";

interface ToolDef {
	tool: Tool;
	label: string;
	shortcut: string;
	icon: IconName;
	color?: (teams: Board["teams"]) => string;
}

export const SELECT_TOOLS: ToolDef[] = [
	{ tool: "select", label: "Select", shortcut: "V", icon: "select" },
];

export const PLACE_TOOLS: ToolDef[] = [
	{
		tool: "home",
		label: "Home player",
		shortcut: "1",
		icon: "player",
		color: (t) => t.home.color,
	},
	{
		tool: "away",
		label: "Away player",
		shortcut: "2",
		icon: "player",
		color: (t) => t.away.color,
	},
	{
		tool: "neutral",
		label: "Neutral player",
		shortcut: "3",
		icon: "player",
		color: (t) => t.neutral.color,
	},
	{
		tool: "cone",
		label: "Cone",
		shortcut: "C",
		icon: "cone",
		color: () => "#FF8A00",
	},
	{ tool: "ball", label: "Ball", shortcut: "B", icon: "ball" },
	{ tool: "goal", label: "Goal", shortcut: "G", icon: "goal" },
	{
		tool: "mannequin",
		label: "Mannequin",
		shortcut: "M",
		icon: "mannequin",
		color: () => MANNEQUIN_COLOR,
	},
	{
		tool: "pole",
		label: "Pole",
		shortcut: "O",
		icon: "pole",
		color: () => POLE_COLOR,
	},
];

export const DRAW_TOOLS: ToolDef[] = [
	{ tool: "run", label: "Run arrow", shortcut: "R", icon: "run" },
	{ tool: "pass", label: "Pass arrow", shortcut: "P", icon: "pass" },
	{ tool: "dribble", label: "Dribble arrow", shortcut: "D", icon: "dribble" },
	{ tool: "line", label: "Line", shortcut: "L", icon: "line" },
	{ tool: "zone", label: "Zone", shortcut: "Z", icon: "zone" },
	{ tool: "pen", label: "Pen", shortcut: "F", icon: "pen" },
	{ tool: "text", label: "Text", shortcut: "T", icon: "text" },
	{
		tool: "eraser",
		label: "Eraser (removes drawings)",
		shortcut: "E",
		icon: "eraser",
	},
];

const PLACEABLE = new Set(PLACE_TOOLS.map((t) => t.tool));
const DRAG_THRESHOLD = 5;

export default function ToolRail() {
	const { state, dispatch, boardRef } = useEditor();
	const teams = state.board.teams;
	const press = useRef<{
		tool: PlaceTool;
		x: number;
		y: number;
		dragging: boolean;
	} | null>(null);
	const [ghost, setGhost] = useState<{
		tool: ToolDef;
		x: number;
		y: number;
	} | null>(null);
	// Set when a press turned into a drag, so the click that follows is ignored.
	const dragged = useRef(false);

	const onPointerDown = (
		e: ReactPointerEvent<HTMLButtonElement>,
		def: ToolDef,
	) => {
		if (e.button !== 0 || !PLACEABLE.has(def.tool)) return;
		press.current = {
			tool: def.tool as PlaceTool,
			x: e.clientX,
			y: e.clientY,
			dragging: false,
		};
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (
		e: ReactPointerEvent<HTMLButtonElement>,
		def: ToolDef,
	) => {
		const p = press.current;
		if (!p) return;
		if (
			!p.dragging &&
			Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD
		)
			return;
		p.dragging = true;
		setGhost({ tool: def, x: e.clientX, y: e.clientY });
	};

	const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
		const p = press.current;
		press.current = null;
		setGhost(null);
		dragged.current = !!p?.dragging;
		if (!p?.dragging || !boardRef.current) return;

		const point = clientToBoard(boardRef.current, e.clientX, e.clientY);
		const target = document.elementFromPoint(e.clientX, e.clientY);
		if (isOnBoard(point) && target && boardRef.current.contains(target)) {
			dispatch({ type: "place", tool: p.tool, x: point.x, y: point.y });
			dispatch({ type: "setTool", tool: "select" });
		}
	};

	const renderTool = (def: ToolDef) => {
		const active = state.tool === def.tool;
		return (
			<button
				key={def.tool}
				type="button"
				className={`rail__tool${active ? " is-active" : ""}`}
				aria-label={`${def.label} (${def.shortcut})`}
				aria-pressed={active}
				title={`${def.label} (${def.shortcut})`}
				onClick={() => {
					// A drag already placed its marker (or was dropped off the board).
					if (dragged.current) {
						dragged.current = false;
						return;
					}
					dispatch({ type: "setTool", tool: def.tool });
				}}
				onPointerDown={(e) => onPointerDown(e, def)}
				onPointerMove={(e) => onPointerMove(e, def)}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					press.current = null;
					setGhost(null);
				}}
			>
				<Icon name={def.icon} fillColor={def.color?.(teams)} />
			</button>
		);
	};

	return (
		<nav className="rail" aria-label="Tools">
			<span className="rail__label">Select</span>
			<div className="rail__grid">{SELECT_TOOLS.map(renderTool)}</div>
			<span className="rail__label">Place</span>
			<div className="rail__grid">{PLACE_TOOLS.map(renderTool)}</div>
			<span className="rail__label">Draw</span>
			<div className="rail__grid">{DRAW_TOOLS.map(renderTool)}</div>
			{ghost && (
				<div
					className="rail__ghost"
					style={{ left: ghost.x, top: ghost.y }}
					aria-hidden="true"
				>
					<Icon
						name={ghost.tool.icon}
						size={34}
						fillColor={ghost.tool.color?.(teams)}
					/>
				</div>
			)}
		</nav>
	);
}
