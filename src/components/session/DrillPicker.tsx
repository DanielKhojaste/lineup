import { useMemo, useState } from "react";
import { BOARD_TYPE_LABELS } from "../../model/board";
import {
	createDrillBlock,
	DEFAULT_DRILL_MINUTES,
	minutesFromText,
} from "../../model/session";
import { SPORT_INFO } from "../../model/sports";
import { Board, BOARD_TYPES, BoardType } from "../../model/types";
import { useLibrary } from "../../state/LibraryContext";
import { useSessionEditor } from "../../state/SessionContext";
import BoardPreview from "../board/BoardPreview";

const COLLAPSED_KEY = "lineup.session.libraryHidden";

/** Whether the library panel is hidden, remembered on this computer. */
function useCollapsed(): [boolean, (value: boolean) => void] {
	const [collapsed, set] = useState(() => {
		try {
			return localStorage.getItem(COLLAPSED_KEY) === "1";
		} catch {
			return false;
		}
	});
	const setCollapsed = (value: boolean) => {
		set(value);
		try {
			if (value) localStorage.setItem(COLLAPSED_KEY, "1");
			else localStorage.removeItem(COLLAPSED_KEY);
		} catch {
			/* only remembered while the app is open */
		}
	};
	return [collapsed, setCollapsed];
}
import { Icon } from "../Icon";

function matches(board: Board, query: string) {
	if (!query) return true;
	const q = query.toLowerCase();
	const { meta, notes } = board;
	return [meta.title, meta.folder, ...meta.tags, notes.category, notes.description]
		.join(" ")
		.toLowerCase()
		.includes(q);
}

/**
 * The library beside the timeline: find a drill and click it to add it to the
 * session, after the selected block (or at the end).
 */
export default function DrillPicker() {
	const library = useLibrary();
	const [collapsed, setCollapsed] = useCollapsed();
	const { state, dispatch, selectedBlock, setSelectedBlock } =
		useSessionEditor();
	const { session } = state;
	const [query, setQuery] = useState("");
	const [type, setType] = useState<BoardType | "all">("all");
	const sport = session.header.sport;

	const used = useMemo(() => {
		const counts = new Map<string, number>();
		for (const b of session.blocks)
			if (b.kind === "drill") counts.set(b.boardId, (counts.get(b.boardId) ?? 0) + 1);
		return counts;
	}, [session.blocks]);

	const shown = library.boards
		.filter((b) => type === "all" || b.meta.type === type)
		// A session is for one sport: only its boards can go in.
		.filter((b) => b.pitch.sport === sport)
		.filter((b) => matches(b, query.trim()))
		.sort((a, b) => a.meta.title.localeCompare(b.meta.title));

	const add = (board: Board) => {
		const block = createDrillBlock(
			board.id,
			minutesFromText(board.notes.duration) ?? DEFAULT_DRILL_MINUTES,
		);
		const after = session.blocks.findIndex((b) => b.id === selectedBlock);
		dispatch({
			type: "addBlocks",
			blocks: [block],
			index: after === -1 ? undefined : after + 1,
		});
		setSelectedBlock(block.id);
	};

	if (collapsed)
		return (
			<aside
				className="drill-picker drill-picker--collapsed"
				aria-label="Add drills from your library"
			>
				<button
					type="button"
					className="drill-picker__expand"
					title="Show the library"
					aria-expanded={false}
					onClick={() => setCollapsed(false)}
				>
					<Icon name="chevronLeft" size={16} />
					<span className="drill-picker__expand-label">Add from library</span>
				</button>
			</aside>
		);

	return (
		<aside className="drill-picker" aria-label="Add drills from your library">
			<div className="drill-picker__head">
				<div className="drill-picker__title">
					<h2>Add from library</h2>
					<button
						type="button"
						className="icon-button icon-button--small"
						aria-label="Hide the library"
						title="Hide the library"
						aria-expanded={true}
						onClick={() => setCollapsed(true)}
					>
						<Icon name="chevronRight" size={16} />
					</button>
				</div>
				<label className="search search--small">
					<Icon name="search" size={14} />
					<span className="visually-hidden">Search boards</span>
					<input
						type="search"
						placeholder="Search drills"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</label>
				<div className="filter-chips" role="group" aria-label="Board type">
					{(["all", ...BOARD_TYPES] as const).map((t) => (
						<button
							key={t}
							type="button"
							className={`filter-chip${type === t ? " is-active" : ""}`}
							aria-pressed={type === t}
							onClick={() => setType(t)}
						>
							{t === "all" ? "All" : BOARD_TYPE_LABELS[t].many}
						</button>
					))}
				</div>
			</div>
			<ul className="drill-picker__list">
				{shown.map((board) => {
					const count = used.get(board.id) ?? 0;
					return (
						<li key={board.id}>
							<button
								type="button"
								className="drill-picker__item"
								onClick={() => add(board)}
								title={`Add “${board.meta.title}” to the session`}
							>
								<BoardPreview board={board} className="drill-picker__preview" />
								<span className="drill-picker__text">
									<span className="drill-picker__title">{board.meta.title}</span>
									<span className="drill-picker__meta">
										{[
											BOARD_TYPE_LABELS[board.meta.type].one,
											board.notes.duration,
											board.notes.players,
										]
											.filter(Boolean)
											.join(" · ")}
									</span>
								</span>
								{count > 0 && (
									<span className="badge" title="Already in this session">
										{count > 1 ? `×${count}` : "In"}
									</span>
								)}
								<span className="drill-picker__add" aria-hidden="true">
									<Icon name="plus" size={16} />
								</span>
							</button>
						</li>
					);
				})}
			</ul>
			{shown.length === 0 && (
				<p className="muted small drill-picker__empty">
					{library.boards.every((b) => b.pitch.sport !== sport)
						? `No ${SPORT_INFO[sport].name.toLowerCase()} boards yet. Draw a drill first, then add it here.`
						: "No boards match."}
				</p>
			)}
		</aside>
	);
}
