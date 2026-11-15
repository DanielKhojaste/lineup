import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BoardPreview from "../components/board/BoardPreview";
import { Icon } from "../components/Icon";
import Loader from "../components/Loader";
import { boardAtStep, nodesDuringStep, stepAtTime, totalDuration } from "../model/animation";
import { BOARD_TYPE_LABELS } from "../model/board";
import {
	blockStages,
	blockTimes,
	formatMinutes,
	playersText,
	Session,
	sessionMinutes,
	sessionTitle,
} from "../model/session";
import { Board } from "../model/types";
import { useLibrary } from "../state/LibraryContext";

/**
 * Going through a session: its blocks in order on the left, the picked drill
 * large on the right with its details. Plays animate (or step through with
 * the arrow keys), and ↑ / ↓ move between blocks. Opened from the session's
 * Preview button or its menu in the library.
 */

/** A play, moving: its markers part-way through the animation, looping. */
function PlayingBoard({ board, playing, step }: { board: Board; playing: boolean; step: number }) {
	const [shown, setShown] = useState<Board>(() => boardAtStep(board, step));
	const started = useRef(0);

	useEffect(() => {
		if (!playing || board.steps.length === 0) {
			setShown(boardAtStep(board, step));
			return;
		}
		const length = totalDuration(board);
		// A short pause on the last step before it starts again.
		const loop = length + 1.2;
		started.current = performance.now();
		let raf = 0;
		const frame = (now: number) => {
			const time = ((now - started.current) / 1000) % loop;
			const at = stepAtTime(board, Math.min(time, length));
			setShown({ ...board, nodes: nodesDuringStep(board, at.step, at.t) });
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, [board, playing, step]);

	return <BoardPreview board={shown} className="session-preview__board" />;
}

export default function SessionPreview() {
	const { id } = useParams();
	const library = useLibrary();
	const navigate = useNavigate();
	const from = (useLocation().state as { from?: string } | null)?.from;
	const session: Session | undefined = id ? library.getSession(id) : undefined;
	const [index, setIndex] = useState(0);
	const [playing, setPlaying] = useState(true);
	const [step, setStep] = useState(0);

	const stageOf = (boardId: string) => {
		const board = library.getBoard(boardId);
		return board ? board.notes.category : "";
	};
	const stages = useMemo(() => (session ? blockStages(session, stageOf) : []), [session]); // eslint-disable-line react-hooks/exhaustive-deps
	const times = useMemo(() => (session ? blockTimes(session) : []), [session]);

	const block = session?.blocks[index];
	const board = block?.kind === "drill" ? library.getBoard(block.boardId) : undefined;
	const steps = board?.steps.length ?? 0;

	// A new block starts from the beginning, playing.
	useEffect(() => {
		setStep(0);
		setPlaying(true);
	}, [index]);

	useEffect(() => {
		if (!session) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			const count = session.blocks.length;
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				setIndex((i) => Math.max(0, Math.min(count - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
			} else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && steps) {
				e.preventDefault();
				setPlaying(false);
				setStep((s) => Math.max(0, Math.min(steps, s + (e.key === "ArrowRight" ? 1 : -1))));
			} else if (e.key === " " && steps) {
				e.preventDefault();
				setPlaying((p) => !p);
			} else if (e.key === "Escape") {
				navigate(`/session/${session.id}`, { state: from ? { from } : undefined });
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [session, steps, navigate, from]);

	if (library.status === "loading") return <Loader />;
	if (!session)
		return (
			<main className="not-found">
				<p>This session isn't in your library any more.</p>
				<button type="button" className="button" onClick={() => navigate("/")}>
					Back to the library
				</button>
			</main>
		);

	const minutes = sessionMinutes(session);
	const summary = [
		session.header.team,
		minutes ? formatMinutes(minutes) : "",
		playersText(session.header.playersMin, session.header.playersMax) &&
			`${playersText(session.header.playersMin, session.header.playersMax)} players`,
	].filter(Boolean);

	return (
		<div className="session-preview">
			<header className="topbar">
				<button
					type="button"
					className="back-button"
					onClick={() => navigate(`/session/${session.id}`, { state: from ? { from } : undefined })}
				>
					<Icon name="chevronLeft" size={16} />
					Edit session
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<span className="badge">Session</span>
				<span className="topbar__heading">{sessionTitle(session)}</span>
				<span className="muted small">{summary.join(" · ")}</span>
				<span className="topbar__spacer" />
				<span className="muted small session-preview__keys">↑ ↓ blocks · ← → steps · Space play</span>
			</header>

			<div className="session-preview__body">
				<nav className="session-preview__list" aria-label="Blocks">
					{session.blocks.length === 0 && (
						<p className="muted small">This session has nothing in it yet.</p>
					)}
					{session.blocks.map((b, i) => {
						const drill = b.kind === "drill" ? library.getBoard(b.boardId) : undefined;
						const title =
							b.kind === "drill"
								? (drill?.meta.title ?? "Missing drill")
								: b.label || (b.kind === "break" ? "Break" : "Block");
						return (
							<button
								key={b.id}
								type="button"
								className={`session-preview__item${i === index ? " is-active" : ""}${
									b.kind !== "drill" ? " session-preview__item--text" : ""
								}`}
								aria-current={i === index ? "step" : undefined}
								onClick={() => setIndex(i)}
							>
								{drill ? (
									<BoardPreview board={drill} className="session-preview__thumb" />
								) : (
									<span className="session-preview__thumb session-preview__thumb--empty" aria-hidden="true">
										<Icon name={b.kind === "break" ? "pause" : "session"} size={18} />
									</span>
								)}
								<span className="session-preview__text">
									<span className="session-preview__stage">{stages[i]}</span>
									<span className="session-preview__title">{title}</span>
									<span className="muted small">
										{times[i] ? `${times[i].from}–${times[i].to} min` : `${b.minutes} min`}
									</span>
								</span>
							</button>
						);
					})}
				</nav>

				<main className="session-preview__main">
					{block && board ? (
						<>
							<div className="session-preview__stagewrap">
								<PlayingBoard board={board} playing={playing} step={step} />
							</div>
							{steps > 0 && (
								<div className="session-preview__steps">
									<button
										type="button"
										className="icon-button"
										aria-label={playing ? "Pause" : "Play"}
										onClick={() => setPlaying((p) => !p)}
									>
										<Icon name={playing ? "pause" : "play"} size={16} />
									</button>
									{Array.from({ length: steps + 1 }, (_, s) => (
										<button
											key={s}
											type="button"
											className={`filter-chip${!playing && step === s ? " is-active" : ""}`}
											onClick={() => {
												setPlaying(false);
												setStep(s);
											}}
										>
											{s === 0 ? "Start" : `Step ${s}`}
										</button>
									))}
								</div>
							)}
							<section className="session-preview__details">
								<div className="session-preview__facts">
									<span>
										<strong>{block.minutes} min</strong> in this session
									</span>
									<span>{BOARD_TYPE_LABELS[board.meta.type].one}</span>
									{board.notes.players && <span>{board.notes.players} players</span>}
									{board.meta.tags.length > 0 && <span>Tags: {board.meta.tags.join(", ")}</span>}
									<span className="topbar__spacer" />
									<button
										type="button"
										className="button button--small"
										onClick={() => navigate(`/board/${board.id}`)}
									>
										Open drill
									</button>
								</div>
								{block.notes && <p className="session-preview__note">{block.notes}</p>}
								{board.notes.description && <p>{board.notes.description}</p>}
								{board.notes.coachingPoints.length > 0 && (
									<>
										<h3>Coaching points</h3>
										<ul>
											{board.notes.coachingPoints.map((point, i) => (
												<li key={i}>{point}</li>
											))}
										</ul>
									</>
								)}
							</section>
						</>
					) : block ? (
						<div className="session-preview__rest">
							<Icon name={block.kind === "break" ? "pause" : "session"} size={28} />
							<h2>{block.kind === "drill" ? "This drill was deleted" : block.label || "Break"}</h2>
							<p className="muted">{block.minutes} min</p>
							{block.notes && <p>{block.notes}</p>}
						</div>
					) : null}
				</main>
			</div>
		</div>
	);
}
