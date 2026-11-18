import { Sport } from "../../model/sports";
import { useState } from "react";
import { CalendarEntry, describeDay, EntryKind, eventTitle, KIND_COLORS, parseISODate, statusOf, toISODate } from "../../model/calendar";
import { formatMinutes, sessionBoardIds, totalMinutes } from "../../model/session";
import { Board } from "../../model/types";
import { usePreferences } from "../../state/preferences";
import { useLibrary } from "../../state/LibraryContext";
import BoardPreview from "../board/BoardPreview";
import { Icon, IconName } from "../Icon";
import SessionPicker from "../session/SessionPicker";
import { Modal } from "../ui/Dialog";
import TeamField from "../ui/TeamField";
import TimeField from "../ui/TimeField";
import BoardPicker from "./BoardPicker";
import ColorSwatches from "./ColorSwatches";

const KINDS: { kind: EntryKind; name: string; icon: IconName }[] = [
	{ kind: "session", name: "Practice", icon: "session" },
	{ kind: "match", name: "Match", icon: "flag" },
	{ kind: "event", name: "Event", icon: "star" },
];

/**
 * Any calendar item, new or old (preview branch, updates-301 #5): a practice,
 * a match or another event. Any of them can have a session attached (a
 * practice's plan, a match's warm-up…), and a match can have a formation.
 */
export default function ItemDialog({
	entry,
	sportFilter = "all",
	onSave,
	onRemove,
	onPreviewSession,
	onClose,
}: {
	entry: CalendarEntry & { isNew?: boolean };
	sportFilter?: string;
	onSave: (entry: CalendarEntry) => void;
	onRemove: () => void;
	onPreviewSession: (id: string) => void;
	onClose: () => void;
}) {
	const library = useLibrary();
	const preferences = usePreferences();
	const [draft, setDraft] = useState({ ...entry, status: entry.kind === "session" ? statusOf(entry) : entry.status });
	const set = (patch: Partial<CalendarEntry>) => setDraft((d) => ({ ...d, ...patch }));
	const [picking, setPicking] = useState<"session" | "board" | null>(null);
	// The sport picked in the Attach window, kept when switching between sessions and boards.
	const [pickSport, setPickSport] = useState<Sport | "all">(
		sportFilter === "all" ? "all" : (sportFilter as Sport),
	);
	const session = library.getSession(draft.sessionId);
	const formation = library.getBoard(draft.boardId);
	const date = parseISODate(draft.date);
	const past = draft.date < toISODate(new Date());
	const kind = draft.kind;
	const kindName = KINDS.find((k) => k.kind === kind)!.name;

	// One window at a time: a picker takes this window's place while it's open.
	if (picking === "session")
		return (
			<SessionPicker
				title="Attach a session or a board"
				initialSport={pickSport}
				onSportChange={setPickSport}
				onPick={(picked) => {
					set({ sessionId: picked.id, team: draft.team || picked.header.team || "" });
					setPicking(null);
				}}
				onClose={() => setPicking(null)}
				onSwitch={setPicking}
			/>
		);
	if (picking === "board")
		return (
			<BoardPicker
				title="Attach a session or a board"
				initialSport={pickSport}
				onSportChange={setPickSport}
				onPick={(b) => {
					set({ boardId: b.id });
					setPicking(null);
				}}
				onClose={() => setPicking(null)}
				onSwitch={setPicking}
			/>
		);

	const title = entry.isNew
		? `Add ${kind === "event" ? "an event" : `a ${kindName.toLowerCase()}`}`
		: kind === "session"
			? draft.label.trim() || session?.meta.title || "Practice"
			: eventTitle(entry);

	return (
		<Modal open title={title} onClose={onClose} className="dialog--item">
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					const { isNew: _, ...clean } = draft;
					onSave({ ...clean, label: clean.label.trim() });
					onClose();
				}}
			>
				<div className="item-kinds" role="radiogroup" aria-label="What it is">
					{KINDS.map((k) => (
						<button
							key={k.kind}
							type="button"
							role="radio"
							aria-checked={kind === k.kind}
							className={`item-kind${kind === k.kind ? " is-active" : ""}`}
							style={{ ["--kind" as string]: preferences.calendarColors[k.kind] || KIND_COLORS[k.kind] || "var(--accent)" }}
							onClick={() => set({ kind: k.kind })}
						>
							<Icon name={k.icon} size={16} />
							{k.name}
						</button>
					))}
				</div>

				{kind === "match" ? (
					<div className="field-grid event-dialog__match">
						<label className="field">
							<span className="field__label">Opponent</span>
							<input
								className="field__input"
								value={draft.label}
								maxLength={120}
								placeholder="Riverside"
								required
								data-autofocus=""
								onChange={(e) => set({ label: e.target.value })}
							/>
						</label>
						<div className="field">
							<span className="field__label">Where</span>
							<div className="segmented" role="radiogroup" aria-label="Home or away">
								{[false, true].map((away) => (
									<button
										key={String(away)}
										type="button"
										role="radio"
										aria-checked={draft.away === away}
										className={`segmented__item${draft.away === away ? " is-active" : ""}`}
										onClick={() => set({ away })}
									>
										{away ? "Away" : "Home"}
									</button>
								))}
							</div>
						</div>
					</div>
				) : (
					<label className="field">
						<span className="field__label">
							Name{" "}
							{kind === "session" && <span className="muted">(optional, shown instead of "Practice")</span>}
						</span>
						<input
							className="field__input"
							value={draft.label}
							maxLength={120}
							placeholder={kind === "session" ? "Practice" : "Team photos, parents' meeting…"}
							required={kind === "event"}
							{...(entry.isNew ? { "data-autofocus": "" } : {})}
							onChange={(e) => set({ label: e.target.value })}
						/>
					</label>
				)}

				{/* What's attached: a session and/or a board (a formation…), on any kind of item. */}
				<div className="field">
					<span className="field__label">
						Attached <span className="muted">(optional)</span>
					</span>
					{session && (
						<div className="picked-session">
							<span className="picked-session__strip" aria-hidden="true">
								{sessionBoardIds(session)
									.map(library.getBoard)
									.filter((b): b is Board => !!b)
									.slice(0, 3)
									.map((b) => (
										<BoardPreview key={b.id} board={b} className="picked-session__thumb" />
									))}
							</span>
							<span className="picked-session__text">
								<b>{session.meta.title}</b>
								<span className="muted small">
									{["Session", session.header.team, totalMinutes(session) ? formatMinutes(totalMinutes(session)) : ""]
										.filter(Boolean)
										.join(" · ")}
								</span>
							</span>
							<button type="button" className="button button--small" onClick={() => setPicking("session")}>
								Change…
							</button>
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="Detach the session"
								onClick={() => set({ sessionId: "" })}
							>
								<Icon name="close" size={14} />
							</button>
						</div>
					)}
					{formation && (
						<div className="picked-session">
							<BoardPreview board={formation} className="picked-session__thumb" />
							<span className="picked-session__text">
								<b>{formation.meta.title || "Untitled board"}</b>
								<span className="muted small">Board</span>
							</span>
							<button type="button" className="button button--small" onClick={() => setPicking("board")}>
								Change…
							</button>
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="Detach the board"
								onClick={() => set({ boardId: "" })}
							>
								<Icon name="close" size={14} />
							</button>
						</div>
					)}
					{!(session && formation) && (
						<button
							type="button"
							className="button picked-session__choose"
							// A match usually gets a formation; the others a session.
							onClick={() =>
								setPicking(session ? "board" : formation ? "session" : kind === "match" ? "board" : "session")
							}
						>
							<Icon name="plus" size={16} />
							{session ? "Attach a board…" : formation ? "Attach a session…" : "Attach a session or board…"}
						</button>
					)}
				</div>

				<div className="field-grid">
					<label className="field">
						<span className="field__label">Date</span>
						<input
							className="field__input"
							type="date"
							required
							value={draft.date}
							onChange={(e) => e.target.value && set({ date: e.target.value })}
						/>
					</label>
					<div className="field">
						<span className="field__label">
							{kind === "match" ? "Kick-off" : "Time"} <span className="muted">(optional)</span>
						</span>
						<TimeField label="Time" value={draft.time} onChange={(time) => set({ time })} />
					</div>
				</div>
				<div className="field-grid">
					<TeamField value={draft.team} onChange={(team) => set({ team })} />
					<label className="field">
						<span className="field__label">
							Location <span className="muted">(optional)</span>
						</span>
						<input
							className="field__input"
							value={draft.location}
							maxLength={120}
							placeholder={kind === "match" && draft.away ? "Their ground" : "Pitch 2, Riverside Park"}
							onChange={(e) => set({ location: e.target.value })}
						/>
					</label>
				</div>
				<div className="field">
					<span className="field__label">Colour</span>
					<ColorSwatches
						label="Colour"
						value={draft.color}
						defaultColor={preferences.calendarColors[kind] || KIND_COLORS[kind]}
						defaultLabel={`The usual for ${kind === "session" ? "practices" : kind === "match" ? "matches" : "events"}`}
						onChange={(color) => set({ color })}
					/>
				</div>
				{!entry.isNew && kind === "session" && (
					<div className="field">
						<span className="field__label">Status</span>
						<div className="segmented" role="radiogroup" aria-label="Status">
							{(past ? (["done", "cancelled"] as const) : (["planned", "done", "cancelled"] as const)).map((st) => (
								<button
									key={st}
									type="button"
									role="radio"
									aria-checked={draft.status === st}
									className={`segmented__item${draft.status === st ? " is-active" : ""}`}
									onClick={() => set({ status: st })}
								>
									{st === "planned" ? "Planned" : st === "done" ? "Done" : "Cancelled"}
								</button>
							))}
						</div>
					</div>
				)}
				<label className="field">
					<span className="field__label">
						{kind === "match" && past ? "Result and notes" : kind === "session" && draft.status === "done" ? "How did it go?" : "Notes"}{" "}
						<span className="muted">(optional)</span>
					</span>
					<textarea
						className="field__input field__input--area item-notes"
						rows={1}
						maxLength={4000}
						value={draft.log}
						onChange={(e) => set({ log: e.target.value })}
					/>
				</label>
				{date && (
					<p className="muted small">
						{date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} ({describeDay(draft.date)})
					</p>
				)}
				<div className="dialog__actions">
					{!entry.isNew && (
						<>
							<button type="button" className="button button--danger-text" onClick={onRemove}>
								Remove
							</button>
							{session && (
								<button type="button" className="button" onClick={() => onPreviewSession(session.id)}>
									Preview session
								</button>
							)}
							<span className="topbar__spacer" />
						</>
					)}
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" {...(!entry.isNew ? { "data-autofocus": "" } : {})}>
						{entry.isNew ? "Add" : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
