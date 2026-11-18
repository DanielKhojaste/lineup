import { CalendarEntry, describeDay } from "../../model/calendar";
import { formatMinutes, Session, totalMinutes } from "../../model/session";
import { Board } from "../../model/types";
import BoardPreview from "../board/BoardPreview";
import { showTime, uses12Hours } from "../ui/TimeCombo";

const KIND_NAME = { session: "Practice", match: "Match", event: "Event" } as const;

/**
 * The calendar's sidebar: the month in numbers at the top, then the next item
 * as a briefing (when, where, its session's boards, with Preview and Print),
 * and the topics the month's sessions covered most, pinned to the bottom.
 */
export default function CalendarSidebar({
	next,
	title,
	getSession,
	getBoard,
	onOpen,
	onPreview,
	onPrint,
	monthName,
	isThisMonth,
	counts,
	topics,
	monthHasSessions,
}: {
	next?: CalendarEntry;
	title: (e: CalendarEntry) => string;
	getSession: (id: string) => Session | undefined;
	getBoard: (id: string) => Board | undefined;
	onOpen: (e: CalendarEntry) => void;
	onPreview: (sessionId: string) => void;
	onPrint: (sessionId: string) => void;
	monthName: string;
	isThisMonth: boolean;
	counts: { kind: "session" | "match" | "event"; count: number }[];
	/** The month's topics, the most covered first, with how many sessions covered each. */
	topics: [string, number][];
	monthHasSessions: boolean;
}) {
	const twelve = uses12Hours();
	const session = next ? getSession(next.sessionId) : undefined;
	const boards = session
		? session.blocks
				.filter((b) => b.kind === "drill")
				.map((b) => ({ block: b, board: b.kind === "drill" ? getBoard(b.boardId) : undefined }))
				.filter((x): x is { block: typeof x.block; board: Board } => !!x.board)
		: [];
	const minutes = session ? totalMinutes(session) : 0;
	const top = topics.slice(0, 5);
	const most = top[0]?.[1] ?? 1;

	return (
		<aside className="agenda" aria-label="The month, next up and its topics">
			<section className="agenda__month" aria-label={monthName}>
				<h2>{isThisMonth ? `${monthName} · this month` : monthName}</h2>
				<div className="agenda__counts">
					{counts.map(({ kind, count }) => (
						<div key={kind} className="agenda__count">
							<span className="agenda__count-n">{count}</span>
							<span className="agenda__count-label">
								{kind === "session"
									? count === 1 ? "practice" : "practices"
									: kind === "match"
										? count === 1 ? "match" : "matches"
										: count === 1 ? "event" : "events"}
							</span>
						</div>
					))}
				</div>
			</section>
			<h2>Next up{next ? ` · ${describeDay(next.date)}` : ""}</h2>
			{next ? (
				<div className={`agenda-next agenda-next--${next.kind}`}>
					<button type="button" className="agenda-next__head" onClick={() => onOpen(next)}>
						<span className="agenda-next__kind">
							{KIND_NAME[next.kind]}
							{next.time ? ` · ${showTime(next.time, twelve)}` : ""}
						</span>
						<span className="agenda-next__title">{title(next)}</span>
						<span className="agenda-next__meta">
							{[next.team, next.location, minutes ? formatMinutes(minutes) : ""].filter(Boolean).join(" · ")}
						</span>
					</button>
					{boards.length > 0 && (
						<ul className="agenda-next__boards">
							{boards.slice(0, 3).map(({ block, board }) => (
								<li key={block.id}>
									<BoardPreview board={board} className="agenda-next__thumb" />
									<span>
										<span className="agenda-next__board">{board.meta.title}</span>
										<span className="muted small">{formatMinutes(block.minutes)}</span>
									</span>
								</li>
							))}
							{boards.length > 3 && <li className="muted small">+{boards.length - 3} more</li>}
						</ul>
					)}
					{session && (
						<div className="agenda-next__actions">
							{boards.length > 0 && (
								<button type="button" className="button button--small" onClick={() => onPreview(session.id)}>
									Preview
								</button>
							)}
							<button type="button" className="button button--small" onClick={() => onPrint(session.id)}>
								Print
							</button>
						</div>
					)}
				</div>
			) : (
				<p className="muted small">Nothing planned. Add a practice, a plan or a match.</p>
			)}

			<section className="agenda__topics">
				<h2>Topics covered in {monthName}</h2>
				{top.length ? (
					<ul className="agenda-topics">
						{top.map(([t, n]) => (
							<li key={t} title={`${n} ${n === 1 ? "session" : "sessions"}`}>
								<span className="agenda-topics__name">{t}</span>
								<span className="agenda-topics__bar">
									<span style={{ width: `${(n / most) * 100}%` }} />
								</span>
								<span className="agenda-topics__n">{n}</span>
							</li>
						))}
					</ul>
				) : (
					<p className="muted small">
						{monthHasSessions ? "The sessions this month have no topics yet." : "No sessions this month yet."}
					</p>
				)}
			</section>
		</aside>
	);
}
