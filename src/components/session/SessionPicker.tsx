import { useMemo, useState } from "react";
import { Session, sessionTitle } from "../../model/session";
import { Sport, SPORT_INFO, SPORTS } from "../../model/sports";
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
}: {
	title?: string;
	/** Start filtered to this sport (e.g. the calendar's sport filter). */
	initialSport?: Sport | "all";
	onPick: (session: Session) => void;
	onClose: () => void;
	/** In the calendar's Attach window: switch to picking the other kind. */
	onSwitch?: (to: "session" | "board") => void;
}) {
	const library = useLibrary();
	const [query, setQuery] = useState("");
	const [sport, setSport] = useState<Sport | "all">(initialSport);
	const countOf = (s: Sport) => library.sessions.filter((x) => x.header.sport === s).length;
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return library.sessions
			.filter((s) => sport === "all" || s.header.sport === sport)
			.filter((s) =>
				[sessionTitle(s), s.header.team, ...s.header.topics, ...s.meta.folders]
					.join(" ")
					.toLowerCase()
					.includes(q),
			)
			.sort((a, b) => b.meta.updatedAt.localeCompare(a.meta.updatedAt));
	}, [library.sessions, query, sport]);

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
								{t === "session" ? "Session" : "Board (e.g. a formation)"}
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
					<div className="filter-chips" role="group" aria-label="Sport">
						<button
							type="button"
							className={`filter-chip${sport === "all" ? " is-active" : ""}`}
							aria-pressed={sport === "all"}
							onClick={() => setSport("all")}
						>
							All sports
							<span className="filter-chip__count">{library.sessions.length}</span>
						</button>
						{SPORTS.map((s) => (
							<button
								key={s}
								type="button"
								className={`filter-chip${sport === s ? " is-active" : ""}`}
								aria-pressed={sport === s}
								disabled={!countOf(s) && sport !== s}
								onClick={() => setSport(s)}
							>
								{SPORT_INFO[s].name}
								<span className="filter-chip__count">{countOf(s)}</span>
							</button>
						))}
					</div>
				</div>
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
		</Modal>
	);
}
