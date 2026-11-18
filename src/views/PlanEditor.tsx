import {
	createContext,
	Dispatch,
	PointerEvent as ReactPointerEvent,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useState,
	useLayoutEffect,
	useRef,
} from "react";
import TeamField from "../components/ui/TeamField";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import Loader from "../components/Loader";
import PlanToCalendarDialog from "../components/plan/PlanToCalendarDialog";
import { ConfirmDialog } from "../components/ui/Dialog";
import { ContextMenuEntry, isTextField, useContextMenu } from "../components/ui/ContextMenu";
import { BoardInput, BoardTextarea, FieldGestureContext } from "../components/ui/fields";
import { describeDay, lastRunBySession } from "../model/calendar";
import { createTopic, Plan, planSessionIds, weekLabel } from "../model/plan";
import { formatMinutes, Session, sessionBoardIds, totalMinutes } from "../model/session";
import { suggestedTopics } from "../model/topics";
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


const PlanContext = createContext<{
	state: PlanState;
	dispatch: Dispatch<PlanAction>;
	/** The topic the sessions panel adds to. */
	activeTopic: string;
	setActiveTopic: (id: string) => void;
	/** Asks before removing a week (from its trash can or its menu). */
	askRemoveWeek: (id: string) => void;
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
		`${drills} board${drills === 1 ? "" : "s"}`,
		s.header.topics.join(", "),
	]
		.filter(Boolean)
		.join(" · ");
};

/** The most topics a week can have, so its header stays readable. */
const MAX_WEEK_TOPICS = 8;

/**
 * A week's topics: chips, and a box to add more. While typing, matching
 * topics (the sport's and your own) show as bubbles next to the box.
 */
function WeekTopics({ topicIndex }: { topicIndex: number }) {
	const { state, dispatch } = usePlan();
	const library = useLibrary();
	const plan = state.present;
	const week = plan.topics[topicIndex];
	const [draft, setDraft] = useState("");
	const has = (t: string) => week.topics.some((x) => x.toLowerCase() === t.toLowerCase());
	const set = (topics: string[]) => dispatch({ type: "updateTopic", id: week.id, patch: { topics } });
	const full = week.topics.length >= MAX_WEEK_TOPICS;
	const suggestions = useMemo(
		() =>
			suggestedTopics(plan.sport, [
				...library.topics,
				...library.sessions.flatMap((x) => x.header.topics),
			]),
		[plan.sport, library.topics, library.sessions],
	);
	const q = draft.trim().toLowerCase();
	const matches = q
		? suggestions
				.filter((t) => !has(t) && t.toLowerCase().includes(q))
				// Those that start with what's typed first.
				.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)))
				.slice(0, 6)
		: [];
	// How many bubbles fit beside the box (measured after each change; the rest stay hidden).
	const entryRef = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState(6);
	const matchKey = matches.join("|");
	useLayoutEffect(() => {
		const entry = entryRef.current;
		if (!entry) return;
		const measure = () => {
			const bubbles = [...entry.querySelectorAll<HTMLElement>(".week-topics__bubble")];
			bubbles.forEach((b) => (b.hidden = false));
			const right = entry.getBoundingClientRect().right;
			let n = 0;
			for (const b of bubbles) {
				if (b.getBoundingClientRect().right > right + 0.5) break;
				n++;
			}
			bubbles.forEach((b, i) => (b.hidden = i >= n));
			setFit(n);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(entry);
		return () => observer.disconnect();
	}, [matchKey]);
	const add = (value: string) => {
		const typed = value.trim().slice(0, 40);
		setDraft("");
		if (!typed || full) return;
		// Typed the same as a suggestion: use the suggestion's spelling.
		const t = suggestions.find((x) => x.toLowerCase() === typed.toLowerCase()) ?? typed;
		if (!has(t)) set([...week.topics, t]);
	};
	return (
		<div className="week-topics">
			{week.topics.map((t) => (
				<span key={t} className="chip chip--small" title={t}>
					<span className="chip__text">{t}</span>
					<button
						type="button"
						className="chip__remove"
						aria-label={`Remove topic ${t}`}
						onClick={() => set(week.topics.filter((x) => x !== t))}
					>
						<Icon name="close" size={11} />
					</button>
				</span>
			))}
			{full ? (
				<span className="muted small">{MAX_WEEK_TOPICS} topics maximum</span>
			) : (
				// The box and its bubbles share one line: only the bubbles that fit the rest of it show.
				<div className="week-topics__entry" ref={entryRef}>
					<input
						className="chip-input week-topics__input"
						aria-label={`Week ${topicIndex + 1} topics`}
						placeholder={week.topics.length ? "+ Topic" : "+ Add topics, e.g. Pressing"}
						value={draft}
						maxLength={40}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === ",") {
								e.preventDefault();
								add(draft);
							} else if (e.key === "Escape" && draft) {
								e.stopPropagation();
								setDraft("");
							} else if (e.key === "Backspace" && !draft && week.topics.length) {
								set(week.topics.slice(0, -1));
							}
						}}
						onBlur={(e) => {
							// Not when a bubble is being clicked: that adds its own topic.
							if (!(e.relatedTarget as Element | null)?.closest(".week-topics__bubble")) add(draft);
						}}
					/>
					{matches.map((t, i) => (
						<button
							key={t}
							type="button"
							className="week-topics__bubble"
							title={t}
							hidden={i >= fit}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => add(t)}
						>
							+ {t}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Dragging a week by its handle, in any layout: a label follows the pointer
 * and a line shows where the week will go among the others.
 */
function useWeekDrag() {
	const { state, dispatch } = usePlan();
	return (e: ReactPointerEvent, topicIndex: number) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();
		(document.activeElement as HTMLElement | null)?.blur?.();
		const week = state.present.topics[topicIndex];
		const row = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-week-row]");
		const list = row?.closest<HTMLElement>("[data-week-list]");
		if (!row || !list) return;
		row.classList.add("is-dragging");
		const ghost = document.createElement("div");
		ghost.className = "plan-week-ghost";
		ghost.textContent = weekLabel(topicIndex + 1, week.topics);
		const line = document.createElement("div");
		line.className = "plan-drop-line";
		document.body.append(ghost, line);
		const others = () =>
			[...list.querySelectorAll<HTMLElement>("[data-week-row]")].filter((r) => r !== row);
		const indexAt = (y: number) => {
			const rows = others();
			const i = rows.findIndex((r) => {
				const b = r.getBoundingClientRect();
				return y < b.top + b.height / 2;
			});
			return i === -1 ? rows.length : i;
		};
		const move = (ev: PointerEvent) => {
			ghost.style.transform = `translate(${ev.clientX + 12}px, ${ev.clientY - 14}px)`;
			const rows = others();
			const i = indexAt(ev.clientY);
			const area = list.getBoundingClientRect();
			const y =
				i < rows.length
					? rows[i].getBoundingClientRect().top - 3
					: (rows[rows.length - 1]?.getBoundingClientRect().bottom ?? area.top) + 1;
			Object.assign(line.style, {
				display: "block",
				left: `${area.left}px`,
				width: `${area.width}px`,
				top: `${y}px`,
				height: "",
			});
		};
		move(e.nativeEvent);
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			row.classList.remove("is-dragging");
			ghost.remove();
			line.remove();
			if (ev.type === "pointerup") dispatch({ type: "moveTopic", id: week.id, index: indexAt(ev.clientY) });
		};
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
	};
}

/** Removes a week (and its sessions from the plan; the sessions stay in the library). Ctrl+Z brings it back. */
function RemoveWeekButton({ topicIndex }: { topicIndex: number }) {
	const { state, askRemoveWeek } = usePlan();
	const weeks = state.present.topics;
	const week = weeks[topicIndex];
	const only = weeks.length === 1;
	return (
		<button
			type="button"
			className="icon-button icon-button--small plan-week-remove"
			aria-label={`Remove week ${topicIndex + 1}`}
			title={only ? "A plan needs at least one week" : "Remove the week (Ctrl+Z to undo)"}
			disabled={only}
			onClick={(e) => {
				e.stopPropagation();
				askRemoveWeek(week.id);
			}}
		>
			<Icon name="trash" size={15} />
		</button>
	);
}

function WeekHandle({ topicIndex }: { topicIndex: number }) {
	const startDrag = useWeekDrag();
	return (
		<button
			type="button"
			className="block__handle plan-week-handle"
			aria-label={`Drag week ${topicIndex + 1} to move it`}
			title="Drag to move the week"
			onPointerDown={(e) => startDrag(e, topicIndex)}
		>
			<Icon name="grip" size={16} />
		</button>
	);
}

/**
 * Opening a session from a plan shows its preview (editing is in its menu).
 * A session with no drills yet has nothing to preview, so it opens to edit.
 */
function useOpenSession() {
	const navigate = useNavigate();
	const { state } = usePlan();
	const here = `/plan/${state.present.id}`;
	return {
		preview: (session: Session) =>
			session.blocks.some((b) => b.kind === "drill")
				? navigate(`/session/${session.id}/preview`, { state: { back: here, from: here } })
				: navigate(`/session/${session.id}`, { state: { from: here } }),
		edit: (session: Session) => navigate(`/session/${session.id}`, { state: { from: here } }),
	};
}

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
	const { state, dispatch, askRemoveWeek } = usePlan();
	const open = useOpenSession();
	const library = useLibrary();
	const navigate = useNavigate();
	const { openMenu } = useContextMenu();
	const plan = state.present;
	const topic = plan.topics[topicIndex];
	const lastRun = useMemo(() => lastRunBySession(library.calendar), [library.calendar]);

	/**
	 * Dragging a session: a copy follows the pointer and a line shows where it
	 * will land. Nothing happens until the pointer moves a few pixels, so a
	 * plain click can do something else (`onClick`: a chip opens its preview).
	 */
	const startDrag = (e: ReactPointerEvent, index: number, onClick?: () => void) => {
		if (e.button !== 0) return;
		e.preventDefault();
		(document.activeElement as HTMLElement | null)?.blur?.();
		const row = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-session-row]");
		if (!row) return;
		const start = { x: e.clientX, y: e.clientY };
		const box = row.getBoundingClientRect();
		const grab = { x: e.clientX - box.left, y: e.clientY - box.top };
		let ghost: HTMLElement | null = null;
		let line: HTMLElement | null = null;
		const clear = () =>
			document
				.querySelectorAll("[data-topic-list].is-drop")
				.forEach((el) => el.classList.remove("is-drop"));
		const begin = () => {
			row.classList.add("is-dragging");
			ghost = row.cloneNode(true) as HTMLElement;
			ghost.classList.remove("is-dragging");
			ghost.classList.add("plan-drag-ghost");
			ghost.style.width = `${box.width}px`;
			line = document.createElement("div");
			line.className = "plan-drop-line";
			document.body.append(ghost, line);
		};
		const move = (ev: PointerEvent) => {
			if (!ghost) {
				if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return;
				begin();
			}
			ghost!.style.transform = `translate(${ev.clientX - grab.x}px, ${ev.clientY - grab.y}px) rotate(-0.3deg)`;
			clear();
			const t = dropTarget(ev.clientX, ev.clientY, row);
			if (!t) {
				line!.style.display = "none";
				return;
			}
			t.list.classList.add("is-drop");
			placeDropLine(line!, t);
		};
		const up = (ev: PointerEvent) => {
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
			const dragged = !!ghost;
			row.classList.remove("is-dragging");
			ghost?.remove();
			line?.remove();
			clear();
			if (ev.type !== "pointerup") return;
			if (!dragged) {
				onClick?.();
				return;
			}
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
					{ label: "Preview", onSelect: () => open.preview(session) },
					{ label: "Edit session", onSelect: () => open.edit(session) },
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
					label: weekLabel(plan.topics.indexOf(t) + 1 || i + 1, t.topics),
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
			onSelect: () => askRemoveWeek(topic.id),
		},
	];

	return { plan, topic, startDrag, sessionMenu, topicMenu, lastRun, navigate, openMenu, open };
}

function TopicCard({
	topicIndex,
	large = false,
}: {
	topicIndex: number;
	/** In the outline: big, with its sessions' drills. */
	large?: boolean;
}) {
	const { dispatch, activeTopic, setActiveTopic } = usePlan();
	const [notesOpen, setNotesOpen] = useState(false);
	const library = useLibrary();
	const { topic, startDrag, sessionMenu, topicMenu, lastRun, openMenu, open } = useWeek(topicIndex);

	return (
		<section
			className={`plan-topic${large ? " plan-topic--large" : ""}${activeTopic === topic.id && !large ? " is-active" : ""}`}
			onPointerDown={() => setActiveTopic(topic.id)}
			onFocus={() => setActiveTopic(topic.id)}
			aria-label={weekLabel(topicIndex + 1, topic.topics)}
			data-week-row={topic.id}
		>
			<div
				className="plan-topic__head"
				onContextMenu={(e) => {
					if (isTextField(e.target)) return;
					openMenu(e, topicMenu);
				}}
			>
				<WeekHandle topicIndex={topicIndex} />
				<span className="plan-topic__week">Week {topicIndex + 1}</span>
				<WeekTopics topicIndex={topicIndex} />
				<RemoveWeekButton topicIndex={topicIndex} />
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
							{/* Counted within the week. */}
							<span className="plan-session__number mono">{index + 1}</span>
							{session ? (
								// The pictures and the text are one button: one hover, one click to the preview.
								<button
									type="button"
									className="plan-session__open"
									title="Preview the session"
									onClick={() => open.preview(session)}
								>
									{large && <SessionThumbs session={session} count={3} />}
									<span className="plan-session__text">
										<span className="plan-session__title">{session.meta.title}</span>
										<span className="plan-session__meta">
											{sessionSummary(session)}
											{ran && ` · last run ${describeDay(ran)}`}
										</span>
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
				<span className="plan-thumbs__empty">No boards yet</span>
			)}
		</span>
	);
}

/** Which week the outline shows, or all of them; remembered for each plan. */
function useOutlinePick(planId: string): [string, (pick: string) => void] {
	const key = `lineup.planOutline.${planId}`;
	const [pick, setPick] = useState(() => {
		try {
			return localStorage.getItem(key) ?? "";
		} catch {
			return "";
		}
	});
	return [
		pick,
		(next) => {
			setPick(next);
			try {
				localStorage.setItem(key, next);
			} catch {
				// Not remembered; fine.
			}
		},
	];
}

/** The weeks as an outline, and the picked week (or all of them) beside it. */
function WeekOutline({ onAddWeek }: { onAddWeek: () => string }) {
	const { state, activeTopic, setActiveTopic } = usePlan();
	const plan = state.present;
	const [pick, setPick] = useOutlinePick(plan.id);
	const all = pick === "all";
	const index = Math.max(
		0,
		plan.topics.findIndex((t) => t.id === (all ? activeTopic : pick || activeTopic)),
	);
	const count = plan.topics.reduce((n, t) => n + t.sessionIds.length, 0);
	const choose = (id: string) => {
		setPick(id);
		if (id !== "all") setActiveTopic(id);
	};
	// The remembered week is also the one the sessions panel adds to.
	useEffect(() => {
		if (pick && pick !== "all" && plan.topics.some((t) => t.id === pick)) setActiveTopic(pick);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return (
		<div className="plan-outline">
			<nav className="plan-outline__weeks" aria-label="Weeks" data-week-list>
				<span className="plan-outline__count">
					{plan.topics.length} {plan.topics.length === 1 ? "week" : "weeks"} · {count}{" "}
					{count === 1 ? "session" : "sessions"}
				</span>
				<button
					type="button"
					className={`plan-outline__week plan-outline__all${all ? " is-active" : ""}`}
					aria-current={all ? "true" : undefined}
					onClick={() => choose("all")}
				>
					<span>All weeks</span>
					<span className="muted">{count}</span>
				</button>
				{plan.topics.map((t, i) => {
					const on = !all && i === index;
					return (
						<div
							key={t.id}
							className={`plan-outline__week${on ? " is-active" : ""}`}
							data-week-row={t.id}
							// Drop a session here to move it to the end of this week.
							data-topic-list={t.id}
							data-append={t.sessionIds.length}
						>
							<WeekHandle topicIndex={i} />
							<button
								type="button"
								className="plan-outline__pick"
								aria-current={on ? "true" : undefined}
								onClick={() => choose(t.id)}
							>
								<span className="plan-outline__name">
									<span className="plan-outline__label">Week {i + 1}</span>
									{t.topics.length > 0 && ` · ${t.topics.join(", ")}`}
								</span>
								<span className="muted">{t.sessionIds.length}</span>
							</button>
							<RemoveWeekButton topicIndex={i} />
						</div>
					);
				})}
				<button
					type="button"
					className="plan-outline__week plan-outline__add"
					onClick={() => {
						const id = onAddWeek();
						if (!all) choose(id);
					}}
				>
					+ Add week
				</button>
			</nav>
			{all ? (
				<div className="plan-outline__all-weeks" data-week-list>
					{plan.topics.map((t, i) => (
						<TopicCard key={t.id} topicIndex={i} large />
					))}
				</div>
			) : (
				plan.topics[index] && <TopicCard key={plan.topics[index].id} topicIndex={index} large />
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
					To {weekLabel(plan.topics.indexOf(topic!) + 1, topic?.topics ?? [])}. Click another week to
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
								title: topic?.topics.length
									? `Week ${week} ${topic.topics[0]} ${count}`
									: `Week ${week} session ${count}`,
							},
							header: {
								...session.header,
								team: plan.team,
								topics: topic?.topics ?? [],
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
	const { setActiveTopic } = usePlan();
	const addWeek = () => {
		const topic = createTopic();
		dispatch({ type: "addTopic", topic });
		setActiveTopic(topic.id);
		return topic.id;
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

	return (
		<div className="session-editor plan-editor plan-editor--outline">
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
						<div className="session-header__grid plan-header__grid">
							<TeamField
								label="Team or age group"
								value={plan.team}
								onChange={(team) => dispatch({ type: "updatePlan", patch: { team } })}
								undoable
								sport={plan.sport || undefined}
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
								rows={3}
								placeholder="What the plan is for: the season's goals, the block's theme…"
								value={plan.description}
								onValue={(description) => dispatch({ type: "updatePlan", patch: { description } })}
							/>
						</div>
					</section>

					<div className="timeline__head">
						<h2>Weeks</h2>
						<span className="muted">
							{plan.topics.length} {plan.topics.length === 1 ? "week" : "weeks"} ·{" "}
							{sessions.length} {sessions.length === 1 ? "session" : "sessions"}
							{minutes ? ` · ${formatMinutes(minutes)}` : ""}
						</span>
					</div>
					<p className="plan-hint">
						Selecting a session opens its preview. To edit a session, right-click it and choose{" "}
						<b>Edit session</b>.
					</p>
					{/* List and Table were tried too; they're kept on the archive/plan-layouts branch. */}
					<WeekOutline onAddWeek={addWeek} />
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
	const [removing, setRemoving] = useState<string | null>(null);
	const value = useMemo(
		() => ({ state, dispatch, activeTopic, setActiveTopic, askRemoveWeek: setRemoving }),
		[state, activeTopic],
	);
	const weeks = state.present.topics;
	const index = weeks.findIndex((t) => t.id === removing);
	const week = weeks[index];
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
			<ConfirmDialog
				open={!!week}
				title={`Remove week ${index + 1}?`}
				message={
					week
						? `“${weekLabel(index + 1, week.topics)}”${
								week.sessionIds.length
									? ` and its ${week.sessionIds.length === 1 ? "session" : `${week.sessionIds.length} sessions`} come off the plan (sessions stay in your library).`
									: " comes off the plan."
							} Ctrl+Z brings it back.`
						: ""
				}
				confirmLabel="Remove week"
				danger
				onConfirm={() => week && dispatch({ type: "removeTopic", id: week.id })}
				onClose={() => setRemoving(null)}
			/>
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
