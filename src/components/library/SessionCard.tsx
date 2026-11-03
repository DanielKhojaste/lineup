import {
	formatMinutes,
	isRestBlock,
	Session,
	sessionMinutes,
	sessionTitle,
	sessionBoardIds,
	totalMinutes,
} from "../../model/session";
import { Board } from "../../model/types";
import { relativeTime } from "../../utils/time";
import BoardPreview from "../board/BoardPreview";
import { Icon } from "../Icon";
import { ContextMenuEntry, useContextMenu } from "../ui/ContextMenu";
import CardMenuButton from "./CardMenuButton";

/**
 * A session in the library: the first drills' pictures, a strip showing how
 * the time is split between training and rest (the same colours as the plan),
 * and its details.
 */
export default function SessionCard({
	session,
	getBoard,
	onOpen,
	menu,
}: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
	onOpen: () => void;
	menu: () => ContextMenuEntry[];
}) {
	const { openMenu } = useContextMenu();
	const total = totalMinutes(session);
	const time = sessionMinutes(session);
	const drills = session.blocks.filter((b) => b.kind === "drill").length;
	const boards = sessionBoardIds(session)
		.map(getBoard)
		.filter((b): b is Board => !!b)
		.slice(0, 4);
	const details = [
		session.header.team,
		session.header.topics.slice(0, 2).join(", "),
		time ? formatMinutes(time) : "",
		`${drills} drill${drills === 1 ? "" : "s"}`,
		`Edited ${relativeTime(session.meta.updatedAt)}`,
	].filter(Boolean);

	return (
		<article
			className="board-card session-card"
			onContextMenu={(e) => openMenu(e, menu())}
		>
			<button
				type="button"
				className="board-card__open"
				onClick={onOpen}
				aria-label={`Open session ${sessionTitle(session)}`}
			>
				<div className="session-card__preview">
					{boards.length === 0 ? (
						<span className="session-card__empty">
							<Icon name="session" size={28} />
						</span>
					) : (
						// Up to four drills in a 2 × 2 grid.
						[0, 1, 2, 3].map((i) =>
							boards[i] ? (
								<BoardPreview key={boards[i].id} board={boards[i]} />
							) : (
								<span key={i} className="session-card__blank" />
							),
						)
					)}
				</div>
				{total > 0 && (
					<span className="session-card__strip" aria-hidden="true">
						{session.blocks.map((b) => (
							<span
								key={b.id}
								className={`session-card__segment session-card__segment--${
									isRestBlock(b, (id) => getBoard(id)?.notes.stage ?? "")
										? "rest"
										: "active"
								}`}
								style={{ flexGrow: b.minutes || 0.0001 }}
							/>
						))}
					</span>
				)}
				<span className="board-card__title">
					<span className="badge">Session</span> {sessionTitle(session)}
				</span>
				<span className="board-card__meta">{details.join(" · ")}</span>
			</button>
			<CardMenuButton title={sessionTitle(session)} menu={menu} />
		</article>
	);
}
