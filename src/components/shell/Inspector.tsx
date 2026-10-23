import { CONE_COLORS } from "../../model/board";
import {
	BoardItem,
	BoardNode,
	GoalNode,
	MannequinNode,
	PlayerNode,
	PoleNode,
	TeamId,
} from "../../model/types";
import { isDrawing } from "../../model/drawings";
import { useEditor } from "../../state/EditorContext";
import { NodePatch, selectedDrawings, selectedNodes } from "../../state/editor";
import { describeNode } from "../board/Markers";
import { Icon } from "../Icon";
import { common, Segmented, Swatches } from "../ui/controls";
import { BoardInput, ColorField, Section } from "../ui/fields";
import { describeDrawing, DrawingFields, ToolOptions } from "./DrawingFields";

const TEAMS: TeamId[] = ["home", "away", "neutral"];

function SelectionActions({ ids }: { ids: string[] }) {
	const { dispatch } = useEditor();
	const actions = [
		{
			label: "Duplicate",
			shortcut: "Ctrl+D",
			icon: "duplicate" as const,
			run: () => dispatch({ type: "duplicateItems", ids }),
		},
		{
			label: "Bring to front",
			shortcut: "]",
			icon: "front" as const,
			run: () => dispatch({ type: "reorderItems", ids, to: "front" }),
		},
		{
			label: "Send to back",
			shortcut: "[",
			icon: "back" as const,
			run: () => dispatch({ type: "reorderItems", ids, to: "back" }),
		},
		{
			label: "Delete",
			shortcut: "Del",
			icon: "trash" as const,
			run: () => dispatch({ type: "deleteItems", ids }),
		},
	];
	return (
		<div className="action-row">
			{actions.map((a) => (
				<button
					key={a.label}
					type="button"
					className={`icon-button${
						a.icon === "trash" ? " icon-button--danger" : ""
					}`}
					aria-label={`${a.label} (${a.shortcut})`}
					title={`${a.label} (${a.shortcut})`}
					onClick={a.run}
				>
					<Icon name={a.icon} size={18} />
				</button>
			))}
		</div>
	);
}

function PlayerFields({ players }: { players: PlayerNode[] }) {
	const { state, dispatch, inspectorFocusRef } = useEditor();
	const ids = players.map((p) => p.id);
	const single = players.length === 1 ? players[0] : null;
	const update = (patch: NodePatch) =>
		dispatch({ type: "updateNodes", ids, patch });
	const teams = state.board.teams;
	const sameTeam = players.every((p) => p.team === players[0].team)
		? players[0].team
		: null;
	const allKeepers = players.every((p) => p.keeper);

	return (
		<>
			{single && (
				<div className="field-grid">
					<BoardInput
						ref={inspectorFocusRef}
						label="Number"
						inputMode="numeric"
						maxLength={3}
						value={single.number !== undefined ? String(single.number) : ""}
						onValue={(v) => {
							const digits = v.replace(/\D/g, "");
							update({ number: digits === "" ? undefined : Number(digits) });
						}}
					/>
					<BoardInput
						label="Position"
						placeholder="e.g. RW"
						maxLength={6}
						value={single.label ?? ""}
						onValue={(v) => update({ label: v || undefined })}
					/>
				</div>
			)}
			{single && (
				<BoardInput
					label="Name"
					placeholder="Player name"
					maxLength={40}
					value={single.name ?? ""}
					onValue={(v) => update({ name: v || undefined })}
				/>
			)}
			<div className="field">
				<span className="field__label" id="team-label">
					Team
				</span>
				<div
					className="segmented"
					role="radiogroup"
					aria-labelledby="team-label"
				>
					{TEAMS.map((team) => (
						<button
							key={team}
							type="button"
							role="radio"
							aria-checked={sameTeam === team}
							className={`segmented__item${
								sameTeam === team ? " is-active" : ""
							}`}
							onClick={() => update({ team })}
						>
							<span className="dot" style={{ background: teams[team].color }} />
							{teams[team].name}
						</button>
					))}
				</div>
			</div>
			<label className="check">
				<input
					type="checkbox"
					checked={allKeepers}
					onChange={(e) => update({ keeper: e.target.checked })}
				/>
				Goalkeeper
			</label>
		</>
	);
}

const EQUIPMENT_COLORS = CONE_COLORS;

/** Colour, size and rotation for cones, goals, mannequins and poles. */
function EquipmentFields({ nodes }: { nodes: BoardNode[] }) {
	const { dispatch } = useEditor();
	const ids = nodes.map((n) => n.id);
	const coloured = nodes.filter(
		(n): n is Extract<BoardNode, { color: string }> =>
			n.kind === "cone" || n.kind === "mannequin" || n.kind === "pole",
	);
	const goals = nodes.filter((n): n is GoalNode => n.kind === "goal");
	const rotatable = nodes.filter(
		(n): n is GoalNode | MannequinNode =>
			n.kind === "goal" || n.kind === "mannequin",
	);

	return (
		<>
			{coloured.length > 0 && (
				<Swatches
					label="Colour"
					value={common(coloured, (n) => n.color)}
					colors={EQUIPMENT_COLORS}
					onChange={(color) =>
						dispatch({
							type: "updateNodes",
							ids: coloured.map((n) => n.id),
							patch: { color },
						})
					}
				/>
			)}
			{goals.length > 0 && (
				<Segmented
					label="Goal size"
					value={common(goals, (g) => g.size)}
					options={[
						{ value: "full", label: "Full size" },
						{ value: "mini", label: "Mini" },
					]}
					onChange={(size) =>
						dispatch({
							type: "updateNodes",
							ids: goals.map((g) => g.id),
							patch: { size },
						})
					}
				/>
			)}
			{rotatable.length > 0 && (
				<div className="field">
					<span className="field__label">Facing</span>
					<div className="action-row action-row--plain">
						<button
							type="button"
							className="icon-button"
							aria-label="Rotate left 90°"
							title="Rotate left 90°"
							onClick={() => dispatch({ type: "rotateNodes", ids, by: -90 })}
						>
							<Icon
								name="rotate"
								size={18}
								style={{ transform: "scaleX(-1)" }}
							/>
						</button>
						<button
							type="button"
							className="icon-button"
							aria-label="Rotate right 90° (Shift+R)"
							title="Rotate right 90° (Shift+R)"
							onClick={() => dispatch({ type: "rotateNodes", ids, by: 90 })}
						>
							<Icon name="rotate" size={18} />
						</button>
						<span className="muted mono">
							{common(rotatable, (n) => n.rotation) ?? "–"}°
						</span>
					</div>
				</div>
			)}
		</>
	);
}

function BoardSettings() {
	const { state, dispatch } = useEditor();
	const { teams, display } = state.board;
	return (
		<>
			<Section title="Teams">
				{TEAMS.map((team) => (
					<div key={team} className="team-row">
						<BoardInput
							label={`${team[0].toUpperCase()}${team.slice(1)} team name`}
							hideLabel
							value={teams[team].name}
							maxLength={20}
							onValue={(name) =>
								dispatch({ type: "updateTeam", team, patch: { name } })
							}
						/>
						<ColorField
							label="Kit"
							value={teams[team].color}
							onValue={(color) =>
								dispatch({ type: "updateTeam", team, patch: { color } })
							}
						/>
						{team !== "neutral" && (
							<ColorField
								label="GK"
								value={teams[team].keeperColor}
								onValue={(keeperColor) =>
									dispatch({ type: "updateTeam", team, patch: { keeperColor } })
								}
							/>
						)}
					</div>
				))}
			</Section>
			<Section title="Display">
				<label className="check">
					<input
						type="checkbox"
						checked={display.showLabels}
						onChange={(e) =>
							dispatch({
								type: "updateDisplay",
								patch: { showLabels: e.target.checked },
							})
						}
					/>
					Show positions and names
				</label>
			</Section>
		</>
	);
}

function describeItem(
	item: BoardItem,
	board: Parameters<typeof describeNode>[1],
): string {
	return isDrawing(item) ? describeDrawing(item) : describeNode(item, board);
}

function ObjectList() {
	const { state, dispatch } = useEditor();
	const selected = new Set(state.selection);
	// Top-most first: text, then markers, then other drawings.
	const items: BoardItem[] = [
		...state.board.drawings.filter((d) => d.kind === "text").reverse(),
		...[...state.board.nodes].reverse(),
		...state.board.drawings.filter((d) => d.kind !== "text").reverse(),
	];
	if (items.length === 0) return null;

	return (
		<Section
			title="Objects"
			aside={<span className="muted">{items.length}</span>}
		>
			<ul className="object-list">
				{items.map((item) => (
					<li key={item.id}>
						<button
							type="button"
							className={`object-list__item${
								selected.has(item.id) ? " is-selected" : ""
							}`}
							aria-pressed={selected.has(item.id)}
							onClick={(e) =>
								dispatch({
									type: "select",
									ids: [item.id],
									mode:
										e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace",
								})
							}
						>
							{describeItem(item, state.board)}
						</button>
					</li>
				))}
			</ul>
		</Section>
	);
}

export default function Inspector() {
	const { state } = useEditor();
	const nodes = selectedNodes(state);
	const drawings = selectedDrawings(state);
	const players = nodes.filter((n): n is PlayerNode => n.kind === "player");
	const equipment = nodes.filter(
		(n) => n.kind !== "player" && n.kind !== "ball",
	);
	const count = nodes.length + drawings.length;
	const drawTool = ![
		"select",
		"home",
		"away",
		"neutral",
		"keeper",
		"cone",
		"ball",
		"goal",
		"mannequin",
		"pole",
	].includes(state.tool);

	if (count === 0) {
		if (drawTool) {
			return (
				<div className="panel-body">
					<Section title="Tool options">
						<ToolOptions tool={state.tool} />
					</Section>
				</div>
			);
		}
		return (
			<div className="panel-body">
				<p className="panel-hint">
					Select something to edit it. Shift-click or drag a box to select
					several.
				</p>
				<BoardSettings />
				<ObjectList />
			</div>
		);
	}

	const first = nodes[0] ?? drawings[0];
	const title =
		count === 1 ? describeItem(first, state.board) : `${count} selected`;
	const singleNode = count === 1 && nodes.length === 1 ? nodes[0] : null;

	return (
		<div className="panel-body">
			<Section
				title={title}
				aside={
					singleNode && (
						<span className="mono muted">
							x {singleNode.x.toFixed(2)} · y {singleNode.y.toFixed(2)}
						</span>
					)
				}
			>
				{players.length > 0 && <PlayerFields players={players} />}
				{equipment.length > 0 && <EquipmentFields nodes={equipment} />}
				{drawings.length > 0 && <DrawingFields drawings={drawings} />}
				<SelectionActions
					ids={[...nodes, ...drawings].map((item) => item.id)}
				/>
			</Section>
			<ObjectList />
		</div>
	);
}
