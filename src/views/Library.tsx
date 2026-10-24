import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BoardPreview from "../components/board/BoardPreview";
import { Icon } from "../components/Icon";
import SettingsDialog from "../components/shell/SettingsDialog";
import { ConfirmDialog, Modal, PromptDialog } from "../components/ui/Dialog";
import { Menu } from "../components/ui/Menu";
import { boardToPng } from "../export/png";
import { Board } from "../model/types";
import { allFolders, useLibrary } from "../state/LibraryContext";
import { exportBoardFile, exportPng, pickBoardFiles } from "../storage/files";
import { relativeTime } from "../utils/time";

/** Which boards the main area shows: everything, the boards outside folders, or one folder. */
type View =
	| { kind: "all" }
	| { kind: "unfiled" }
	| { kind: "folder"; name: string };
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

function BoardCard({
	board,
	onOpen,
	onDuplicate,
	onMove,
	onExport,
	onExportPng,
	onDelete,
}: {
	board: Board;
	onOpen: () => void;
	onDuplicate: () => void;
	onMove: () => void;
	onExport: () => void;
	onExportPng: () => void;
	onDelete: () => void;
}) {
	const details = [
		board.meta.folder,
		board.notes.duration,
		board.steps.length > 0 &&
			`${board.steps.length} step${board.steps.length > 1 ? "s" : ""}`,
		`Edited ${relativeTime(board.meta.updatedAt)}`,
	].filter(Boolean);
	return (
		<article className="board-card">
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
	board: Board | null;
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
	const [view, setView] = useState<View>({ kind: "all" });
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<Sort>("updated");
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

	const folders = allFolders(library.folders, library.boards);
	const currentFolder = view.kind === "folder" ? view.name : "";

	const shown = useMemo(() => {
		const inView = library.boards.filter((b) =>
			view.kind === "all"
				? true
				: view.kind === "unfiled"
				  ? !b.meta.folder
				  : b.meta.folder === view.name,
		);
		const found = inView.filter((b) => matches(b, query.trim()));
		return sort === "title"
			? [...found].sort((a, b) => a.meta.title.localeCompare(b.meta.title))
			: [...found].sort((a, b) =>
					b.meta.updatedAt.localeCompare(a.meta.updatedAt),
			  );
	}, [library.boards, view, query, sort]);

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

	const newBoard = () =>
		run(async () => {
			const board = await library.createBoard(currentFolder);
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
		library.boards.filter((b) => b.meta.folder === name).length;
	const unfiledCount = library.boards.filter((b) => !b.meta.folder).length;
	const heading =
		view.kind === "all"
			? "All boards"
			: view.kind === "unfiled"
			  ? "Not in a folder"
			  : view.name;

	const navItem = (
		label: string,
		count: number,
		active: boolean,
		onClick: () => void,
		icon: "grid" | "folder" | "inbox",
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
					className="button button--primary"
					onClick={newBoard}
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
							"Not in a folder",
							unfiledCount,
							view.kind === "unfiled",
							() => setView({ kind: "unfiled" }),
							"inbox",
						)}
					</div>
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
							<div key={name} className="nav-row">
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

				<main className="library__main">
					<div className="library__head">
						<h1>{heading}</h1>
						<span className="muted">
							{shown.length} {shown.length === 1 ? "board" : "boards"}
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

					{library.status === "ready" && shown.length === 0 && (
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
										onClick={newBoard}
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
			<SettingsDialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>
		</div>
	);
}
