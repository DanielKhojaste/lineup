import { useState } from "react";
import { ROTATE_STEP } from "../../model/board";
import { LINE_TOOLS, LineTool } from "../../model/drawings";
import { SPORT_INFO } from "../../model/sports";
import { BoardNode, Drawing, Point, TeamId } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { allItems, PlaceTool } from "../../state/editor";
import {
	copySelection,
	cutSelection,
	paste,
	useCopiedItems,
} from "../../state/itemClipboard";
import { usePlayback } from "../../state/PlaybackContext";
import { ConfirmDialog } from "../ui/Dialog";
import { ContextMenuEntry } from "../ui/ContextMenu";

const TEAMS: TeamId[] = ["home", "away", "neutral"];

const LINE_STYLES: { tool: LineTool; label: string }[] = [
	{ tool: "run", label: "Run (solid)" },
	{ tool: "pass", label: "Pass (dashed)" },
	{ tool: "dribble", label: "Dribble (wavy)" },
	{ tool: "line", label: "Plain line" },
];

const EQUIPMENT: { tool: PlaceTool; label: string }[] = [
	{ tool: "cone", label: "Cone" },
	{ tool: "ball", label: "Ball" },
	{ tool: "goal", label: "Goal" },
	{ tool: "mannequin", label: "Mannequin" },
	{ tool: "pole", label: "Pole" },
];

/**
 * The editor's right-click menus: one for markers and drawings (acting on the
 * selection) and one for an empty spot on the board. Also returns the
 * confirmation dialog for "Clear board".
 */
export function useBoardMenus({
	editText,
}: {
	/** Start editing a text drawing on the board (only the board itself can). */
	editText?: (id: string) => void;
} = {}) {
	const { state, dispatch, focusInspector, setFieldDialogOpen } = useEditor();
	const playback = usePlayback();
	const copied = useCopiedItems();
	const [clearing, setClearing] = useState(false);
	const { board, selection, step } = state;
	const hasCopy = !!copied && copied.nodes.length + copied.drawings.length > 0;
	const sport = SPORT_INFO[board.pitch.sport];

	/** Menu for the selected items (right-clicking one selects it first). */
	const itemMenu = (ids: string[]): ContextMenuEntry[] => {
		const targets = new Set(ids);
		const nodes = board.nodes.filter((n) => targets.has(n.id));
		const drawings = board.drawings.filter((d) => targets.has(d.id));
		const players = nodes.filter(
			(n): n is Extract<BoardNode, { kind: "player" }> => n.kind === "player",
		);
		const turnable = nodes.filter(
			(n) => n.kind === "goal" || n.kind === "mannequin",
		);
		const goals = nodes.filter(
			(n): n is Extract<BoardNode, { kind: "goal" }> => n.kind === "goal",
		);
		const lines = drawings.filter(
			(d): d is Extract<Drawing, { kind: "line" }> => d.kind === "line",
		);
		const single = ids.length === 1 ? allItems(board).find((i) => i.id === ids[0]) : null;
		const moving =
			step > 0 ? nodes.filter((n) => board.steps[step - 1]?.moves[n.id]) : [];
		const live = { ...state, selection: ids };

		const entries: ContextMenuEntry[] = [];
		if (single?.kind === "text" && editText)
			entries.push({ label: "Edit text", onSelect: () => editText(single.id) });
		if (single?.kind === "player")
			entries.push({ label: "Edit player", onSelect: focusInspector });
		entries.push(
			"separator",
			{
				label: "Cut",
				shortcut: "Ctrl+X",
				onSelect: () => cutSelection(live, dispatch),
			},
			{
				label: "Copy",
				shortcut: "Ctrl+C",
				onSelect: () => copySelection(live),
			},
			{
				label: "Paste",
				shortcut: "Ctrl+V",
				disabled: !hasCopy,
				onSelect: () => paste(dispatch),
			},
			{
				label: "Duplicate",
				shortcut: "Ctrl+D",
				onSelect: () => dispatch({ type: "duplicateItems", ids }),
			},
			"separator",
		);

		if (players.length > 0) {
			const playerIds = players.map((p) => p.id);
			entries.push(
				{
					label: "Team",
					submenu: TEAMS.map((team) => ({
						label: board.teams[team].name,
						checked: players.every((p) => p.team === team),
						onSelect: () =>
							dispatch({ type: "updateNodes", ids: playerIds, patch: { team } }),
					})),
				},
				{
					label: "Goalkeeper",
					checked: players.every((p) => p.keeper),
					onSelect: () =>
						dispatch({
							type: "updateNodes",
							ids: playerIds,
							patch: { keeper: !players.every((p) => p.keeper) },
						}),
				},
			);
			if (players.length === 1)
				entries.push({
					label: `Select all of ${board.teams[players[0].team].name}`,
					onSelect: () =>
						dispatch({
							type: "select",
							ids: board.nodes
								.filter((n) => n.kind === "player" && n.team === players[0].team)
								.map((n) => n.id),
						}),
				});
		}
		if (goals.length > 0)
			entries.push({
				label: "Goal size",
				submenu: (["full", "mini"] as const).map((size) => ({
					label: size === "full" ? "Full size" : "Mini",
					checked: goals.every((g) => g.size === size),
					onSelect: () =>
						dispatch({
							type: "updateNodes",
							ids: goals.map((g) => g.id),
							patch: { size },
						}),
				})),
			});
		if (turnable.length > 0) {
			const turnIds = turnable.map((n) => n.id);
			entries.push(
				{
					label: `Turn ${ROTATE_STEP}° right`,
					shortcut: "Shift+R",
					onSelect: () =>
						dispatch({ type: "rotateNodes", ids: turnIds, by: ROTATE_STEP }),
				},
				{
					label: `Turn ${ROTATE_STEP}° left`,
					shortcut: "Alt+Shift+R",
					onSelect: () =>
						dispatch({ type: "rotateNodes", ids: turnIds, by: -ROTATE_STEP }),
				},
			);
		}
		if (lines.length > 0) {
			const lineIds = lines.map((l) => l.id);
			entries.push({
				label: "Line style",
				submenu: LINE_STYLES.map(({ tool, label }) => ({
					label,
					checked: lines.every(
						(l) =>
							l.stroke === LINE_TOOLS[tool].stroke &&
							(l.heads === "none") === (LINE_TOOLS[tool].heads === "none"),
					),
					onSelect: () =>
						dispatch({
							type: "updateDrawings",
							ids: lineIds,
							patch: LINE_TOOLS[tool],
						}),
				})),
			});
			if (lines.some((l) => l.control))
				entries.push({
					label: "Straighten",
					onSelect: () =>
						dispatch({
							type: "updateDrawings",
							ids: lineIds,
							patch: { straighten: true },
						}),
				});
		}
		if (moving.length > 0)
			entries.push({
				label: moving.length === 1 ? "Remove run from this step" : "Remove runs from this step",
				onSelect: () => {
					for (const n of moving) dispatch({ type: "setMove", id: n.id, move: null });
				},
			});
		entries.push(
			"separator",
			{
				label: "Bring to front",
				shortcut: "]",
				onSelect: () => dispatch({ type: "reorderItems", ids, to: "front" }),
			},
			{
				label: "Send to back",
				shortcut: "[",
				onSelect: () => dispatch({ type: "reorderItems", ids, to: "back" }),
			},
			"separator",
			{
				label: ids.length > 1 ? `Delete ${ids.length} items` : "Delete",
				shortcut: "Delete",
				danger: true,
				onSelect: () => dispatch({ type: "deleteItems", ids }),
			},
		);
		return entries;
	};

	/** Menu for an empty spot on the board; `at` is where it was opened. */
	const boardMenu = (at: Point): ContextMenuEntry[] => {
		const empty = board.nodes.length === 0 && board.drawings.length === 0;
		const place = (tool: PlaceTool) =>
			dispatch({ type: "place", tool, x: at[0], y: at[1] });
		return [
			{
				label: "Paste here",
				shortcut: "Ctrl+V",
				disabled: !hasCopy,
				onSelect: () => paste(dispatch, at),
			},
			{
				label: "Add here",
				submenu: [
					...TEAMS.map((team) => ({
						label: `${board.teams[team].name} player`,
						onSelect: () => place(team),
					})),
					"separator" as const,
					...EQUIPMENT.filter((e) => e.tool !== "goal" || sport.goal).map(
						(e) => ({ label: e.label, onSelect: () => place(e.tool) }),
					),
				],
			},
			"separator",
			{
				label: "Select all",
				shortcut: "Ctrl+A",
				disabled: empty,
				onSelect: () => dispatch({ type: "selectAll" }),
			},
			{
				label: "Undo",
				shortcut: "Ctrl+Z",
				disabled: state.past.length === 0,
				onSelect: () => dispatch({ type: "undo" }),
			},
			{
				label: "Redo",
				shortcut: "Ctrl+Y",
				disabled: state.future.length === 0,
				onSelect: () => dispatch({ type: "redo" }),
			},
			"separator",
			{
				label: "Show names",
				checked: board.display.showLabels,
				onSelect: () =>
					dispatch({
						type: "updateDisplay",
						patch: { showLabels: !board.display.showLabels },
					}),
			},
			{
				label: "Change sport or field…",
				onSelect: () => setFieldDialogOpen(true),
			},
			{
				label: "Field",
				submenu: (["full", "half"] as const).map((variant) => ({
					label: variant === "full" ? `Full ${sport.surface}` : `Half ${sport.surface}`,
					checked: board.pitch.variant === variant,
					onSelect: () => dispatch({ type: "updatePitch", patch: { variant } }),
				})),
			},
			"separator",
			{
				label: "Clear board…",
				danger: true,
				disabled: empty,
				onSelect: () => {
					playback.stop();
					setClearing(true);
				},
			},
		];
	};

	const clearDialog = (
		<ConfirmDialog
			open={clearing}
			title="Clear board"
			message={`Remove every marker, drawing${
				board.steps.length ? " and animation step" : ""
			} from “${board.meta.title}”? Ctrl+Z brings them back.`}
			confirmLabel="Clear board"
			danger
			onConfirm={() => dispatch({ type: "clearBoard" })}
			onClose={() => setClearing(false)}
		/>
	);

	/** Right-click on an item outside the board (the sidebar): select it, then show its menu. */
	const openItemMenu = (
		e: React.MouseEvent,
		id: string,
		openMenu: (e: React.MouseEvent, entries: ContextMenuEntry[]) => void,
	) => {
		const ids = selection.includes(id) ? selection : [id];
		if (!selection.includes(id)) dispatch({ type: "select", ids });
		openMenu(e, itemMenu(ids));
	};

	return { itemMenu, boardMenu, clearDialog, openItemMenu };
}
