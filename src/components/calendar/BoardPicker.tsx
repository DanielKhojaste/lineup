import { useMemo, useState } from "react";
import { Sport } from "../../model/sports";
import { Board } from "../../model/types";
import { FolderPick, inFolder, PickerFolders, SportChips } from "../ui/PickerFilters";
import { useLibrary } from "../../state/LibraryContext";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

/** Picking a board from the library (a game's formation), as pictures with a search. */
export default function BoardPicker({
	title = "Choose a formation",
	onPick,
	onClose,
	onSwitch,
	initialSport = "all",
	onSportChange,
}: {
	title?: string;
	onPick: (board: Board) => void;
	onClose: () => void;
	/** In the calendar's Attach window: switch to picking the other kind. */
	onSwitch?: (to: "session" | "board") => void;
	initialSport?: Sport | "all";
	onSportChange?: (sport: Sport | "all") => void;
}) {
	const library = useLibrary();
	const [query, setQuery] = useState("");
	const [sport, setSportState] = useState<Sport | "all">(initialSport);
	const setSport = (s: Sport | "all") => {
		setSportState(s);
		onSportChange?.(s);
	};
	const [folder, setFolder] = useState<FolderPick>({ kind: "all" });
	const ofSport = library.boards.filter((b) => sport === "all" || b.pitch.sport === sport);
	const usedFolders = library.folders.filter((f) => ofSport.some((b) => b.meta.folders.includes(f)));
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return ofSport
			.filter((b) => inFolder(b.meta.folders, folder, usedFolders))
			.filter((b) => [b.meta.title, ...b.meta.tags, ...b.meta.folders].join(" ").toLowerCase().includes(q))
			.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [library.boards, query, sport, folder]);
	return (
		<Modal open title={title} onClose={onClose} className="dialog--picker">
			<div className="dialog__section session-picker">
				{onSwitch && (
					<div className="segmented segmented--small attach-tabs" role="radiogroup" aria-label="Attach">
						{(["session", "board"] as const).map((t) => (
							<button
								key={t}
								type="button"
								role="radio"
								aria-checked={t === "board"}
								className={`segmented__item${t === "board" ? " is-active" : ""}`}
								onClick={() => t !== "board" && onSwitch(t)}
							>
								{t === "session" ? "Session" : "Board"}
							</button>
						))}
					</div>
				)}
				<div className="session-picker__bar">
					<label className="search">
						<Icon name="search" size={16} />
						<input
							type="search"
							placeholder="Search boards, tags and folders"
							value={query}
							data-autofocus=""
							onChange={(e) => setQuery(e.target.value)}
						/>
					</label>
					<SportChips value={sport} onChange={setSport} sports={library.boards.map((b) => b.pitch.sport)} />
				</div>
				<div className="picker-body">
				<PickerFolders
					order={library.folders}
					itemFolders={ofSport.map((b) => b.meta.folders)}
					value={folder}
					onChange={setFolder}
				/>
				{shown.length ? (
					<div className="board-pick-grid">
						{shown.map((b) => (
							<button key={b.id} type="button" className="board-pick" onClick={() => onPick(b)}>
								<BoardPreview board={b} className="board-pick__thumb" />
								<span className="board-pick__title" title={b.meta.title}>
									{b.meta.title || "Untitled board"}
								</span>
							</button>
						))}
					</div>
				) : (
					<p className="muted session-picker__empty">
						{library.boards.length ? "No boards match." : "No boards yet. Make one in the library first."}
					</p>
				)}
				</div>
			</div>
		</Modal>
	);
}
