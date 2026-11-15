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
import { Plan, planSessionIds } from "../model/plan";
import { formatMinutes, Session, totalMinutes } from "../model/session";
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

/** Where a dragged session would land: the topic under the pointer and the index in it. */
function dropTarget(clientX: number, clientY: number, dragged: Element | null) {
	const list = document
		.elementFromPoint(clientX, clientY)
		?.closest<HTMLElement>("[data-topic-list]");
	if (!list) return null;
	const rows = [...list.querySelectorAll<HTMLElement>("[data-session-row]")].filter(
		(r) => r !== dragged,
	);
	let index = rows.length;
	for (let i = 0; i < rows.length; i++) {
		const r = rows[i].getBoundingClientRect();
		if (clientY < r.top + r.height / 2) {
			index = i;
			break;
		}
	}
	return { topicId: list.dataset.topicList!, index };
}

function TopicCard({ topicIndex, number }: { topicIndex: number; number: number }) {
	const { state, dispatch, activeTopic, setActiveTopic } = usePlan();
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
		const row = (e.currentTarget as HTMLElement).closest("[data-session-row]");
		row?.classList.add("is-dragging");
		const move = (ev: PointerEvent) => {
			document
				.querySelectorAll(".plan-topic__sessions.is-drop")
				.forEach((el) => el.classList.remove("is-drop"));
			const t = dropTarget(ev.clientX, ev.clientY, row);
			if (t)
				document
					.querySelector(`[data-topic-list="${t.topicId}"]`)
					?.classList.add("is-drop");
		};
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			row?.classList.remove("is-dragging");
			document
				.querySelectorAll(".plan-topic__sessions.is-drop")
				.forEach((el) => el.classList.remove("is-drop"));
			if (ev.type !== "pointerup") return;
			const t = dropTarget(ev.clientX, ev.clientY, row);
			if (t)
				dispatch({
					type: "moveSession",
					from: { topicId: topic.id, index },
					to: t,
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
			label: "Move to topic",
			disabled: plan.topics.length < 2,
			submenu: plan.topics
				.filter((t) => t.id !== topic.id)
				.map((t, i) => ({
					label: t.title || `Topic ${plan.topics.indexOf(t) + 1 || i + 1}`,
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
			label: "Move topic up",
			disabled: topicIndex === 0,
			onSelect: () => dispatch({ type: "moveTopic", id: topic.id, index: topicIndex - 1 }),
		},
		{
			label: "Move topic down",
			disabled: topicIndex === plan.topics.length - 1,
			onSelect: () => dispatch({ type: "moveTopic", id: topic.id, index: topicIndex + 1 }),
		},
		"separator",
		{
			label: topic.sessionIds.length ? "Remove topic and its sessions from the plan" : "Remove topic",
			danger: true,
			disabled: plan.topics.length === 1,
			onSelect: () => dispatch({ type: "removeTopic", id: topic.id }),
		},
	];

	return (
		<section
			className={`plan-topic${activeTopic === topic.id ? " is-active" : ""}`}
			onPointerDown={() => setActiveTopic(topic.id)}
			onFocus={() => setActiveTopic(topic.id)}
			aria-label={topic.title || `Topic ${topicIndex + 1}`}
		>
			<div
				className="plan-topic__head"
				onContextMenu={(e) => {
					if (isTextField(e.target)) return;
					openMenu(e, topicMenu);
				}}
			>
				<span className="plan-topic__number mono">{topicIndex + 1}</span>
				<BoardInput
					className="plan-topic__title"
					label={`Topic ${topicIndex + 1}`}
					hideLabel
					placeholder="Topic, e.g. Attacking transition"
					maxLength={120}
					value={topic.title}
					onValue={(title) => dispatch({ type: "updateTopic", id: topic.id, patch: { title } })}
				/>
				<button
					type="button"
					className="icon-button icon-button--small"
					aria-label={`Actions for topic ${topicIndex + 1}`}
					onClick={(e) => {
						const r = e.currentTarget.getBoundingClientRect();
						openMenu({ x: r.right - 200, y: r.bottom + 4 }, topicMenu);
					}}
				>
					<Icon name="more" size={16} />
				</button>
			</div>
			<BoardTextarea
				label="Notes"
				rows={1}
				placeholder="What this block works on, how it progresses…"
				value={topic.notes}
				onValue={(notes) => dispatch({ type: "updateTopic", id: topic.id, patch: { notes } })}
			/>
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
								aria-label="Drag to reorder or move to another topic"
								onPointerDown={(e) => startDrag(e, index)}
							>
								<Icon name="grip" size={16} />
							</button>
							<span className="plan-session__number mono">{number + index}</span>
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
						Add sessions from the panel on the right, or drag one here.
					</li>
				)}
			</ol>
		</section>
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
					To {topic?.title ? `“${topic.title}”` : `topic ${plan.topics.indexOf(topic!) + 1}`}. Click a
					topic to add to it instead.
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
						// Named after its topic ("Pressing 2"), so it's never an empty session.
						const count = (topic?.sessionIds.length ?? 0) + 1;
						const titled = {
							...session,
							meta: {
								...session.meta,
								title: topic?.title ? `${topic.title} ${count}` : `Session ${count}`,
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
					New session in this topic
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

	let number = 1;
	return (
		<div className="session-editor plan-editor">
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
					Put on calendar
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
						<h2>Topics</h2>
						<span className="muted">
							{plan.topics.length} {plan.topics.length === 1 ? "topic" : "topics"} ·{" "}
							{sessions.length} {sessions.length === 1 ? "session" : "sessions"}
							{minutes ? ` · ${formatMinutes(minutes)}` : ""}
						</span>
					</div>
					{plan.topics.map((topic, i) => {
						const start = number;
						number += topic.sessionIds.length;
						return <TopicCard key={topic.id} topicIndex={i} number={start} />;
					})}
					<div className="timeline__add">
						<button
							type="button"
							className="button button--small"
							onClick={() => dispatch({ type: "addTopic" })}
						>
							<Icon name="plus" size={14} />
							Add topic
						</button>
					</div>
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
