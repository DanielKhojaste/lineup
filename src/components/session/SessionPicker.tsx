import { useMemo, useState } from "react";
import { Session, sessionTitle } from "../../model/session";
import { Sport } from "../../model/sports";
import { FolderPick, inFolder, PickerFolders, SportChips } from "../ui/PickerFilters";
import { useLibrary } from "../../state/LibraryContext";
import SessionCard from "../library/SessionCard";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

/**
 * Picking a session from the library, as cards like the library's (with
 * their drills' pictures), with a search and the sports to narrow it down.
 * Recently edited first, so the session just planned is near the top.
 */
export default function SessionPicker({
	title = "Choose a session",
	initialSport = "all",
	onPick,
	onClose,
	onSwitch,
	onSportChange,
}: {
	title?: string;
	/** Start filtered to this sport (e.g. the calendar's sport filter). */
	initialSport?: Sport | "all";
	onPick: (session: Session) => void;
	onClose: () => void;
	/** In the calendar's Attach window: switch to picking the other kind. */
	onSwitch?: (to: "session" | "board") => void;
	/** Told when the sport changes (the Attach window keeps it when switching to boards). */
	onSportChange?: (sport: Sport | "all") => void;
}) {
	const library = useLibrary();
	const [query, setQuery] = useState("");
	const [sport, setSportState] = useState<Sport | "all">(initialSport);
	const setSport = (s: Sport | "all") => {
		setSportState(s);
		onSportChange?.(s);
	};
	// In the Attach window: folders on the left, only the ones with sessions of the sport picked.
	const [folder, setFolder] = useState<FolderPick>({ kind: "all" });
	const ofSport = library.sessions.filter((s) => sport === "all" || s.header.sport === sport);
	const usedFolders = library.folders.filter((f) => ofSport.some((s) => s.meta.folders.includes(f)));
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return library.sessions
			.filter((s) => sport === "all" || s.header.sport === sport)
			.filter((s) => !onSwitch || inFolder(s.meta.folders, folder, usedFolders))
			.filter((s) =>
				[sessionTitle(s), s.header.team, ...s.header.topics, ...s.meta.folders]
					.join(" ")
					.toLowerCase()
					.includes(q),
			)
			.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [library.sessions, query, sport, folder, usedFolders.join("\n")]);

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
								aria-checked={t === "session"}
								className={`segmented__item${t === "session" ? " is-active" : ""}`}
								onClick={() => t !== "session" && onSwitch(t)}
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
							placeholder="Search sessions, teams and topics"
							value={query}
							data-autofocus=""
							onChange={(e) => setQuery(e.target.value)}
						/>
					</label>
					<SportChips value={sport} onChange={setSport} sports={library.sessions.map((x) => x.header.sport)} />
				</div>
				<div className={onSwitch ? "picker-body" : undefined}>
				{onSwitch && (
					<PickerFolders
						order={library.folders}
						colors={library.folderColors}
						itemFolders={ofSport.map((s) => s.meta.folders)}
						value={folder}
						onChange={setFolder}
					/>
				)}
				{shown.length ? (
					<div className="board-grid session-picker__grid">
						{shown.map((s) => (
							<SessionCard
								key={s.id}
								session={s}
								getBoard={library.getBoard}
								onOpen={() => onPick(s)}
								menu={() => [{ label: "Choose", onSelect: () => onPick(s) }]}
							/>
						))}
					</div>
				) : (
					<p className="muted session-picker__empty">
						{library.sessions.length ? "No sessions match." : "No sessions yet. Make one in the library first."}
					</p>
				)}
				</div>
			</div>
		</Modal>
	);
}
