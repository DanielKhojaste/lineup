import { CONE_COLORS } from "../../model/board";
import { BoardNode, ConeNode, PlayerNode, TeamId } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { NodePatch, selectedNodes } from "../../state/editor";
import { describeNode } from "../board/Markers";
import { Icon } from "../Icon";
import { BoardInput, ColorField, Section } from "../ui/fields";

const TEAMS: TeamId[] = ["home", "away", "neutral"];

function SelectionActions({ ids }: { ids: string[] }) {
	const { dispatch } = useEditor();
	const actions = [
		{
			label: "Duplicate",
			shortcut: "Ctrl+D",
			icon: "duplicate" as const,
			run: () => dispatch({ type: "duplicateNodes", ids }),
		},
		{
			label: "Bring to front",
			shortcut: "]",
			icon: "front" as const,
			run: () => dispatch({ type: "reorderNodes", ids, to: "front" }),
		},
		{
			label: "Send to back",
			shortcut: "[",
			icon: "back" as const,
			run: () => dispatch({ type: "reorderNodes", ids, to: "back" }),
		},
		{
			label: "Delete",
			shortcut: "Del",
			icon: "trash" as const,
			run: () => dispatch({ type: "deleteNodes", ids }),
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

function ConeFields({ cones }: { cones: ConeNode[] }) {
	const { dispatch } = useEditor();
	const ids = cones.map((c) => c.id);
	const current = cones.every((c) => c.color === cones[0].color)
		? cones[0].color
		: null;
	return (
		<div className="field">
			<span className="field__label" id="cone-color-label">
				Cone colour
			</span>
			<div
				className="swatches"
				role="radiogroup"
				aria-labelledby="cone-color-label"
			>
				{CONE_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						role="radio"
						aria-checked={current === color}
						aria-label={color}
						className={`swatch${current === color ? " is-active" : ""}`}
						style={{ background: color }}
						onClick={() =>
							dispatch({ type: "updateNodes", ids, patch: { color } })
						}
					/>
				))}
			</div>
		</div>
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

function ObjectList() {
	const { state, dispatch } = useEditor();
	const selected = new Set(state.selection);
	const nodes = [...state.board.nodes].reverse();
	if (nodes.length === 0) return null;

	return (
		<Section
			title="Objects"
			aside={<span className="muted">{nodes.length}</span>}
		>
			<ul className="object-list">
				{nodes.map((node: BoardNode) => (
					<li key={node.id}>
						<button
							type="button"
							className={`object-list__item${
								selected.has(node.id) ? " is-selected" : ""
							}`}
							aria-pressed={selected.has(node.id)}
							onClick={(e) =>
								dispatch({
									type: "select",
									ids: [node.id],
									mode:
										e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace",
								})
							}
						>
							{describeNode(node, state.board)}
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
	const players = nodes.filter((n): n is PlayerNode => n.kind === "player");
	const cones = nodes.filter((n): n is ConeNode => n.kind === "cone");

	if (nodes.length === 0) {
		return (
			<div className="panel-body">
				<p className="panel-hint">
					Select a marker to edit it. Shift-click or drag a box to select
					several.
				</p>
				<BoardSettings />
				<ObjectList />
			</div>
		);
	}

	const title =
		nodes.length === 1
			? describeNode(nodes[0], state.board)
			: `${nodes.length} selected`;
	const single = nodes.length === 1 ? nodes[0] : null;

	return (
		<div className="panel-body">
			<Section
				title={title}
				aside={
					single && (
						<span className="mono muted">
							x {single.x.toFixed(2)} · y {single.y.toFixed(2)}
						</span>
					)
				}
			>
				{players.length > 0 && <PlayerFields players={players} />}
				{cones.length > 0 && <ConeFields cones={cones} />}
				<SelectionActions ids={nodes.map((n) => n.id)} />
			</Section>
			<ObjectList />
		</div>
	);
}
