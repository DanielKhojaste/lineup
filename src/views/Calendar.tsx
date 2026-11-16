import { isSport, SPORT_INFO, SPORTS } from "../model/sports";
import { SURFACES } from "../components/board/Pitch";
import { PointerEvent as ReactPointerEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import PlanToCalendarDialog from "../components/plan/PlanToCalendarDialog";
import { ContextMenuEntry, useContextMenu } from "../components/ui/ContextMenu";
import { ConfirmDialog, Modal } from "../components/ui/Dialog";
import EventDialog from "../components/calendar/EventDialog";
import SeasonTimeline, { newSeason, SeasonDialog } from "../components/calendar/SeasonTimeline";
import {
	addDays,
	CalendarEntry,
	createEntry,
	createEvent,
	eventTitle,
	Season,
	seasonFor,
	describeDay,
	EntryStatus,
	monthGrid,
	startOfWeek,
	parseISODate,
	sortEntries,
	statusOf,
	toISODate,
	WEEKDAYS,
} from "../model/calendar";
import { Plan } from "../model/plan";
import { formatMinutes, Session, sessionBoardIds, sessionTitle, totalMinutes } from "../model/session";
import { Board } from "../model/types";
import BoardPreview from "../components/board/BoardPreview";
import SessionPicker from "../components/session/SessionPicker";
import { useLibrary } from "../state/LibraryContext";

/** Each team gets its own colour, picked from its name. */
const TEAM_COLORS = ["#2F80ED", "#E2552B", "#27AE60", "#9B51E0", "#F2994A", "#EB5757", "#2BB5A8", "#C2A100"];
function teamColor(team: string): string {
	if (!team) return "var(--accent)";
	let h = 0;
	for (const ch of team) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return TEAM_COLORS[h % TEAM_COLORS.length];
}

const STATUS_LABEL: Record<EntryStatus, string> = {
	planned: "Planned",
	done: "Done",
	cancelled: "Cancelled",
};

/** Add a session to a day (or edit an entry already on the calendar). */
function EntryDialog({
	entry,
	sessions,
	onSave,
	onRemove,
	onOpenSession,
	onClose,
	sportFilter,
}: {
	/** The calendar's sport filter: the picker starts on it. */
	sportFilter: string;
	/** A new entry (not on the calendar yet) or an existing one. */
	entry: CalendarEntry & { isNew?: boolean };
	sessions: Session[];
	onSave: (entry: CalendarEntry) => void;
	onRemove: () => void;
	onOpenSession: (id: string) => void;
	onClose: () => void;
}) {
	// A past session shows as done (it ran), unless it was cancelled.
	const [draft, setDraft] = useState({ ...entry, status: statusOf(entry) });
	const set = (patch: Partial<CalendarEntry>) => setDraft((d) => ({ ...d, ...patch }));
	const session = sessions.find((s) => s.id === draft.sessionId);
	const library = useLibrary();
	// Adding a session: the picker opens straight away.
	const [picking, setPicking] = useState(entry.isNew && !entry.sessionId);
	const date = parseISODate(draft.date);

	// One window at a time: the picker replaces this window while it's open.
	if (picking)
		return (
			<SessionPicker
				initialSport={isSport(sportFilter) ? sportFilter : "all"}
				onPick={(picked) => {
					set({
						sessionId: picked.id,
						team: draft.team || picked.header.team || "",
						time: draft.time ?? null,
					});
					setPicking(false);
				}}
				// Closing the picker before choosing anything cancels adding.
				onClose={() => (draft.sessionId ? setPicking(false) : onClose())}
			/>
		);

	return (
		<Modal
			open
			title={entry.isNew ? "Add a session" : session?.meta.title ?? "Session"}
			onClose={onClose}
		>
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					if (!draft.sessionId) return;
					const { isNew: _, ...clean } = draft;
					onSave(clean);
					onClose();
				}}
			>
				<div className="field">
					<span className="field__label">Session</span>
					{session ? (
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
								<b>{sessionTitle(session)}</b>
								<span className="muted small">
									{[
										session.header.team,
										totalMinutes(session) ? formatMinutes(totalMinutes(session)) : "",
										session.header.topics.join(", "),
									]
										.filter(Boolean)
										.join(" · ")}
								</span>
							</span>
							<button type="button" className="button button--small" onClick={() => setPicking(true)}>
								Change…
							</button>
						</div>
					) : (
						<button
							type="button"
							className="button picked-session__choose"
							data-autofocus=""
							onClick={() => setPicking(true)}
						>
							<Icon name="session" size={16} />
							{draft.sessionId ? "This session was deleted. Choose another…" : "Choose a session…"}
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
					<label className="field">
						<span className="field__label">
							Time <span className="muted">(optional)</span>
						</span>
						<input
							className="field__input"
							type="time"
							value={draft.time ?? ""}
							onChange={(e) => set({ time: e.target.value || null })}
						/>
					</label>
				</div>
				<label className="field">
					<span className="field__label">Team</span>
					<input
						className="field__input"
						value={draft.team}
						maxLength={120}
						placeholder="U12 Girls"
						onChange={(e) => set({ team: e.target.value })}
					/>
				</label>
				{!entry.isNew && (
					<>
						<div className="field">
							<span className="field__label">Status</span>
							<div className="segmented" role="radiogroup" aria-label="Status">
								{(draft.date < toISODate(new Date())
									? (["done", "cancelled"] as const)
									: (["planned", "done", "cancelled"] as const)
								).map((s) => (
									<button
										key={s}
										type="button"
										role="radio"
										aria-checked={draft.status === s}
										className={`segmented__item${draft.status === s ? " is-active" : ""}`}
										onClick={() => set({ status: s })}
									>
										{STATUS_LABEL[s]}
									</button>
								))}
							</div>
						</div>
						<label className="field">
							<span className="field__label">
								{draft.status === "done" ? "How did it go?" : "Notes"}
							</span>
							<textarea
								className="field__input field__input--area"
								rows={3}
								maxLength={4000}
								placeholder={
									draft.status === "done"
										? "Who was there, what worked, what to change next time…"
										: "Anything to remember for this date"
								}
								value={draft.log}
								onChange={(e) => set({ log: e.target.value })}
							/>
						</label>
					</>
				)}
				{date && (
					<p className="muted small">
						{date.toLocaleDateString(undefined, {
							weekday: "long",
							day: "numeric",
							month: "long",
						})}{" "}
						({describeDay(draft.date)})
					</p>
				)}
				<div className="dialog__actions">
					{!entry.isNew && (
						<>
							<button type="button" className="button button--danger-text" onClick={onRemove}>
								Remove
							</button>
							{session && (
								<button
									type="button"
									className="button"
									onClick={() => onOpenSession(session.id)}
								>
									Preview session
								</button>
							)}
							<span className="topbar__spacer" />
						</>
					)}
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={!draft.sessionId}>
						{entry.isNew ? "Add" : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

/** Pick a plan to lay out on the calendar. */
function PickPlanDialog({
	plans,
	onPick,
	onClose,
}: {
	plans: Plan[];
	onPick: (plan: Plan) => void;
	onClose: () => void;
}) {
	return (
		<Modal open title="Add a plan to the calendar" onClose={onClose}>
			<div className="dialog__section">
				{plans.length === 0 ? (
					<p className="muted">No plans yet. Make one in the library under Plans.</p>
				) : (
					<ul className="pick-list">
						{plans.map((p) => (
							<li key={p.id}>
								<button type="button" className="pick-list__item" onClick={() => onPick(p)}>
									<strong>{p.meta.title}</strong>
									<span className="muted small">
										{[p.team, `${p.topics.length} topics`, `${p.topics.reduce((n, t) => n + t.sessionIds.length, 0)} sessions`]
											.filter(Boolean)
											.join(" · ")}
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</Modal>
	);
}

const MODE_KEY = "lineup.calendarMode";


/** "16 – 22 Nov 2026", or "30 Nov – 6 Dec 2026" across two months. */
/**
 * In the week view there's room to show what a session is: its team and
 * minutes, its first three drills with their pictures, and its topics.
 */
function WeekEntryDetails({ entry }: { entry: CalendarEntry }) {
	const library = useLibrary();
	const session = library.getSession(entry.sessionId);
	if (!session) return null;
	const drills = session.blocks.filter((b): b is Extract<typeof b, { kind: "drill" }> => b.kind === "drill");
	const minutes = totalMinutes(session);
	const meta = [entry.team || session.header.team, minutes ? formatMinutes(minutes) : ""].filter(Boolean).join(" · ");
	return (
		<>
			{meta && <span className="calendar__entry-meta">{meta}</span>}
			{drills.length > 0 && (
				<span className="calendar__drills">
					{drills.slice(0, 3).map((d) => {
						const board = library.getBoard(d.boardId);
						return (
							<span key={d.id} className="calendar__drill">
								{board ? (
									<BoardPreview board={board} className="calendar__drill-thumb" />
								) : (
									<span className="calendar__drill-thumb" />
								)}
								<span className="calendar__drill-name">{board?.meta.title ?? "Deleted board"}</span>
							</span>
						);
					})}
					{drills.length > 3 && <span className="calendar__more">+{drills.length - 3} more</span>}
				</span>
			)}
			{session.header.topics.length > 0 && (
				<span className="calendar__topics">
					{/* The first two topics added; the rest are in the session. */}
					{session.header.topics.slice(0, 2).map((t) => (
						<span key={t} className="calendar__topic">
							{t}
						</span>
					))}
				</span>
			)}
		</>
	);
}

function weekTitle(first: Date, last: Date): string {
	const mon = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
	const start = first.getMonth() === last.getMonth() ? `${first.getDate()}` : `${first.getDate()} ${mon(first)}`;
	return `${start} – ${last.getDate()} ${mon(last)} ${last.getFullYear()}`;
}

export default function Calendar() {
	const library = useLibrary();
	const navigate = useNavigate();
	const { openMenu } = useContextMenu();
	const jumpTo = (useLocation().state as { date?: string } | null)?.date;
	const today = toISODate(new Date());
	// The day the calendar is showing (its month, or its week).
	const [focus, setFocus] = useState<Date>(() => (jumpTo && parseISODate(jumpTo)) || new Date());
	const [mode, setModeState] = useState<"month" | "week">(() => {
		try {
			return localStorage.getItem(MODE_KEY) === "week" ? "week" : "month";
		} catch {
			return "month";
		}
	});
	const setMode = (next: "month" | "week") => {
		setModeState(next);
		try {
			localStorage.setItem(MODE_KEY, next);
		} catch {
			// Only remembered while the app is open.
		}
	};
	const month = { year: focus.getFullYear(), month: focus.getMonth() };
	const [team, setTeam] = useState<string>("all");
	const [editing, setEditing] = useState<(CalendarEntry & { isNew?: boolean }) | null>(null);
	const [removing, setRemoving] = useState<CalendarEntry | null>(null);
	const [pickPlan, setPickPlan] = useState(false);
	const [layingOut, setLayingOut] = useState<Plan | null>(null);
	const [dropDate, setDropDate] = useState<string | null>(null);
	const [editingSeason, setEditingSeason] = useState<{ season: Season; isNew: boolean } | null>(null);

	const days =
		mode === "month"
			? monthGrid(month.year, month.month)
			: Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(focus), i));
	const teams = useMemo(
		() => [...new Set(library.calendar.map((e) => e.team).filter(Boolean))].sort(),
		[library.calendar],
	);
	// Several sports on one calendar: each session shows its sport's colour,
	// and the sports can be shown one at a time.
	const sportOf = (e: CalendarEntry) => library.getSession(e.sessionId)?.header.sport;
	const sports = SPORTS.filter((sp) => library.calendar.some((e) => sportOf(e) === sp));
	const [sport, setSport] = useState<string>("all");
	// Matches and events have no sport: they stay whatever sport is shown.
	const entries = library.calendar.filter(
		(e) =>
			(team === "all" || e.team === team) &&
			(sport === "all" || e.kind !== "session" || sportOf(e) === sport),
	);
	const byDay = useMemo(() => {
		const map = new Map<string, CalendarEntry[]>();
		for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
		return map;
	}, [entries]);
	const upcoming = sortEntries(entries.filter((e) => e.date >= today && statusOf(e, today) === "planned")).slice(0, 6);
	const recent = sortEntries(
		entries.filter((e) => e.kind === "session" && statusOf(e, today) === "done" && e.date <= today),
	)
		.reverse()
		.slice(0, 6);
	const title =
		mode === "month"
			? new Date(month.year, month.month, 1).toLocaleDateString(undefined, {
					month: "long",
					year: "numeric",
				})
			: weekTitle(days[0], days[6]);
	const shift = (by: number) =>
		setFocus((d) =>
			mode === "month" ? new Date(d.getFullYear(), d.getMonth() + by, 1) : addDays(d, 7 * by),
		);

	const editSession = (id: string) => navigate(`/session/${id}`, { state: { from: "/calendar" } });
	/** A session opens to its preview; one without drills has nothing to show, so it opens to edit. */
	const openSession = (id: string) =>
		library.getSession(id)?.blocks.some((b) => b.kind === "drill")
			? navigate(`/session/${id}/preview`, { state: { back: "/calendar", from: "/calendar" } })
			: editSession(id);
	const sessionTitle = (id: string) => library.getSession(id)?.meta.title ?? "Deleted session";
	/** What an entry is called: its session's title, "vs Riverside", or the event's name. */
	const entryTitle = (e: CalendarEntry) => (e.kind === "session" ? sessionTitle(e.sessionId) : eventTitle(e));
	const newEntry = (date: string) =>
		setEditing({ ...createEntry("", date, { team: team === "all" ? "" : team }), isNew: true });
	const newEvent = (kind: "match" | "event", date: string) =>
		setEditing({ ...createEvent(kind, date, "", { team: team === "all" ? "" : team }), isNew: true });
	/** Clicking an entry: in the week view a session opens its preview; otherwise its details. */
	const openEntry = (entry: CalendarEntry) => {
		if (mode === "week" && entry.kind === "session" && library.getSession(entry.sessionId))
			openSession(entry.sessionId);
		else setEditing(entry);
	};
	const season = seasonFor(library.seasons, toISODate(focus));

	/** Drag an entry onto another day to move it. */
	const startDrag = (e: ReactPointerEvent, entry: CalendarEntry) => {
		if (e.button !== 0) return;
		const start = { x: e.clientX, y: e.clientY };
		let dragging = false;
		const dayAt = (ev: PointerEvent) =>
			document
				.elementFromPoint(ev.clientX, ev.clientY)
				?.closest<HTMLElement>("[data-date]")?.dataset.date ?? null;
		const move = (ev: PointerEvent) => {
			if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 5) return;
			dragging = true;
			setDropDate(dayAt(ev));
		};
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			setDropDate(null);
			if (!dragging) {
				// The week view shows the session's drills: a click opens its preview.
				// The month view opens the date's details (date, team, status).
				openEntry(entry);
				return;
			}
			const date = dayAt(ev);
			if (date && date !== entry.date) void library.updateEntry(entry.id, { date });
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
	};

	const entryMenu = (entry: CalendarEntry): ContextMenuEntry[] => [
		{ label: "Edit…", onSelect: () => setEditing(entry) },
		...(entry.kind === "session"
			? ([
					{ label: "Preview session", disabled: !library.getSession(entry.sessionId), onSelect: () => openSession(entry.sessionId) },
					{ label: "Edit session", disabled: !library.getSession(entry.sessionId), onSelect: () => editSession(entry.sessionId) },
					"separator",
					// A session whose date has passed has run (or was cancelled): it can't be planned any more.
					...(entry.date < toISODate(new Date())
						? (["done", "cancelled"] as const)
						: (["planned", "done", "cancelled"] as const)
					).map((s) => ({
						label: s === "done" ? "Mark as done" : s === "cancelled" ? "Mark as cancelled" : "Mark as planned",
						checked: statusOf(entry) === s,
						onSelect: () => library.updateEntry(entry.id, { status: s }),
					})),
				] as ContextMenuEntry[])
			: [
					{
						label: entry.kind === "match" ? "Mark as cancelled or postponed" : "Mark as cancelled",
						checked: entry.status === "cancelled",
						onSelect: () =>
							library.updateEntry(entry.id, { status: entry.status === "cancelled" ? "planned" : "cancelled" }),
					},
				]),
		"separator",
		{
			label: "Copy to next week",
			onSelect: () =>
				library.addEntries([
					{
						...entry,
						id: createEntry("", "").id,
						date: toISODate(addDays(parseISODate(entry.date)!, 7)),
						status: "planned",
						log: "",
					},
				]),
		},
		"separator",
		{ label: "Remove from calendar", danger: true, onSelect: () => setRemoving(entry) },
	];

	const listItem = (e: CalendarEntry) => (
		<li key={e.id}>
			<button type="button" className="agenda__item" onClick={() => setEditing(e)}>
				<span className={`agenda__dot agenda__dot--${e.kind}`} />
				<span className="agenda__text">
					<span className="agenda__title">{entryTitle(e)}</span>
					<span className="muted small">
						{[describeDay(e.date), e.time, e.team].filter(Boolean).join(" · ")}
					</span>
				</span>
			</button>
		</li>
	);

	return (
		<div className="calendar-view">
			<header className="topbar">
				<button type="button" className="back-button" onClick={() => navigate("/")}>
					<Icon name="chevronLeft" size={16} />
					Library
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<h1 className="calendar-view__title">Calendar</h1>
				<span className="topbar__spacer" />
				{teams.length > 0 && (
					<label className="sort">
						<span className="muted">Team</span>
						<select className="field__input" value={team} onChange={(e) => setTeam(e.target.value)}>
							<option value="all">All teams</option>
							{teams.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</label>
				)}
				{sports.length > 1 && (
					<label className="sort">
						<span className="muted">Sport</span>
						<select className="field__input" value={sport} onChange={(e) => setSport(e.target.value)}>
							<option value="all">All sports</option>
							{sports.map((sp) => (
								<option key={sp} value={sp}>
									{SPORT_INFO[sp].name}
								</option>
							))}
						</select>
					</label>
				)}
				<button type="button" className="button" onClick={() => setPickPlan(true)}>
					<Icon name="plan" size={16} />
					Add a plan
				</button>
				<button type="button" className="button" onClick={() => newEvent("match", today)}>
					<Icon name="flag" size={16} />
					Add a match
				</button>
				<button type="button" className="button button--primary" onClick={() => newEntry(today)}>
					<Icon name="plus" size={16} />
					Add session
				</button>
			</header>

			<SeasonTimeline
				season={season}
				today={today}
				view={{ start: toISODate(days[0]), end: toISODate(days[days.length - 1]) }}
				onJump={(date) => setFocus(parseISODate(date)!)}
				onEdit={() => season && setEditingSeason({ season, isNew: false })}
				onNew={() => setEditingSeason({ season: newSeason(library.seasons), isNew: true })}
			/>
			<div className="calendar-view__body">
				<main className="calendar">
					<div className="calendar__head">
						<button type="button" className="icon-button" aria-label={mode === "month" ? "Previous month" : "Previous week"} onClick={() => shift(-1)}>
							<Icon name="chevronLeft" size={18} />
						</button>
						<h2>{title}</h2>
						<button type="button" className="icon-button" aria-label={mode === "month" ? "Next month" : "Next week"} onClick={() => shift(1)}>
							<Icon name="chevronRight" size={18} />
						</button>
						<button
							type="button"
							className="button button--small"
							onClick={() => {
								setFocus(new Date());
							}}
						>
							Today
						</button>
						<span className="topbar__spacer" />
						<div className="segmented" role="radiogroup" aria-label="Show">
							{(["month", "week"] as const).map((m) => (
								<button
									key={m}
									type="button"
									role="radio"
									aria-checked={mode === m}
									className={`segmented__item${mode === m ? " is-active" : ""}`}
									onClick={() => setMode(m)}
								>
									{m === "month" ? "Month" : "Week"}
								</button>
							))}
						</div>
					</div>
					<div className={`calendar__grid calendar__grid--${mode}`} role="grid" aria-label={title}>
						{WEEKDAYS.map((d) => (
							<div key={d} className="calendar__weekday" role="columnheader">
								{d}
							</div>
						))}
						{days.map((day) => {
							const iso = toISODate(day);
							const list = byDay.get(iso) ?? [];
							const outside = mode === "month" && day.getMonth() !== month.month;
							return (
								<div
									key={iso}
									role="gridcell"
									data-date={iso}
									className={`calendar__day${outside ? " is-outside" : ""}${iso === today ? " is-today" : ""}${dropDate === iso ? " is-drop" : ""}`}
									onClick={(e) => {
										if (e.target === e.currentTarget || (e.target as Element).classList.contains("calendar__date"))
											newEntry(iso);
									}}
									onContextMenu={(e) => {
										if ((e.target as Element).closest(".calendar__entry")) return;
										openMenu(e, [
											{ label: "Add a session here…", onSelect: () => newEntry(iso) },
											{ label: "Add a match here…", onSelect: () => newEvent("match", iso) },
											{ label: "Add an event here…", onSelect: () => newEvent("event", iso) },
											"separator",
											{ label: "Add a plan…", onSelect: () => setPickPlan(true) },
										]);
									}}
								>
									<span className="calendar__date">{day.getDate()}</span>
									{list.map((e) => (
										<button
											key={e.id}
											type="button"
											className={`calendar__entry calendar__entry--${e.kind}${
												e.kind === "session"
													? ` calendar__entry--${statusOf(e, today)}`
													: e.status === "cancelled"
														? " calendar__entry--cancelled"
														: ""
											}`}
											data-past={e.kind !== "session" && e.date < today ? "" : undefined}
											// With several teams, each team's colour runs down the side.
											style={teams.length > 1 ? { boxShadow: `inset 3px 0 0 ${teamColor(e.team)}` } : undefined}
											title={[
												[
													entryTitle(e),
													e.team,
													e.kind === "session"
														? STATUS_LABEL[statusOf(e, today)]
														: e.status === "cancelled"
															? "Cancelled"
															: e.kind === "match"
																? e.away ? "Away" : "Home"
																: "",
												]
													.filter(Boolean)
													.join(" · "),
												mode === "week" && e.kind === "session" ? "Click to preview, right-click to edit" : "",
											]
												.filter(Boolean)
												.join("\n")}
											onPointerDown={(ev) => startDrag(ev, e)}
											onKeyDown={(ev) => {
												if (ev.key === "Enter" || ev.key === " ") {
													ev.preventDefault();
													openEntry(e);
												}
											}}
											onContextMenu={(ev) => openMenu(ev, entryMenu(e))}
										>
											{e.kind === "match" ? (
												<Icon name="flag" size={12} className="calendar__kind" />
											) : e.kind === "event" ? (
												<Icon name="star" size={12} className="calendar__kind" />
											) : statusOf(e, today) === "done" ? (
												<Icon name="check" size={12} className="calendar__kind" />
											) : statusOf(e, today) === "planned" ? (
												<span className="calendar__dot" aria-hidden="true" />
											) : null}
											{sports.length > 1 && sportOf(e) && (
												<span
													className="sport-swatch"
													style={{ background: SURFACES[sportOf(e)!].floor }}
													title={SPORT_INFO[sportOf(e)!].name}
												/>
											)}
											{e.time && <span className="calendar__time mono">{e.time}</span>}
											<span className="calendar__entry-title">{entryTitle(e)}</span>
											{mode === "week" &&
												(e.kind === "session" ? (
													<WeekEntryDetails entry={e} />
												) : (
													<span className="calendar__entry-meta">
														{[e.kind === "match" ? (e.away ? "Away" : "Home") : "", e.team].filter(Boolean).join(" · ")}
													</span>
												))}
										</button>
									))}
								</div>
							);
						})}
					</div>
					<div className="calendar__legend" aria-label="Key">
						<span>
							<span className="calendar__swatch calendar__swatch--planned" />
							Training · planned
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--done" />
							<Icon name="check" size={12} /> Ran
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--match" />
							Match
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--event" />
							Event
						</span>
					</div>
				</main>
				<aside className="agenda" aria-label="Coming up and recently run">
					<h2>Coming up</h2>
					{upcoming.length ? (
						<ul>{upcoming.map(listItem)}</ul>
					) : (
						<p className="muted small">Nothing planned. Add a session, a plan or a match.</p>
					)}
					<h2>Recently run</h2>
					{recent.length ? (
						<ul>{recent.map(listItem)}</ul>
					) : (
						<p className="muted small">Sessions you mark as done show up here, with your notes.</p>
					)}
				</aside>
			</div>

			{editing && editing.kind !== "session" && (
				<EventDialog
					key={editing.id}
					entry={editing}
					onClose={() => setEditing(null)}
					onSave={(entry) =>
						editing.isNew ? library.addEntries([entry]) : library.updateEntry(entry.id, entry)
					}
					onRemove={() => {
						setRemoving(editing);
						setEditing(null);
					}}
				/>
			)}
			{editingSeason && (
				<SeasonDialog
					season={editingSeason.season}
					isNew={editingSeason.isNew}
					onClose={() => setEditingSeason(null)}
					onSave={(saved) => {
						const others = library.seasons.filter((x) => x.id !== saved.id);
						void library.saveSeasons([...others, saved]);
						if (editingSeason.isNew) setFocus(parseISODate(saved.start)! > new Date() ? parseISODate(saved.start)! : new Date());
					}}
					onDelete={() => {
						void library.saveSeasons(library.seasons.filter((x) => x.id !== editingSeason.season.id));
						setEditingSeason(null);
					}}
				/>
			)}
			{editing && editing.kind === "session" && (
				<EntryDialog
					key={editing.id}
					sportFilter={sport}
					entry={editing}
					sessions={library.sessions}
					onClose={() => setEditing(null)}
					onSave={(entry) =>
						editing.isNew ? library.addEntries([entry]) : library.updateEntry(entry.id, entry)
					}
					onRemove={() => {
						setRemoving(editing);
						setEditing(null);
					}}
					onOpenSession={openSession}
				/>
			)}
			<ConfirmDialog
				open={removing !== null}
				title="Remove from calendar"
				message={`Take “${removing ? entryTitle(removing) : ""}” off ${removing ? describeDay(removing.date) : ""}?${removing?.kind === "session" ? " The session stays in your library." : ""}`}
				confirmLabel="Remove"
				danger
				onConfirm={() => removing && library.removeEntries([removing.id])}
				onClose={() => setRemoving(null)}
			/>
			{pickPlan && (
				<PickPlanDialog
					plans={library.plans}
					onClose={() => setPickPlan(false)}
					onPick={(p) => {
						setPickPlan(false);
						setLayingOut(p);
					}}
				/>
			)}
			{layingOut && (
				<PlanToCalendarDialog
					plan={layingOut}
					open
					onClose={() => setLayingOut(null)}
					onConfirm={async (list, first) => {
						await library.addEntries(list);
						setFocus(parseISODate(first)!);
					}}
				/>
			)}
		</div>
	);
}
