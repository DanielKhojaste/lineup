import { isSport, SPORT_INFO, SPORTS } from "../model/sports";
import TeamField from "../components/ui/TeamField";
import TimeField from "../components/ui/TimeField";
import { SURFACES } from "../components/board/Pitch";
import React, { PointerEvent as ReactPointerEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import PlanToCalendarDialog from "../components/plan/PlanToCalendarDialog";
import { ContextMenuEntry, useContextMenu } from "../components/ui/ContextMenu";
import { ConfirmDialog, Modal } from "../components/ui/Dialog";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import { showTime, uses12Hours } from "../components/ui/TimeCombo";
import ShowAllDialog from "../components/ui/ShowAllDialog";
import ItemDialog from "../components/calendar/ItemDialog";
import ColorSwatches from "../components/calendar/ColorSwatches";
import { usePreferences } from "../state/preferences";
import {
	addDays,
	CalendarEntry,
	entryColor,
	KIND_COLORS,
	createEntry,
	createEvent,
	eventTitle,
	describeDay,
	EntryStatus,
	monthGrid,
	startOfWeek,
	parseISODate,
	sortEntries,
	longDay,
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
	const preferences = usePreferences();
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
					<div className="field">
						<span className="field__label">
							Time <span className="muted">(optional)</span>
						</span>
						<TimeField label="Time" value={draft.time} onChange={(time) => set({ time })} />
					</div>
				</div>
				<TeamField value={draft.team} onChange={(team) => set({ team })} />
				<label className="field">
					<span className="field__label">
						Location <span className="muted">(optional)</span>
					</span>
					<input
						className="field__input"
						value={draft.location}
						maxLength={120}
						placeholder={"Pitch 2, Riverside Park"}
						onChange={(e) => set({ location: e.target.value })}
					/>
				</label>
				<div className="field">
					<span className="field__label">Colour</span>
					<ColorSwatches
						label="Colour"
						value={draft.color}
						defaultColor={preferences.calendarColors.session || KIND_COLORS.session}
						defaultLabel="The usual for practices"
						onChange={(color) => set({ color })}
					/>
				</div>
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
					<button
						type="submit"
						className="button button--primary"
						disabled={!draft.sessionId}
						// Opening a practice focuses Save, not the date (which would select its day).
						{...(!entry.isNew ? { "data-autofocus": "" } : {})}
					>
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
	const meta = [entry.team || session.header.team, minutes ? formatMinutes(minutes) : "", entry.location].filter(Boolean).join(" · ");
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

/**
 * What's on a calendar item: a small PRACTICE / MATCH / EVENT label with the
 * time, and the name under it (a named practice also says which session).
 */
function EntryCard({ entry, title, done }: { entry: CalendarEntry; title: string; done: boolean }) {
	const library = useLibrary();
	const kind = entry.kind === "session" ? "Practice" : entry.kind === "match" ? "Match" : "Event";
	const session =
		entry.kind === "session" && entry.label.trim() ? library.getSession(entry.sessionId)?.meta.title : undefined;
	return (
		<span className="entry-card entry-card--tag">
			<span className="entry-card__kind">
				{done && <Icon name="check" size={10} />}
				{kind}
				{entry.kind === "match" && <span> · {entry.away ? "Away" : "Home"}</span>}
				{entry.time && <span className="mono"> · {showTime(entry.time, uses12Hours())}</span>}
			</span>
			<span className="calendar__entry-title">{title}</span>
			{session && <span className="entry-card__session">{session}</span>}
		</span>
	);
}

function weekTitle(first: Date, last: Date): string {
	const mon = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
	const start = first.getMonth() === last.getMonth() ? `${first.getDate()}` : `${first.getDate()} ${mon(first)}`;
	return `${start} – ${last.getDate()} ${mon(last)} ${last.getFullYear()}`;
}

export default function Calendar() {
	const library = useLibrary();
	const { calendarColors } = usePreferences();
	/** The colour an item is drawn in, as a CSS custom property (none: its kind's default in CSS). */
	const colorStyle = (e: CalendarEntry) => {
		const c = entryColor(e, calendarColors);
		return c ? ({ "--entry-kind": c } as React.CSSProperties) : undefined;
	};
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

	const days =
		mode === "month"
			? monthGrid(month.year, month.month)
			: Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(focus), i));
	const teams = useMemo(
		() => [...new Set(library.calendar.map((e) => e.team).filter(Boolean))].sort(),
		[library.calendar],
	);
	// With many teams the filter lists the most used ten, then "Show all teams…".
	const TEAM_LIMIT = 10;
	const topTeams = useMemo(() => {
		const uses = new Map<string, number>();
		for (const e of library.calendar) if (e.team) uses.set(e.team, (uses.get(e.team) ?? 0) + 1);
		const top = [...uses.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, TEAM_LIMIT)
			.map(([t]) => t);
		return top.sort((a, b) => a.localeCompare(b));
	}, [library.calendar]);
	const [showAllTeams, setShowAllTeams] = useState(false);
	// How many items a day shows in the month view before "+N more".
	const DAY_LIMIT = 4;
	const [showDay, setShowDay] = useState<string | null>(null);
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
	const upcoming = sortEntries(entries.filter((e) => e.date >= today && statusOf(e, today) === "planned")).slice(0, 1);
	// The sidebar's month: the one shown (in the week view, the week's month).
	const monthPrefix = `${month.year}-${String(month.month + 1).padStart(2, "0")}-`;
	const inMonth = entries.filter((e) => e.date.startsWith(monthPrefix));
	const isThisMonth = today.startsWith(monthPrefix);
	const monthName = new Date(month.year, month.month, 1).toLocaleDateString(undefined, { month: "long" });
	const monthCounts = (["session", "match", "event"] as const).map((k) => ({
		kind: k,
		count: inMonth.filter((e) => e.kind === k).length,
	}));
	// Topics of the sessions on the calendar this month, the most used first.
	const monthTopics = useMemo(() => {
		const uses = new Map<string, number>();
		for (const e of inMonth) {
			const topics = library.getSession(e.sessionId)?.header.topics ?? [];
			for (const t of topics) uses.set(t, (uses.get(t) ?? 0) + 1);
		}
		return [...uses.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inMonth.map((e) => e.id + e.sessionId).join(), library.sessions]);
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
	const entryTitle = (e: CalendarEntry) =>
		e.kind === "session"
			? e.label.trim() || library.getSession(e.sessionId)?.meta.title || "Practice"
			: eventTitle(e);
	// "Type above" was picked (updates-302).
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
						<select
							className="field__input"
							value={team}
							onChange={(e) => (e.target.value === "__show-all" ? setShowAllTeams(true) : setTeam(e.target.value))}
						>
							<option value="all">All teams</option>
							{(teams.length > TEAM_LIMIT
								? [...new Set([...topTeams, ...(team !== "all" ? [team] : [])])]
								: teams
							).map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
							{teams.length > TEAM_LIMIT && <option value="__show-all">Show all {teams.length} teams…</option>}
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
					Add a practice
				</button>
			</header>

			{/* The season timeline is kept on the archive/season-timeline branch for now. */}
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
							const all = sortEntries(byDay.get(iso) ?? []);
							// A busy day shows the first few and "+N more", which lists the whole day.
							const list =
								mode === "month" && all.length > DAY_LIMIT ? all.slice(0, DAY_LIMIT - 1) : all;
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
											{ label: "Add a practice here…", onSelect: () => newEntry(iso) },
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
											style={colorStyle(e)}
											title={[
												[
													entryTitle(e),
													e.team,
													e.location,
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
											{sports.length > 1 && sportOf(e) && (
												<span
													className="sport-swatch"
													style={{ background: SURFACES[sportOf(e)!].floor }}
													title={SPORT_INFO[sportOf(e)!].name}
												/>
											)}
											<EntryCard entry={e} title={entryTitle(e)} done={e.kind === "session" && statusOf(e, today) === "done"} />
											{mode === "week" &&
												(e.kind === "session" && library.getSession(e.sessionId) ? (
													<WeekEntryDetails entry={e} />
												) : (
													<span className="calendar__entry-meta">
														{[
															e.kind === "match" ? (e.away ? "Away" : "Home") : "",
															e.kind === "match" && library.getBoard(e.boardId) ? "Formation" : "",
															e.kind !== "session" && library.getSession(e.sessionId) ? library.getSession(e.sessionId)!.meta.title : "",
															e.team,
															e.location,
														]
															.filter(Boolean)
															.join(" · ")}
													</span>
												))}
										</button>
									))}
									{list.length < all.length && (
										<button
											type="button"
											className="calendar__day-more"
											onClick={() => setShowDay(iso)}
											title="Show everything on this day"
										>
											+{all.length - list.length} more
										</button>
									)}
								</div>
							);
						})}
					</div>
					<div className="calendar__legend" aria-label="Key">
						<span>
							<span className="calendar__swatch calendar__swatch--planned" style={calendarColors.session || KIND_COLORS.session ? ({ "--entry-kind": calendarColors.session || KIND_COLORS.session } as React.CSSProperties) : undefined} />
							Practice · planned
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--done" />
							<Icon name="check" size={12} /> Ran
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--match" style={calendarColors.match || KIND_COLORS.match ? ({ "--entry-kind": calendarColors.match || KIND_COLORS.match } as React.CSSProperties) : undefined} />
							Match
						</span>
						<span>
							<span className="calendar__swatch calendar__swatch--event" style={calendarColors.event || KIND_COLORS.event ? ({ "--entry-kind": calendarColors.event || KIND_COLORS.event } as React.CSSProperties) : undefined} />
							Event
						</span>
					</div>
				</main>
				<CalendarSidebar
					next={upcoming[0]}
					title={entryTitle}
					getSession={library.getSession}
					getBoard={library.getBoard}
					onOpen={setEditing}
					onPreview={openSession}
					onEdit={editSession}
					monthName={monthName}
					isThisMonth={isThisMonth}
					counts={monthCounts}
					topics={monthTopics}
					monthHasSessions={inMonth.some((e) => e.sessionId)}
				/>
			</div>

			{showDay && (
				<ShowAllDialog
					title={longDay(showDay)}
					items={sortEntries(byDay.get(showDay) ?? [])}
					itemKey={(e) => e.id}
					itemText={(e) => [entryTitle(e), e.team, e.location].join(" ")}
					searchPlaceholder="Search this day"
					empty="Nothing on this day."
					renderItem={(e) => (
						<span className={`show-all__entry show-all__entry--${e.kind}`} style={colorStyle(e)}>
							<span className="show-all__time mono">{e.time ? showTime(e.time, uses12Hours()) : "—"}</span>
							<span className="show-all__text">{entryTitle(e)}</span>
							<span className="show-all__meta muted">
								{[
									e.kind === "match" ? (e.away ? "Away" : "Home") : e.kind === "event" ? "Event" : STATUS_LABEL[statusOf(e, today)],
									e.team,
									e.location,
								]
									.filter(Boolean)
									.join(" · ")}
							</span>
						</span>
					)}
					onPick={(e) => {
						setShowDay(null);
						openEntry(e);
					}}
					onClose={() => setShowDay(null)}
				/>
			)}
			{showAllTeams && (
				<ShowAllDialog
					title="Show one team"
					items={["all", ...teams]}
					itemKey={(t) => t}
					itemText={(t) => (t === "all" ? "All teams" : t)}
					renderItem={(t) => (
						<span className={`show-all__text${t === team ? " is-current" : ""}`}>{t === "all" ? "All teams" : t}</span>
					)}
					searchPlaceholder="Search teams"
					onPick={(t) => {
						setTeam(t);
						setShowAllTeams(false);
					}}
					onClose={() => setShowAllTeams(false)}
				/>
			)}
			{editing && (
				<ItemDialog
					key={editing.id}
					entry={editing}
					sportFilter={sport}
					onClose={() => setEditing(null)}
					onSave={(entry) =>
						editing.isNew ? library.addEntries([entry]) : library.updateEntry(entry.id, entry)
					}
					onRemove={() => {
						setRemoving(editing);
						setEditing(null);
					}}
					onPreviewSession={openSession}
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
