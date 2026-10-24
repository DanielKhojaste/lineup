import { useState } from "react";
import { playerKit } from "../../model/board";
import { isDrawing } from "../../model/drawings";
import { BoardItem, Kit, PlayerNode, TeamId } from "../../model/types";
import { useEditor } from "../../state/EditorContext";
import { describeNode } from "../board/Markers";
import { Icon } from "../Icon";
import { Section } from "../ui/fields";
import { describeDrawing } from "./DrawingFields";

const TEAMS: TeamId[] = ["home", "away", "neutral"];

/** A CSS background that previews a kit: one colour, or its stripes. */
export function kitBackground(kit: Kit): string {
	if (!kit.stripes) return kit.color;
	const { color: c, stripes: s } = kit;
	// Three bands: at dot size, five read as thin lines.
	return `linear-gradient(90deg, ${c} 0 33%, ${s} 33% 67%, ${c} 67%)`;
}

/** Keepers first, then by shirt number; players without a number go last. */
function byShirt(a: PlayerNode, b: PlayerNode): number {
	if (a.keeper !== b.keeper) return a.keeper ? -1 : 1;
	return (a.number ?? Infinity) - (b.number ?? Infinity);
}

function selectMode(e: React.MouseEvent) {
	return e.shiftKey || e.ctrlKey || e.metaKey ? "toggle" : "replace";
}

function TeamGroup({ team, players }: { team: TeamId; players: PlayerNode[] }) {
	const { state, dispatch } = useEditor();
	const [open, setOpen] = useState(true);
	const selected = new Set(state.selection);
	const style = state.board.teams[team];
	const ids = players.map((p) => p.id);
	const allSelected = ids.every((id) => selected.has(id));
	const listId = `object-list-${team}`;

	return (
		<div className="team-group">
			<div className={`team-group__head${allSelected ? " is-selected" : ""}`}>
				<button
					type="button"
					className="team-group__toggle"
					aria-expanded={open}
					aria-controls={listId}
					aria-label={`${open ? "Collapse" : "Expand"} ${style.name}`}
					onClick={() => setOpen((o) => !o)}
				>
					<Icon
						name="chevronLeft"
						size={14}
						style={{ transform: `rotate(${open ? -90 : 180}deg)` }}
					/>
				</button>
				<button
					type="button"
					className="team-group__name"
					aria-pressed={allSelected}
					title={
						allSelected
							? `Deselect the ${style.name} players`
							: `Select all ${style.name} players (Shift-click to add)`
					}
					onClick={(e) => {
						if (allSelected) {
							// Clicking a selected team again deselects its players.
							const team = new Set(ids);
							dispatch({
								type: "select",
								ids: state.selection.filter((id) => !team.has(id)),
							});
							return;
						}
						dispatch({
							type: "select",
							ids,
							mode: e.shiftKey || e.ctrlKey || e.metaKey ? "add" : "replace",
						});
					}}
				>
					<span
						className="kit-dot"
						style={{ background: kitBackground(style) }}
					/>
					<span className="team-group__label">{style.name}</span>
					<span className="muted">{players.length}</span>
				</button>
			</div>
			{open && (
				<ul className="object-list" id={listId}>
					{[...players].sort(byShirt).map((p) => (
						<li key={p.id}>
							<button
								type="button"
								className={`object-list__item object-list__item--player${
									selected.has(p.id) ? " is-selected" : ""
								}`}
								aria-pressed={selected.has(p.id)}
								aria-label={describeNode(p, state.board)}
								onClick={(e) =>
									dispatch({ type: "select", ids: [p.id], mode: selectMode(e) })
								}
							>
								<span
									className="kit-dot kit-dot--small"
									style={{
										background: kitBackground(playerKit(p, state.board.teams)),
									}}
								/>
								<span className="object-list__number mono">
									{p.number ?? "–"}
								</span>
								<span className="object-list__name">
									{p.name || (p.keeper ? "Goalkeeper" : "Player")}
								</span>
								<span className="object-list__position muted">
									{p.label || (p.keeper ? "GK" : "")}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/** Every marker and drawing on the board: players grouped by team, then everything else. */
export default function ObjectList() {
	const { state, dispatch } = useEditor();
	const { board } = state;
	const selected = new Set(state.selection);
	const players = board.nodes.filter(
		(n): n is PlayerNode => n.kind === "player",
	);
	// Top-most first: text, then markers, then other drawings.
	const objects: BoardItem[] = [
		...board.drawings.filter((d) => d.kind === "text").reverse(),
		...board.nodes.filter((n) => n.kind !== "player").reverse(),
		...board.drawings.filter((d) => d.kind !== "text").reverse(),
	];

	return (
		<>
			{players.length > 0 && (
				<Section
					title="Players"
					aside={<span className="muted">{players.length}</span>}
				>
					{TEAMS.map((team) => {
						const teamPlayers = players.filter((p) => p.team === team);
						return teamPlayers.length > 0 ? (
							<TeamGroup key={team} team={team} players={teamPlayers} />
						) : null;
					})}
				</Section>
			)}
			{objects.length > 0 && (
				<Section
					title="Objects"
					aside={<span className="muted">{objects.length}</span>}
				>
					<ul className="object-list">
						{objects.map((item) => (
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
											mode: selectMode(e),
										})
									}
								>
									{isDrawing(item)
										? describeDrawing(item)
										: describeNode(item, board)}
								</button>
							</li>
						))}
					</ul>
				</Section>
			)}
		</>
	);
}
