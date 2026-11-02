import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BoardPreview from "../components/board/BoardPreview";
import { Icon } from "../components/Icon";
import SettingsDialog from "../components/shell/SettingsDialog";
import { ConfirmDialog, Modal, PromptDialog } from "../components/ui/Dialog";
import { Menu } from "../components/ui/Menu";
import { ContextMenuEntry, useContextMenu } from "../components/ui/ContextMenu";
import { boardToPng } from "../export/png";
import { SURFACES } from "../components/board/Pitch";
import NewBoardDialog from "../components/library/NewBoardDialog";
import SessionCard from "../components/library/SessionCard";
import { BOARD_TYPE_LABELS } from "../model/board";
import { Session, sessionTitle } from "../model/session";
import { pitchLabel, Sport, SPORT_INFO, SPORTS } from "../model/sports";
import { Board, BOARD_TYPES, BoardType, PitchSettings } from "../model/types";
import { allFolders, useLibrary } from "../state/LibraryContext";
import { exportBoardFile, exportPng, pickBoardFiles } from "../storage/files";
import { relativeTime } from "../utils/time";

/** Which boards the main area shows: everything, the boards outside folders, or one folder. */
type View =
	| { kind: "all" }
	| { kind: "sessions" }
	| { kind: "unfiled" }
	| { kind: "folder"; name: string }
	| { kind: "sport"; sport: Sport };
type Sort = "updated" | "title";

function matches(board: Board, query: string): boolean {
	if (!query) return true;
	const q = query.toLowerCase();
	const { meta, notes } = board;
	return [
		meta.title,
		meta.folder,
		...meta.tags,
		notes.category,
		notes.ageGroup,
		notes.description,
		...notes.coachingPoints,
	]
		.join(" ")
		.toLowerCase()
		.includes(q);
}

function sessionMatches(session: Session, query: string): boolean {
	if (!query) return true;
	const { meta, header } = session;
	return [
		meta.title,
		meta.folder,
		...meta.tags,
		header.team,
		header.description,
		...header.topics,
	]
		.join(" ")
		.toLowerCase()
		.includes(query.toLowerCase());
}

function BoardCard({
	board,
	onOpen,
	onDuplicate,
	onMove,
	onExport,
	onExportPng,
	onDelete,
	contextMenu,
}: {
	board: Board;
	/** Entries for the card's right-click menu. */
	contextMenu: () => ContextMenuEntry[];
	onOpen: () => void;
	onDuplicate: () => void;
	onMove: () => void;
	onExport: () => void;
	onExportPng: () => void;
	onDelete: () => void;
}) {
	const details = [
		BOARD_TYPE_LABELS[board.meta.type].one,
		pitchLabel(board.pitch),
		board.meta.folder,
		board.notes.duration,
		board.steps.length > 0 &&
			`${board.steps.length} step${board.steps.length > 1 ? "s" : ""}`,
		`Edited ${relativeTime(board.meta.updatedAt)}`,
	].filter(Boolean);
	const { openMenu } = useContextMenu();
	return (
		<article
			className="board-card"
			onContextMenu={(e) => openMenu(e, contextMenu())}
		>
			<button
				type="button"
				className="board-card__open"
				onClick={onOpen}
				aria-label={`Open ${board.meta.title}`}
			>
				<BoardPreview board={board} className="board-card__preview" />
				<span className="board-card__title">{board.meta.title}</span>
				<span className="board-card__meta">{details.join(" · ")}</span>
			</button>
			<div className="board-card__menu">
				<Menu
					label={`More actions for ${board.meta.title}`}
					button={<Icon name="more" size={18} />}
					items={[
						{ label: "Open", onSelect: onOpen },
						{ label: "Duplicate", onSelect: onDuplicate },
						{ label: "Move to folder…", onSelect: onMove },
						"separator",
						{ label: "Export .lineup file", onSelect: onExport },
						{ label: "Export PNG image", onSelect: onExportPng },
						"separator",
						{ label: "Delete", onSelect: onDelete, danger: true },
					]}
				/>
			</div>
		</article>
	);
}

function MoveDialog({
	board,
	folders,
	onMove,
	onClose,
}: {
	/** The board or session being moved. */
	board: { meta: { title: string; folder: string } } | null;
	folders: string[];
	onMove: (folder: string) => void;
	onClose: () => void;
}) {
	const [folder, setFolder] = useState(board?.meta.folder ?? "");
	return (
		<Modal open={!!board} title="Move to folder" onClose={onClose}>
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					onMove(folder);
					onClose();
				}}
			>
				<label className="field">
					<span className="field__label">Folder for “{board?.meta.title}”</span>
					<select
						className="field__input"
						value={folder}
						onChange={(e) => setFolder(e.target.value)}
						data-autofocus
					>
						<option value="">No folder</option>
						{folders.map((f) => (
							<option key={f} value={f}>
								{f}
							</option>
						))}
					</select>
				</label>
				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary">
						Move
					</button>
				</div>
			</form>
		</Modal>
	);
}

export default function Library() {
	const library = useLibrary();
	const navigate = useNavigate();
	const { openMenu } = useContextMenu();
	// Coming back from a session opens the sessions view again.
	const backTo = (useLocation().state as { view?: string } | null)?.view;
	const [view, setView] = useState<View>(
		backTo === "sessions" ? { kind: "sessions" } : { kind: "all" },
	);
	const [type, setType] = useState<BoardType | "all">("all");
	// Each view starts with every type showing.
	useEffect(() => setType("all"), [view]);
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<Sort>("updated");
	const [newBoardOpen, setNewBoardOpen] = useState(false);
	const [notice, setNotice] = useState<{
		text: string;
		tone: "info" | "error";
	} | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newFolderOpen, setNewFolderOpen] = useState(false);
	const [renaming, setRenaming] = useState<string | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<string | null>(null);
	const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
	const [moving, setMoving] = useState<Board | null>(null);
	const [movingSession, setMovingSession] = useState<Session | null>(null);
	const [deletingSession, setDeletingSession] = useState<Session | null>(null);

	const folders = allFolders(library.folders, [
		...library.boards,
		...library.sessions,
	]);
	const currentFolder = view.kind === "folder" ? view.name : "";

	const shown = useMemo(() => {
		if (view.kind === "sessions") return [];
		const inView = library.boards.filter((b) =>
			view.kind === "all"
				? true
				: view.kind === "unfiled"
				  ? !b.meta.folder
				  : view.kind === "sport"
				    ? b.pitch.sport === view.sport
				    : b.meta.folder === view.name,
		);
		const found = inView.filter(
			(b) => (type === "all" || b.meta.type === type) && matches(b, query.trim()),
		);
		return sort === "title"
			? [...found].sort((a, b) => a.meta.title.localeCompare(b.meta.title))
			: [...found].sort((a, b) =>
					b.meta.updatedAt.localeCompare(a.meta.updatedAt),
			  );
	}, [library.boards, view, query, sort, type]);

	// Sessions show in their own view, and next to boards in folders and sports.
	const shownSessions = useMemo(() => {
		if (view.kind === "all") return [];
		const inView = library.sessions.filter((s) =>
			view.kind === "sessions"
				? true
				: view.kind === "unfiled"
				  ? !s.meta.folder
				  : view.kind === "sport"
				    ? s.header.sport === view.sport
				    : s.meta.folder === view.name,
		);
		const found = inView.filter((s) => sessionMatches(s, query.trim()));
		return sort === "title"
			? [...found].sort((a, b) => sessionTitle(a).localeCompare(sessionTitle(b)))
			: [...found].sort((a, b) =>
					b.meta.updatedAt.localeCompare(a.meta.updatedAt),
			  );
	}, [library.sessions, view, query, sort]);

	// Board types in this view, for the filter chips.
	const typeCounts = useMemo(() => {
		const counts = new Map<BoardType, number>();
		const inView = library.boards.filter((b) =>
			view.kind === "all"
				? true
				: view.kind === "unfiled"
				  ? !b.meta.folder
				  : view.kind === "sport"
				    ? b.pitch.sport === view.sport
				    : view.kind === "folder"
				      ? b.meta.folder === view.name
				      : false,
		);
		for (const b of inView) counts.set(b.meta.type, (counts.get(b.meta.type) ?? 0) + 1);
		return counts;
	}, [library.boards, view]);

	// The sidebar lists the sports the library has boards for.
	const sportsInLibrary = SPORTS.filter((s) =>
		library.boards.some((b) => b.pitch.sport === s),
	);

	const run = async (task: () => Promise<unknown>, failure: string) => {
		try {
			await task();
		} catch (error) {
			setNotice({
				text: `${failure}: ${(error as Error).message || error}`,
				tone: "error",
			});
		}
	};

	const openBoard = (id: string) => navigate(`/board/${id}`);
	const openSession = (id: string) => navigate(`/session/${id}`);

	const newSession = () =>
		run(async () => {
			const session = await library.createSession(currentFolder);
			openSession(session.id);
		}, "Couldn't create the session");

	const sessionMenu = (session: Session) => () => [
		{ label: "Open", onSelect: () => openSession(session.id) },
		{
			label: "Duplicate",
			onSelect: () =>
				run(
					() => library.duplicateSession(session.id),
					"Couldn't duplicate the session",
				),
		},
		{ label: "Move to folder…", onSelect: () => setMovingSession(session) },
		"separator" as const,
		{
			label: "Delete…",
			danger: true,
			onSelect: () => setDeletingSession(session),
		},
	];

	/** A new board for the sport and field picked in the New board dialog. */
	const newBoard = (pitch: PitchSettings) =>
		run(async () => {
			const board = await library.createBoard(currentFolder, pitch);
			openBoard(board.id);
		}, "Couldn't create the board");

	const importBoards = () =>
		run(async () => {
			const { boards, problems } = await pickBoardFiles();
			if (!boards.length && !problems.length) return;
			const added = await library.addBoards(
				boards.map((b) => ({
					...b,
					meta: { ...b.meta, folder: b.meta.folder || currentFolder },
				})),
			);
			const parts = [];
			if (added.length)
				parts.push(
					`Imported ${added.length} board${added.length === 1 ? "" : "s"}.`,
				);
			if (problems.length) parts.push(`Couldn't open: ${problems.join("; ")}`);
			setNotice({
				text: parts.join(" "),
				tone: problems.length ? "error" : "info",
			});
		}, "Import failed");

	const counts = (name: string) =>
		library.boards.filter((b) => b.meta.folder === name).length +
		library.sessions.filter((s) => s.meta.folder === name).length;
	const unfiledCount =
		library.boards.filter((b) => !b.meta.folder).length +
		library.sessions.filter((s) => !s.meta.folder).length;
	const heading =
		view.kind === "all"
			? "All boards"
			: view.kind === "sessions"
			  ? "Sessions"
			  : view.kind === "unfiled"
			  ? "Not in a folder"
			  : view.kind === "sport"
			    ? SPORT_INFO[view.sport].name
			    : view.name;

	const navItem = (
		label: string,
		count: number,
		active: boolean,
		onClick: () => void,
		icon: "grid" | "folder" | "inbox" | "session",
	) => (
		<button
			type="button"
			className={`nav-item${active ? " is-active" : ""}`}
			aria-current={active ? "page" : undefined}
			onClick={onClick}
		>
			<Icon name={icon} size={16} />
			<span className="nav-item__label">{label}</span>
			<span className="nav-item__count">{count}</span>
		</button>
	);

	return (
		<div className="library">
			<header className="topbar">
				<div className="brand">
					<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
						<rect
							x="1"
							y="1"
							width="22"
							height="22"
							rx="6"
							fill="var(--accent)"
						/>
						<path
							d="M12 5v14M5 12a7 7 0 0 0 14 0"
							stroke="var(--on-accent)"
							strokeWidth="2"
							fill="none"
						/>
					</svg>
					<span>Lineup</span>
				</div>
				<label className="search">
					<Icon name="search" size={16} />
					<span className="visually-hidden">Search boards</span>
					<input
						type="search"
						placeholder="Search titles, tags and notes"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</label>
				<span className="topbar__spacer" />
				<button type="button" className="button" onClick={importBoards}>
					Import
				</button>
				<button
					type="button"
					className={`button${view.kind === "sessions" ? " button--primary" : ""}`}
					onClick={newSession}
					disabled={library.status !== "ready"}
				>
					<Icon name="plus" size={16} />
					New session
				</button>
				<button
					type="button"
					className={`button${view.kind === "sessions" ? "" : " button--primary"}`}
					onClick={() => setNewBoardOpen(true)}
					disabled={library.status !== "ready"}
				>
					<Icon name="plus" size={16} />
					New board
				</button>
				<button
					type="button"
					className="icon-button"
					aria-label="Settings and themes"
					title="Settings and themes"
					onClick={() => setSettingsOpen(true)}
				>
					<Icon name="settings" size={18} />
				</button>
			</header>

			<div className="library__body">
				<nav className="library__nav" aria-label="Library">
					<div className="nav-group">
						{navItem(
							"All boards",
							library.boards.length,
							view.kind === "all",
							() => setView({ kind: "all" }),
							"grid",
						)}
						{navItem(
							"Sessions",
							library.sessions.length,
							view.kind === "sessions",
							() => setView({ kind: "sessions" }),
							"session",
						)}
						{navItem(
							"Not in a folder",
							unfiledCount,
							view.kind === "unfiled",
							() => setView({ kind: "unfiled" }),
							"inbox",
						)}
					</div>
					{sportsInLibrary.length > 0 && (
						<div className="nav-group">
							<div className="nav-group__head">
								<span>Sports</span>
							</div>
							{sportsInLibrary.map((sport) => (
								<button
									key={sport}
									type="button"
									className={`nav-item${
										view.kind === "sport" && view.sport === sport
											? " is-active"
											: ""
									}`}
									aria-current={
										view.kind === "sport" && view.sport === sport
											? "page"
											: undefined
									}
									onClick={() => setView({ kind: "sport", sport })}
								>
									<span
										className="sport-swatch"
										style={{ background: SURFACES[sport].floor }}
										aria-hidden="true"
									/>
									<span className="nav-item__label">
										{SPORT_INFO[sport].name}
									</span>
									<span className="nav-item__count">
										{
											library.boards.filter((b) => b.pitch.sport === sport)
												.length
										}
									</span>
								</button>
							))}
						</div>
					)}
					<div className="nav-group">
						<div className="nav-group__head">
							<span>Folders</span>
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="New folder"
								title="New folder"
								onClick={() => setNewFolderOpen(true)}
							>
								<Icon name="plus" size={16} />
							</button>
						</div>
						{folders.length === 0 && (
							<p className="muted small nav-group__empty">No folders yet.</p>
						)}
						{folders.map((name) => (
							<div
								key={name}
								className="nav-row"
								onContextMenu={(e) =>
									openMenu(e, [
										{
											label: "Open",
											onSelect: () => setView({ kind: "folder", name }),
										},
										{
											label: "New board here…",
											onSelect: () => {
												setView({ kind: "folder", name });
												setNewBoardOpen(true);
											},
										},
										"separator",
										{ label: "Rename…", onSelect: () => setRenaming(name) },
										{
											label: "Delete folder…",
											danger: true,
											onSelect: () => setDeletingFolder(name),
										},
									])
								}
							>
								{navItem(
									name,
									counts(name),
									view.kind === "folder" && view.name === name,
									() => setView({ kind: "folder", name }),
									"folder",
								)}
								<Menu
									label={`Folder actions for ${name}`}
									button={<Icon name="more" size={16} />}
									buttonClassName="icon-button icon-button--small nav-row__menu"
									items={[
										{ label: "Rename", onSelect: () => setRenaming(name) },
										{
											label: "Delete folder",
											onSelect: () => setDeletingFolder(name),
											danger: true,
										},
									]}
								/>
							</div>
						))}
					</div>
					<span className="topbar__spacer" />
					<div className="library__location">
						<span className="library__location-label">Saved in</span>
						<span className="mono">{library.location || "…"}</span>
					</div>
				</nav>

				<main
					className="library__main"
					onContextMenu={(e) => {
						if (e.defaultPrevented) return;
						openMenu(e, [
							{ label: "New board…", onSelect: () => setNewBoardOpen(true) },
							{ label: "New session", onSelect: newSession },
							{ label: "Import boards…", onSelect: importBoards },
							"separator",
							{ label: "New folder…", onSelect: () => setNewFolderOpen(true) },
						]);
					}}
				>
					<div className="library__head">
						<h1>{heading}</h1>
						<span className="muted">
							{[
								view.kind !== "sessions" &&
									`${shown.length} ${shown.length === 1 ? "board" : "boards"}`,
								shownSessions.length > 0 &&
									`${shownSessions.length} ${
										shownSessions.length === 1 ? "session" : "sessions"
									}`,
							]
								.filter(Boolean)
								.join(" · ") || "Nothing here yet"}
						</span>
						<span className="topbar__spacer" />
						<label className="sort">
							<span className="muted">Sort</span>
							<select
								className="field__input"
								value={sort}
								onChange={(e) => setSort(e.target.value as Sort)}
							>
								<option value="updated">Last edited</option>
								<option value="title">Name</option>
							</select>
						</label>
					</div>

					{notice && (
						<div
							className={`notice notice--${notice.tone}`}
							role={notice.tone === "error" ? "alert" : "status"}
						>
							<span>{notice.text}</span>
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="Dismiss"
								onClick={() => setNotice(null)}
							>
								<Icon name="close" size={14} />
							</button>
						</div>
					)}
					{library.problems.length > 0 && (
						<div className="notice notice--error" role="alert">
							<span>
								Some files in your library couldn't be opened:{" "}
								{library.problems.join("; ")}
							</span>
						</div>
					)}

					{library.status === "loading" && (
						<p className="muted">Loading your library…</p>
					)}
					{library.status === "error" && (
						<div className="notice notice--error" role="alert">
							Couldn't open your library: {library.error}
						</div>
					)}

					{view.kind !== "sessions" && typeCounts.size > 1 && (
						<div className="filter-chips" role="group" aria-label="Board type">
							<button
								type="button"
								className={`filter-chip${type === "all" ? " is-active" : ""}`}
								aria-pressed={type === "all"}
								onClick={() => setType("all")}
							>
								All types
							</button>
							{BOARD_TYPES.filter((t) => typeCounts.has(t)).map((t) => (
								<button
									key={t}
									type="button"
									className={`filter-chip${type === t ? " is-active" : ""}`}
									aria-pressed={type === t}
									onClick={() => setType(type === t ? "all" : t)}
								>
									{BOARD_TYPE_LABELS[t].many}
									<span className="filter-chip__count">{typeCounts.get(t)}</span>
								</button>
							))}
						</div>
					)}

					{library.status === "ready" &&
						view.kind === "sessions" &&
						shownSessions.length === 0 && (
							<div className="empty-state">
								{query ? (
									<p>No sessions match “{query}”.</p>
								) : (
									<>
										<p>
											No sessions yet. A session puts drills from your library in
											order, with breaks and timings, and prints as a session sheet.
										</p>
										<button
											type="button"
											className="button button--primary"
											onClick={newSession}
										>
											<Icon name="plus" size={16} />
											New session
										</button>
									</>
								)}
							</div>
						)}

					{shownSessions.length > 0 && (
						<>
							{view.kind !== "sessions" && <h2 className="library__section">Sessions</h2>}
							<div className="board-grid">
								{shownSessions.map((session) => (
									<SessionCard
										key={session.id}
										session={session}
										getBoard={library.getBoard}
										onOpen={() => openSession(session.id)}
										menu={sessionMenu(session)}
									/>
								))}
							</div>
							{view.kind !== "sessions" && shown.length > 0 && (
								<h2 className="library__section">Boards</h2>
							)}
						</>
					)}

					{library.status === "ready" &&
						view.kind !== "sessions" &&
						shown.length === 0 &&
						shownSessions.length === 0 && (
						<div className="empty-state">
							{query ? (
								<p>No boards match “{query}”.</p>
							) : (
								<>
									<p>
										{view.kind === "all"
											? "No boards yet."
											: "Nothing in here yet."}
									</p>
									<button
										type="button"
										className="button button--primary"
										onClick={() => setNewBoardOpen(true)}
									>
										<Icon name="plus" size={16} />
										New board
									</button>
								</>
							)}
						</div>
					)}

					<div className="board-grid">
						{shown.map((board) => (
							<BoardCard
								key={board.id}
								board={board}
								onOpen={() => openBoard(board.id)}
								onDuplicate={() =>
									run(
										() => library.duplicateBoard(board.id),
										"Couldn't duplicate the board",
									)
								}
								onMove={() => setMoving(board)}
								onExport={() =>
									run(() => exportBoardFile(board), "Export failed")
								}
								onExportPng={() =>
									run(
										async () => exportPng(board, await boardToPng(board)),
										"Export failed",
									)
								}
								onDelete={() => setDeletingBoard(board)}
								contextMenu={() => [
									{ label: "Open", onSelect: () => openBoard(board.id) },
									{
										label: "Duplicate",
										onSelect: () =>
											run(
												() => library.duplicateBoard(board.id),
												"Couldn't duplicate the board",
											),
									},
									{
										label: "Move to folder",
										submenu: [
											{
												label: "No folder",
												checked: !board.meta.folder,
												onSelect: () =>
													run(
														() => library.moveToFolder(board.id, ""),
														"Couldn't move the board",
													),
											},
											...(folders.length ? ["separator" as const] : []),
											...folders.map((f) => ({
												label: f,
												checked: board.meta.folder === f,
												onSelect: () =>
													run(
														() => library.moveToFolder(board.id, f),
														"Couldn't move the board",
													),
											})),
										],
									},
									"separator",
									{
										label: "Export",
										submenu: [
											{
												label: ".lineup file",
												onSelect: () =>
													run(() => exportBoardFile(board), "Export failed"),
											},
											{
												label: "PNG image",
												onSelect: () =>
													run(
														async () => exportPng(board, await boardToPng(board)),
														"Export failed",
													),
											},
										],
									},
									"separator",
									{
										label: "Delete…",
										danger: true,
										onSelect: () => setDeletingBoard(board),
									},
								]}
							/>
						))}
					</div>
				</main>
			</div>

			<PromptDialog
				open={newFolderOpen}
				title="New folder"
				label="Folder name"
				confirmLabel="Create"
				validate={(name) =>
					folders.includes(name)
						? "There's already a folder with that name."
						: null
				}
				onSubmit={(name) =>
					run(() => library.createFolder(name), "Couldn't create the folder")
				}
				onClose={() => setNewFolderOpen(false)}
			/>
			<PromptDialog
				open={renaming !== null}
				title="Rename folder"
				label="Folder name"
				initialValue={renaming ?? ""}
				confirmLabel="Rename"
				validate={(name) =>
					name !== renaming && folders.includes(name)
						? "There's already a folder with that name."
						: null
				}
				onSubmit={(name) => {
					const from = renaming!;
					run(
						() => library.renameFolder(from, name),
						"Couldn't rename the folder",
					);
					if (view.kind === "folder" && view.name === from)
						setView({ kind: "folder", name });
				}}
				onClose={() => setRenaming(null)}
			/>
			<ConfirmDialog
				open={deletingFolder !== null}
				title="Delete folder"
				message={`Delete the folder “${deletingFolder}”? Its boards stay in your library, just not in a folder.`}
				confirmLabel="Delete folder"
				danger
				onConfirm={() => {
					const name = deletingFolder!;
					run(() => library.deleteFolder(name), "Couldn't delete the folder");
					if (view.kind === "folder" && view.name === name)
						setView({ kind: "all" });
				}}
				onClose={() => setDeletingFolder(null)}
			/>
			<ConfirmDialog
				open={deletingBoard !== null}
				title="Delete board"
				message={`Delete “${deletingBoard?.meta.title}”? This can't be undone. Export it first if you might want it back.`}
				confirmLabel="Delete"
				danger
				onConfirm={() =>
					run(
						() => library.deleteBoard(deletingBoard!.id),
						"Couldn't delete the board",
					)
				}
				onClose={() => setDeletingBoard(null)}
			/>
			{moving && (
				<MoveDialog
					board={moving}
					folders={folders}
					onMove={(folder) =>
						run(
							() => library.moveToFolder(moving.id, folder),
							"Couldn't move the board",
						)
					}
					onClose={() => setMoving(null)}
				/>
			)}
			<ConfirmDialog
				open={deletingSession !== null}
				title="Delete session"
				message={`Delete the session “${deletingSession ? sessionTitle(deletingSession) : ""}”? Its drills stay in your library. This can't be undone.`}
				confirmLabel="Delete"
				danger
				onConfirm={() =>
					run(
						() => library.deleteSession(deletingSession!.id),
						"Couldn't delete the session",
					)
				}
				onClose={() => setDeletingSession(null)}
			/>
			{movingSession && (
				<MoveDialog
					board={movingSession}
					folders={folders}
					onMove={(folder) =>
						run(
							() => library.moveSessionToFolder(movingSession.id, folder),
							"Couldn't move the session",
						)
					}
					onClose={() => setMovingSession(null)}
				/>
			)}
			<NewBoardDialog
				open={newBoardOpen}
				initialSport={view.kind === "sport" ? view.sport : undefined}
				onClose={() => setNewBoardOpen(false)}
				onCreate={newBoard}
			/>
			<SettingsDialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}
