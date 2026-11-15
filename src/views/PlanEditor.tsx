import {
	createContext,
	Dispatch,
	PointerEvent as ReactPointerEvent,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import Loader from "../components/Loader";
import PlanToCalendarDialog from "../components/plan/PlanToCalendarDialog";
import { ContextMenuEntry, isTextField, useContextMenu } from "../components/ui/ContextMenu";
import { BoardInput, BoardTextarea, FieldGestureContext } from "../components/ui/fields";
import { describeDay, lastRunBySession } from "../model/calendar";
import { createTopic, Plan, planSessionIds, weekLabel } from "../model/plan";
import { formatMinutes, Session, sessionBoardIds, totalMinutes } from "../model/session";
import { Board } from "../model/types";
import BoardPreview from "../components/board/BoardPreview";
import { SPORT_INFO, SPORTS } from "../model/sports";
import { canUndoRedo, createHistory } from "../state/history";
import { useLibrary } from "../state/LibraryContext";
import { getPreferences } from "../state/preferences";
import { PlanAction, planReducer, PlanState } from "../state/plan";
import { SaveStatus, useAutosave } from "../state/useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
	saved: "Saved",
	saving: "Saving…",
	error: "Couldn't save",
};

/** Three ways to lay out the weeks, to compare (updates-205). Lineup remembers the pick. */
type PlanView = "list" | "table" | "outline";
const PLAN_VIEWS: { id: PlanView; label: string }[] = [
	{ id: "list", label: "List" },
	{ id: "table", label: "Table" },
	{ id: "outline", label: "Outline" },
];
const LAYOUT_KEY = "lineup.planLayout";

const PlanContext = createContext<{
	state: PlanState;
	dispatch: Dispatch<PlanAction>;
	/** The topic the sessions panel adds to. */
	activeTopic: string;
	setActiveTopic: (id: string) => void;
} | null>(null);

function usePlan() {
	const value = useContext(PlanContext);
	if (!value) throw new Error("usePlan must be used inside a plan editor");
	return value;
}

const sessionSummary = (s: Session) => {
	const minutes = totalMinutes(s);
	const drills = s.blocks.filter((b) => b.kind === "drill").length;
	return [
		minutes ? formatMinutes(minutes) : "",
		`${drills} drill${drills === 1 ? "" : "s"}`,
		s.header.topics.join(", "),
	]
		.filter(Boolean)
		.join(" · ");
};

/**
 * Where a dragged session would land: the week under the pointer and the
 * index in it. Lists run down (rows) or across (chips that wrap); a week in
 * the outline takes the session at its end.
 */
function dropTarget(clientX: number, clientY: number, dragged: Element | null) {
	const list = document
		.elementFromPoint(clientX, clientY)
		?.closest<HTMLElement>("[data-topic-list]");
	if (!list) return null;
	if (list.dataset.append !== undefined)
		return { topicId: list.dataset.topicList!, index: Number(list.dataset.append), list, rows: [] as HTMLElement[] };
	const rows = [...list.querySelectorAll<HTMLElement>("[data-session-row]")].filter(
		(r) => r !== dragged,
	);
	const across = list.dataset.axis === "x";
	let index = rows.length;
	for (let i = 0; i < rows.length; i++) {
		const r = rows[i].getBoundingClientRect();
		const before = across
			? clientY < r.top || (clientY <= r.bottom && clientX < r.left + r.width / 2)
			: clientY < r.top + r.height / 2;
		if (before) {
			index = i;
			break;
		}
	}
	return { topicId: list.dataset.topicList!, index, list, rows };
}

/** Puts the drop line where a dragged session would land. */
function placeDropLine(line: HTMLElement, t: NonNullable<ReturnType<typeof dropTarget>>) {
	const { list, rows, index } = t;
	const area = list.getBoundingClientRect();
	if (list.dataset.append !== undefined) {
		// Onto a week in the outline: the week lights up instead.
		line.style.display = "none";
		return;
	}
	if (list.dataset.axis === "x") {
		const r = index < rows.length ? rows[index].getBoundingClientRect() : rows[rows.length - 1]?.getBoundingClientRect();
		const x = !r ? area.left + 4 : index < rows.length ? r.left - 3 : r.right + 1;
		Object.assign(line.style, {
			display: "block",
			left: `${x}px`,
			top: `${r ? r.top : area.top + 4}px`,
			width: "2px",
			height: `${r ? r.height : 24}px`,
		});
		return;
	}
	const y =
		index < rows.length
			? rows[index].getBoundingClientRect().top - 3
			: rows.length
				? rows[rows.length - 1].getBoundingClientRect().bottom + 1
				: area.top + 4;
	Object.assign(line.style, {
		display: "block",
		left: `${area.left}px`,
		width: `${area.width}px`,
		top: `${y}px`,
		height: "",
	});
}

/** A week's drag and menus, shared by the list, the table and the outline. */
function useWeek(topicIndex: number) {
	const { state, dispatch } = usePlan();
	const library = useLibrary();
	const navigate = useNavigate();
	const { openMenu } = useContextMenu();
	const plan = state.present;
	const topic = plan.topics[topicIndex];
	const lastRun = useMemo(() => lastRunBySession(library.calendar), [library.calendar]);

	const startDrag = (e: ReactPointerEvent, index: number) => {
		if (e.button !== 0) return;
		e.preventDefault();
		(document.activeElement as HTMLElement | null)?.blur?.();
		const row = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-session-row]");
		if (!row) return;
		row.classList.add("is-dragging");
		// A copy of the session follows the pointer, and a line shows where it will land.
		const box = row.getBoundingClientRect();
		const grab = { x: e.clientX - box.left, y: e.clientY - box.top };
		const ghost = row.cloneNode(true) as HTMLElement;
		ghost.classList.remove("is-dragging");
		ghost.classList.add("plan-drag-ghost");
		ghost.style.width = `${box.width}px`;
		const line = document.createElement("div");
		line.className = "plan-drop-line";
		document.body.append(ghost, line);
		const place = (x: number, y: number) => {
			ghost.style.transform = `translate(${x - grab.x}px, ${y - grab.y}px) rotate(-0.3deg)`;
		};
		place(e.clientX, e.clientY);
		const clear = () =>
			document
				.querySelectorAll("[data-topic-list].is-drop")
				.forEach((el) => el.classList.remove("is-drop"));
		const move = (ev: PointerEvent) => {
			place(ev.clientX, ev.clientY);
			clear();
			const t = dropTarget(ev.clientX, ev.clientY, row);
			if (!t) {
				line.style.display = "none";
				return;
			}
			t.list.classList.add("is-drop");
			placeDropLine(line, t);
		};
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			row.classList.remove("is-dragging");
			ghost.remove();
			line.remove();
			clear();
			if (ev.type !== "pointerup") return;
			const t = dropTarget(ev.clientX, ev.clientY, row);
			if (t)
				dispatch({
					type: "moveSession",
					from: { topicId: topic.id, index },
					to: { topicId: t.topicId, index: t.index },
				});
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
	};

	const sessionMenu = (index: number, session?: Session): ContextMenuEntry[] => [
		...(session
			? [
					{
						label: "Open session",
						onSelect: () =>
							navigate(`/session/${session.id}`, { state: { from: `/plan/${plan.id}` } }),
					},
					"separator" as const,
				]
			: []),
		{
			label: "Move up",
			disabled: index === 0,
			onSelect: () =>
				dispatch({
					type: "moveSession",
					from: { topicId: topic.id, index },
					to: { topicId: topic.id, index: index - 1 },
				}),
		},
		{
			label: "Move down",
			disabled: index === topic.sessionIds.length - 1,
			onSelect: () =>
				dispatch({
					type: "moveSession",
					from: { topicId: topic.id, index },
					to: { topicId: topic.id, index: index + 1 },
				}),
		},
		{
			label: "Move to week",
			disabled: plan.topics.length < 2,
			submenu: plan.topics
				.filter((t) => t.id !== topic.id)
				.map((t, i) => ({
					label: weekLabel(plan.topics.indexOf(t) + 1 || i + 1, t.title),
					onSelect: () =>
						dispatch({
							type: "moveSession",
							from: { topicId: topic.id, index },
							to: { topicId: t.id, index: t.sessionIds.length },
						}),
				})),
		},
		"separator",
		{
			label: "Remove from plan",
			danger: true,
			onSelect: () => dispatch({ type: "removeSession", topicId: topic.id, index }),
		},
	];

	const topicMenu: ContextMenuEntry[] = [
		{
			label: "Move week up",
			disabled: topicIndex === 0,
			onSelect: () => dispatch({ type: "moveTopic", id: topic.id, index: topicIndex - 1 }),
		},
		{
			label: "Move week down",
			disabled: topicIndex === plan.topics.length - 1,
			onSelect: () => dispatch({ type: "moveTopic", id: topic.id, index: topicIndex + 1 }),
		},
		"separator",
		{
			label: topic.sessionIds.length ? "Remove week and its sessions from the plan" : "Remove week",
			danger: true,
			disabled: plan.topics.length === 1,
			onSelect: () => dispatch({ type: "removeTopic", id: topic.id }),
		},
	];

	return { plan, topic, startDrag, sessionMenu, topicMenu, lastRun, navigate, openMenu };
}

function TopicCard({
	topicIndex,
	number,
	large = false,
}: {
	topicIndex: number;
	number: number;
	/** In the outline: the one week, big, with its sessions' drills. */
	large?: boolean;
}) {
	const { dispatch, activeTopic, setActiveTopic } = usePlan();
	const [notesOpen, setNotesOpen] = useState(false);
	const library = useLibrary();
	const { plan, topic, startDrag, sessionMenu, topicMenu, lastRun, navigate, openMenu } = useWeek(topicIndex);

	return (
		<section
			className={`plan-topic${large ? " plan-topic--large" : ""}${activeTopic === topic.id && !large ? " is-active" : ""}`}
			onPointerDown={() => setActiveTopic(topic.id)}
			onFocus={() => setActiveTopic(topic.id)}
			aria-label={weekLabel(topicIndex + 1, topic.title)}
		>
			<div
				className="plan-topic__head"
				onContextMenu={(e) => {
					if (isTextField(e.target)) return;
					openMenu(e, topicMenu);
				}}
			>
				<span className="plan-topic__week">Week {topicIndex + 1}</span>
				<BoardInput
					className="plan-topic__title"
					label={`Week ${topicIndex + 1} topic`}
					hideLabel
					placeholder="Topic (optional), e.g. Pressing"
					maxLength={120}
					value={topic.title}
					onValue={(title) => dispatch({ type: "updateTopic", id: topic.id, patch: { title } })}
				/>
				<button
					type="button"
					className="icon-button icon-button--small"
					aria-label={`Actions for week ${topicIndex + 1}`}
					onClick={(e) => {
						const r = e.currentTarget.getBoundingClientRect();
						openMenu({ x: r.right - 200, y: r.bottom + 4 }, topicMenu);
					}}
				>
					<Icon name="more" size={16} />
				</button>
			</div>
			{notesOpen || topic.notes ? (
			<BoardTextarea
					label="Notes"
					rows={1}
					placeholder="What this block works on, how it progresses…"
					value={topic.notes}
					onValue={(notes) => dispatch({ type: "updateTopic", id: topic.id, patch: { notes } })}
				/>
			) : (
				<button type="button" className="link-button plan-topic__add-notes" onClick={() => setNotesOpen(true)}>
					+ Add notes
				</button>
			)}
			<ol className="plan-topic__sessions" data-topic-list={topic.id}>
				{topic.sessionIds.map((id, index) => {
					const session = library.getSession(id);
					const ran = lastRun.get(id);
					return (
						<li
							key={`${id}-${index}`}
							className="plan-session"
							data-session-row
							onContextMenu={(e) => openMenu(e, sessionMenu(index, session))}
						>
							<button
								type="button"
								className="block__handle"
								aria-label="Drag to reorder or move to another week"
								onPointerDown={(e) => startDrag(e, index)}
							>
								<Icon name="grip" size={16} />
							</button>
							<span className="plan-session__number mono">{number + index}</span>
							{large && session && <SessionThumbs session={session} count={3} />}
							{session ? (
								<button
									type="button"
									className="plan-session__open"
									onClick={() =>
										navigate(`/session/${session.id}`, {
											state: { from: `/plan/${plan.id}` },
										})
									}
								>
									<span className="plan-session__title">{session.meta.title}</span>
									<span className="plan-session__meta">
										{sessionSummary(session)}
										{ran && ` · last run ${describeDay(ran)}`}
									</span>
								</button>
							) : (
								<span className="plan-session__missing">This session was deleted.</span>
							)}
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="Remove from plan"
								title="Remove from plan"
								onClick={() => dispatch({ type: "removeSession", topicId: topic.id, index })}
							>
								<Icon name="close" size={14} />
							</button>
						</li>
					);
				})}
				{topic.sessionIds.length === 0 && (
					<li className="plan-topic__empty muted">
						No sessions this week. Add them from the panel on the right, or drag one here.
					</li>
				)}
			</ol>
		</section>
	);
}

/** The first drills of a session, as small pictures. */
function SessionThumbs({ session, count }: { session: Session; count: number }) {
	const library = useLibrary();
	const boards = sessionBoardIds(session)
		.map(library.getBoard)
		.filter((b): b is Board => !!b)
		.slice(0, count);
	return (
		<span className="plan-thumbs" aria-hidden="true">
			{boards.length ? (
				boards.map((b) => <BoardPreview key={b.id} board={b} className="plan-thumbs__item" />)
			) : (
				<span className="plan-thumbs__item" />
			)}
		</span>
	);
}

const weekMinutes = (ids: string[], getSession: (id: string) => Session | undefined) =>
	ids.reduce((sum, id) => sum + (getSession(id) ? totalMinutes(getSession(id)!) : 0), 0);

/** Design B: one row per week, its sessions as chips with a picture. */
function WeekRow({ topicIndex }: { topicIndex: number }) {
	const { dispatch, activeTopic, setActiveTopic } = usePlan();
	const library = useLibrary();
	const { plan, topic, startDrag, sessionMenu, topicMenu, navigate, openMenu } = useWeek(topicIndex);
	const minutes = weekMinutes(topic.sessionIds, library.getSession);
	return (
		<tr
			className={activeTopic === topic.id ? "is-active" : undefined}
			onPointerDown={() => setActiveTopic(topic.id)}
			onFocus={() => setActiveTopic(topic.id)}
			onContextMenu={(e) => {
				if (isTextField(e.target) || (e.target as Element).closest("[data-session-row]")) return;
				openMenu(e, topicMenu);
			}}
		>
			<td className="plan-table__week">Week {topicIndex + 1}</td>
			<td className="plan-table__topic">
				<BoardInput
					label={`Week ${topicIndex + 1} topic`}
					hideLabel
					placeholder="Topic (optional)"
					maxLength={120}
					value={topic.title}
					onValue={(title) => dispatch({ type: "updateTopic", id: topic.id, patch: { title } })}
				/>
			</td>
			<td>
				<div className="plan-table__sessions" data-topic-list={topic.id} data-axis="x">
					{topic.sessionIds.map((id, index) => {
						const session = library.getSession(id);
						return (
							<button
								key={`${id}-${index}`}
								type="button"
								className={`plan-chip${session ? "" : " plan-chip--missing"}`}
								data-session-row
								title={session ? sessionSummary(session) : "This session was deleted."}
								onPointerDown={(e) => startDrag(e, index)}
								onDoubleClick={() =>
									session && navigate(`/session/${session.id}`, { state: { from: `/plan/${plan.id}` } })
								}
								onContextMenu={(e) => {
									e.stopPropagation();
									openMenu(e, sessionMenu(index, session));
								}}
							>
								{session && <SessionThumbs session={session} count={1} />}
								{session?.meta.title ?? "Deleted session"}
							</button>
						);
					})}
					{topic.sessionIds.length === 0 && <span className="muted small">No sessions yet</span>}
				</div>
			</td>
			<td className="plan-table__time muted">{minutes ? formatMinutes(minutes) : "–"}</td>
			<td className="plan-table__more">
				<button
					type="button"
					className="icon-button icon-button--small"
					aria-label={`Actions for week ${topicIndex + 1}`}
					onClick={(e) => {
						const r = e.currentTarget.getBoundingClientRect();
						openMenu({ x: r.right - 200, y: r.bottom + 4 }, topicMenu);
					}}
				>
					<Icon name="more" size={16} />
				</button>
			</td>
		</tr>
	);
}

function WeekTable() {
	const { state } = usePlan();
	return (
		<table className="plan-table">
			<thead>
				<tr>
					<th>Week</th>
					<th>Topic</th>
					<th>Sessions</th>
					<th>Time</th>
					<th aria-label="Actions" />
				</tr>
			</thead>
			<tbody>
				{state.present.topics.map((t, i) => (
					<WeekRow key={t.id} topicIndex={i} />
				))}
			</tbody>
		</table>
	);
}

/** Design C: the weeks as an outline, and the picked week large beside it. */
function WeekOutline({ numbers, onAddWeek }: { numbers: number[]; onAddWeek: () => void }) {
	const { state, activeTopic, setActiveTopic } = usePlan();
	const plan = state.present;
	const index = Math.max(0, plan.topics.findIndex((t) => t.id === activeTopic));
	const count = plan.topics.reduce((n, t) => n + t.sessionIds.length, 0);
	return (
		<div className="plan-outline">
			<nav className="plan-outline__weeks" aria-label="Weeks">
				<span className="plan-outline__count">
					{plan.topics.length} {plan.topics.length === 1 ? "week" : "weeks"} · {count}{" "}
					{count === 1 ? "session" : "sessions"}
				</span>
				{plan.topics.map((t, i) => (
					<button
						key={t.id}
						type="button"
						className={`plan-outline__week${i === index ? " is-active" : ""}`}
						aria-current={i === index ? "true" : undefined}
						// Drop a session here to move it to the end of this week.
						data-topic-list={t.id}
						data-append={t.sessionIds.length}
						onClick={() => setActiveTopic(t.id)}
					>
						<span>
							<b>Week {i + 1}</b>
							{t.title.trim() && ` · ${t.title.trim()}`}
						</span>
						<span className="muted">{t.sessionIds.length}</span>
					</button>
				))}
				<button type="button" className="plan-outline__week plan-outline__add" onClick={onAddWeek}>
					+ Add week
				</button>
			</nav>
			{plan.topics[index] && (
				<TopicCard key={plan.topics[index].id} topicIndex={index} number={numbers[index]} large />
			)}
		</div>
	);
}

function SessionPanel() {
	const library = useLibrary();
	const navigate = useNavigate();
	const { state, dispatch, activeTopic } = usePlan();
	const [query, setQuery] = useState("");
	const plan = state.present;
	const topic = plan.topics.find((t) => t.id === activeTopic) ??
		plan.topics[plan.topics.length - 1];
	const used = new Set(planSessionIds(plan));
	const shown = library.sessions
		.filter((s) =>
			[s.meta.title, s.header.team, ...s.header.topics]
				.join(" ")
				.toLowerCase()
				.includes(query.trim().toLowerCase()),
		)
		.sort((a, b) => a.meta.title.localeCompare(b.meta.title));

	const add = (id: string) => {
		if (topic) dispatch({ type: "addSessions", topicId: topic.id, sessionIds: [id] });
	};

	return (
		<aside className="drill-picker" aria-label="Add sessions">
			<div className="drill-picker__head">
				<h2>Add sessions</h2>
				<p className="muted small">
					To {weekLabel(plan.topics.indexOf(topic!) + 1, topic?.title ?? "")}. Click another week to
					add to it instead.
				</p>
				<label className="search search--small">
					<Icon name="search" size={14} />
					<span className="visually-hidden">Search sessions</span>
					<input
						type="search"
						placeholder="Search sessions"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</label>
				<button
					type="button"
					className="button button--small"
					onClick={async () => {
						const session = await library.createSession(
							plan.meta.folders[0] ?? "",
							plan.sport || getPreferences().defaultPitch.sport,
						);
						// Named after its week and topic ("Week 2 Pressing 1"), so it's never an empty session.
						const count = (topic?.sessionIds.length ?? 0) + 1;
						const week = plan.topics.indexOf(topic!) + 1;
						const titled = {
							...session,
							meta: {
								...session.meta,
								title: topic?.title
									? `Week ${week} ${topic.title} ${count}`
									: `Week ${week} session ${count}`,
							},
							header: {
								...session.header,
								team: plan.team,
								topics: topic?.title ? [topic.title] : [],
							},
						};
						await library.saveSession(titled);
						add(titled.id);
						navigate(`/session/${titled.id}`, { state: { from: `/plan/${plan.id}` } });
					}}
				>
					<Icon name="plus" size={14} />
					New session for this week
				</button>
			</div>
			<ul className="drill-picker__list">
				{shown.map((s) => (
					<li key={s.id}>
						<button
							type="button"
							className="drill-picker__item drill-picker__item--text"
							onClick={() => add(s.id)}
							title={`Add “${s.meta.title}” to the plan`}
						>
							<span className="drill-picker__text">
								<span className="drill-picker__title">{s.meta.title}</span>
								<span className="drill-picker__meta">{sessionSummary(s)}</span>
							</span>
							{used.has(s.id) && <span className="badge">In</span>}
							<span className="drill-picker__add" aria-hidden="true">
								<Icon name="plus" size={16} />
							</span>
						</button>
					</li>
				))}
			</ul>
			{shown.length === 0 && (
				<p className="muted small drill-picker__empty">
					{library.sessions.length === 0
						? "No sessions yet. Make one with the button above."
						: "No sessions match."}
				</p>
			)}
		</aside>
	);
}

function PlanLayout() {
	const { state, dispatch } = usePlan();
	const library = useLibrary();
	const navigate = useNavigate();
	const plan = state.present;
	const { status, flush } = useAutosave(plan, library.savePlan);
	const { canUndo, canRedo } = canUndoRedo(state);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [layout, setLayout] = useState<PlanView>(() => {
		try {
			const saved = localStorage.getItem(LAYOUT_KEY);
			return PLAN_VIEWS.some((v) => v.id === saved) ? (saved as PlanView) : "list";
		} catch {
			return "list";
		}
	});
	const pickLayout = (v: PlanView) => {
		setLayout(v);
		try {
			localStorage.setItem(LAYOUT_KEY, v);
		} catch {
			// Not remembered; fine.
		}
	};
	const { setActiveTopic } = usePlan();
	const addWeek = () => {
		const topic = createTopic();
		dispatch({ type: "addTopic", topic });
		setActiveTopic(topic.id);
	};
	const sessions = planSessionIds(plan)
		.map(library.getSession)
		.filter((s): s is Session => !!s);
	const minutes = sessions.reduce((sum, s) => sum + totalMinutes(s), 0);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const mod = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();
			if (mod && key === "s") {
				e.preventDefault();
				void flush();
				return;
			}
			if (isTextField(e.target) || document.querySelector("dialog[open]")) return;
			if (mod && (key === "z" || key === "y")) {
				e.preventDefault();
				dispatch({ type: key === "y" || e.shiftKey ? "redo" : "undo" });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [flush, dispatch]);

	const run = (type: "undo" | "redo") => {
		(document.activeElement as HTMLElement | null)?.blur?.();
		dispatch({ type });
	};

	// Sessions are numbered through the plan, not per week.
	const numbers = plan.topics.reduce<number[]>(
		(acc, t, i) => [...acc, i === 0 ? 1 : acc[i - 1] + plan.topics[i - 1].sessionIds.length],
		[],
	);
	return (
		<div className={`session-editor plan-editor plan-editor--${layout}`}>
			<header className="topbar">
				<button
					type="button"
					className="back-button"
					onClick={() => navigate("/")}
				>
					<Icon name="chevronLeft" size={16} />
					Library
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<span className="badge">Plan</span>
				<BoardInput
					className="topbar__title"
					label="Plan title"
					hideLabel
					maxLength={80}
					value={plan.meta.title}
					onValue={(title) => dispatch({ type: "updatePlan", patch: { title } })}
				/>
				{status === "error" ? (
					<button type="button" className="save-status save-status--error" onClick={() => void flush()}>
						{STATUS_TEXT.error} · Retry
					</button>
				) : (
					<span className={`save-status save-status--${status}`} role="status">
						<span className="save-status__dot" aria-hidden="true" />
						{STATUS_TEXT[status]}
					</span>
				)}
				<span className="topbar__spacer" />
				<button type="button" className="icon-button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => run("undo")}>
					<Icon name="undo" size={18} />
				</button>
				<button type="button" className="icon-button" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={() => run("redo")}>
					<Icon name="redo" size={18} />
				</button>
				<button
					type="button"
					className="button button--primary"
					disabled={sessions.length === 0}
					title={sessions.length ? "Lay the sessions out on dates" : "Add sessions first"}
					onClick={() => setCalendarOpen(true)}
				>
					<Icon name="calendar" size={16} />
					Add to calendar
				</button>
			</header>
			<div className="session-editor__body">
				<main className="session-editor__main">
					<section className="session-header" aria-label="Plan details">
						<div className="session-header__grid">
							<BoardInput
								label="Team or age group"
								placeholder="U12 Girls"
								maxLength={120}
								value={plan.team}
								onValue={(team) => dispatch({ type: "updatePlan", patch: { team } })}
							/>
							<div className="field">
								<label className="field__label" htmlFor="plan-sport">
									Sport
								</label>
								<select
									id="plan-sport"
									className="field__input"
									value={plan.sport}
									onChange={(e) =>
										dispatch({
											type: "updatePlan",
											patch: { sport: e.target.value as Plan["sport"] },
										})
									}
								>
									<option value="">Any sport</option>
									{SPORTS.map((s) => (
										<option key={s} value={s}>
											{SPORT_INFO[s].name}
										</option>
									))}
								</select>
							</div>
							<BoardTextarea
								label="Description"
								rows={2}
								placeholder="What the plan is for: the season's goals, the block's theme…"
								value={plan.description}
								onValue={(description) => dispatch({ type: "updatePlan", patch: { description } })}
							/>
						</div>
					</section>

					<div className="timeline__head">
						<h2>Weeks</h2>
						<div className="segmented segmented--small" role="radiogroup" aria-label="Layout">
							{PLAN_VIEWS.map((v) => (
								<button
									key={v.id}
									type="button"
									role="radio"
									aria-checked={layout === v.id}
									className={`segmented__item${layout === v.id ? " is-active" : ""}`}
									onClick={() => pickLayout(v.id)}
								>
									{v.label}
								</button>
							))}
						</div>
						<span className="muted">
							{plan.topics.length} {plan.topics.length === 1 ? "week" : "weeks"} ·{" "}
							{sessions.length} {sessions.length === 1 ? "session" : "sessions"}
							{minutes ? ` · ${formatMinutes(minutes)}` : ""}
						</span>
					</div>
					{layout === "list" && (
						<>
							{plan.topics.map((topic, i) => (
								<TopicCard key={topic.id} topicIndex={i} number={numbers[i]} />
							))}
						</>
					)}
					{layout === "table" && <WeekTable />}
					{layout === "outline" && <WeekOutline numbers={numbers} onAddWeek={addWeek} />}
					{layout !== "outline" && (
						<div className="timeline__add">
							<button type="button" className="button button--small" onClick={addWeek}>
								<Icon name="plus" size={14} />
								Add week
							</button>
						</div>
					)}
				</main>
				<SessionPanel />
			</div>
			{calendarOpen && (
				<PlanToCalendarDialog
					plan={plan}
					open
					onClose={() => setCalendarOpen(false)}
					onConfirm={async (entries, first) => {
						await library.addEntries(entries);
						navigate("/calendar", { state: { date: first } });
					}}
				/>
			)}
		</div>
	);
}

function PlanProvider({ plan, children }: { plan: Plan; children: React.ReactNode }) {
	const [state, dispatch] = useReducer(planReducer, plan, createHistory<Plan>);
	const [activeTopic, setActiveTopic] = useState(plan.topics[plan.topics.length - 1]?.id ?? "");
	const value = useMemo(
		() => ({ state, dispatch, activeTopic, setActiveTopic }),
		[state, activeTopic],
	);
	const gestures = useMemo(
		() => ({
			begin: () => dispatch({ type: "beginGesture" }),
			end: () => dispatch({ type: "endGesture" }),
		}),
		[],
	);
	return (
		<PlanContext.Provider value={value}>
			<FieldGestureContext.Provider value={gestures}>{children}</FieldGestureContext.Provider>
		</PlanContext.Provider>
	);
}

export default function PlanEditor() {
	const { id } = useParams();
	const library = useLibrary();
	const [loaded, setLoaded] = useState<Plan | undefined>(() =>
		id ? library.getPlan(id) : undefined,
	);

	useEffect(() => {
		if (!loaded && library.status === "ready" && id) setLoaded(library.getPlan(id));
	}, [library.status, id, loaded, library]);

	if (library.status === "loading") return <Loader />;
	if (!loaded) {
		return (
			<main className="not-found">
				<h1>Plan not found</h1>
				<p>It may have been deleted or moved out of your library.</p>
				<Link to="/">Back to the library</Link>
			</main>
		);
	}
	return (
		<PlanProvider key={loaded.id} plan={loaded}>
			<PlanLayout />
		</PlanProvider>
	);
}
