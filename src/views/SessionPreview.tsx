import { Key } from "../components/ui/Keys";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { usePreviewChoice } from "../preview/designs";

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

/**
 * Play, pause and the steps, floating over the field (two designs to
 * compare on the preview branch): A, a bar centred along the bottom; B,
 * round buttons in the bottom corners.
 */
/** More steps than this and the bar shows a track instead of a dot per step. */
const MAX_DOTS = 10;

function StepControls({
	variant,
	steps,
	step,
	playing,
	onPlay,
	onStep,
}: {
	variant: "bar" | "corners" | "dock" | "fade" | "compact";
	steps: number;
	step: number;
	playing: boolean;
	onPlay: () => void;
	onStep: (step: number) => void;
}) {
	const label = step === 0 ? "Start" : `Step ${step} of ${steps}`;
	const dots = Array.from({ length: steps + 1 }, (_, s) => (
		<button
			key={s}
			type="button"
			className={`step-dot${!playing && step === s ? " is-active" : ""}`}
			aria-label={s === 0 ? "Start" : `Step ${s}`}
			title={s === 0 ? "Start" : `Step ${s}`}
			onClick={() => onStep(s)}
		>
			{variant === "corners" ? s : null}
		</button>
	));
	const play = (
		<button
			type="button"
			className="step-controls__play"
			aria-label={playing ? "Pause" : "Play"}
			title={playing ? "Pause (Space)" : "Play (Space)"}
			onClick={onPlay}
		>
			<Icon name={playing ? "pause" : "play"} size={variant === "corners" ? 20 : 18} />
		</button>
	);
	const prev = (
		<button type="button" className="step-controls__btn" aria-label="Previous step" title="Previous step (←)" disabled={step === 0 && !playing} onClick={() => onStep(step - 1)}>
			<Icon name="chevronLeft" size={18} />
		</button>
	);
	const next = (
		<button type="button" className="step-controls__btn" aria-label="Next step" title="Next step (→)" disabled={step === steps && !playing} onClick={() => onStep(step + 1)}>
			<Icon name="chevronRight" size={18} />
		</button>
	);
	if (variant === "compact")
		return (
			<div className="step-controls step-controls--corner-left step-controls--compact step-controls--fade">
				{play}
				{prev}
				<span className="step-controls__count" title={label}>
					{playing ? "▶" : step} / {steps}
				</span>
				{next}
			</div>
		);
	if (variant === "corners")
		return (
			<>
				<div className="step-controls step-controls--corner-left">
					{play}
					{prev}
					{next}
				</div>
				<div className="step-controls step-controls--corner-right" role="group" aria-label="Steps">
					{dots}
				</div>
			</>
		);
	return (
		<div
			className={`step-controls step-controls--bar${variant === "dock" ? " step-controls--dock" : ""}${variant === "fade" ? " step-controls--fade" : ""}`}
			role="group"
			aria-label="Animation"
		>
			{prev}
			{play}
			{next}
			<span className="step-controls__divider" aria-hidden="true" />
			{steps > MAX_DOTS ? (
				// Lots of steps: a track instead of a dot each (it keeps its width however many there are).
				<span className="step-track" role="group" aria-label="Steps">
					{Array.from({ length: steps + 1 }, (_, s) => (
						<button
							key={s}
							type="button"
							className={`step-track__seg${s <= step ? " is-done" : ""}${!playing && s === step ? " is-active" : ""}`}
							aria-label={s === 0 ? "Start" : `Step ${s}`}
							title={s === 0 ? "Start" : `Step ${s}`}
							onClick={() => onStep(s)}
						/>
					))}
				</span>
			) : (
				<span className="step-controls__dots">{dots}</span>
			)}
			<span className="step-controls__label">{playing ? "Playing" : label}</span>
		</div>
	);
}

/**
 * A layer exactly over the drawn field (the picture keeps its shape inside a
 * bigger box), so controls float on the grass, not beside it.
 */
function FieldOverlay({ children }: { children: React.ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
	useEffect(() => {
		const layer = ref.current;
		const svg = layer?.parentElement?.querySelector<SVGSVGElement>(".session-preview__board");
		if (!layer || !svg) return;
		const measure = () => {
			const vb = svg.viewBox.baseVal;
			const W = svg.clientWidth;
			const H = svg.clientHeight;
			if (!vb || !vb.width || !W || !H) return;
			const aspect = vb.width / vb.height;
			const width = Math.min(W, H * aspect);
			const height = width / aspect;
			// Where the picture sits in its box.
			const host = layer.parentElement!.getBoundingClientRect();
			const r = svg.getBoundingClientRect();
			setBox({ left: r.left - host.left + (W - width) / 2, top: r.top - host.top + (H - height) / 2, width, height });
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(svg);
		return () => observer.disconnect();
	}, []);
	return (
		<div ref={ref} className="field-overlay" style={box ?? { display: "none" }}>
			{children}
		</div>
	);
}

type DetailsPlace = "below" | "side" | "hidden";
const DETAILS_KEY = "lineup.previewDetails";

/** Where the drill's details go: under the board, beside it, or hidden. Remembered. */
function savedDetails(): DetailsPlace {
	try {
		const saved = localStorage.getItem(DETAILS_KEY);
		return saved === "side" || saved === "hidden" ? saved : "below";
	} catch {
		return "below";
	}
}

export default function SessionPreview() {
	const { id } = useParams();
	const library = useLibrary();
	const navigate = useNavigate();
	// Where the preview was opened from: the library, or the session (and where
	// the session itself was opened from, a plan or the calendar).
	const { from, back } = (useLocation().state as { from?: string; back?: string } | null) ?? {};
	const session: Session | undefined = id ? library.getSession(id) : undefined;
	// Start at the first drill, past a team talk or anything else before it.
	const [index, setIndex] = useState(() => {
		const first = session?.blocks.findIndex((b) => b.kind === "drill") ?? -1;
		return Math.max(0, first);
	});
	const [details, setDetailsState] = useState<DetailsPlace>(savedDetails);
	const setDetails = (place: DetailsPlace) => {
		setDetailsState(place);
		try {
			localStorage.setItem(DETAILS_KEY, place);
		} catch {
			// Only remembered while the app is open.
		}
	};
	// The library may still be loading when the preview opens: start at the first drill once it's there.
	const startedFor = useRef<string | null>(null);
	useEffect(() => {
		if (!session || startedFor.current === session.id) return;
		startedFor.current = session.id;
		setIndex(Math.max(0, session.blocks.findIndex((b) => b.kind === "drill")));
	}, [session]);
	const goBack = () =>
		back
			? navigate(back)
			: navigate(`/session/${session!.id}`, { state: from ? { from } : undefined });
	const [playing, setPlaying] = useState(true);
	const [step, setStep] = useState(0);
	const controls = usePreviewChoice("controls");
	// "Fades when idle": the controls fade out a moment after the pointer stops (or leaves the field).
	const [idle, setIdle] = useState(true);
	const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const wake = () => {
		setIdle(false);
		clearTimeout(idleTimer.current);
		idleTimer.current = setTimeout(() => setIdle(true), 1500);
	};

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
			const handled = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", " "].includes(e.key);
			// The preview's own keys: a block clicked earlier keeps no focus ring.
			if (handled && document.activeElement instanceof HTMLElement && document.activeElement.closest(".session-preview__list"))
				document.activeElement.blur();
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
				goBack();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [session, steps, navigate, from, back]); // eslint-disable-line react-hooks/exhaustive-deps

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
				<button type="button" className="back-button" onClick={goBack}>
					<Icon name="chevronLeft" size={16} />
					{back === "/" ? "Library" : back === "/calendar" ? "Calendar" : back?.startsWith("/plan/") ? "Plan" : "Session"}
				</button>
				<span className="topbar__divider" aria-hidden="true" />
				<span className="badge">Session</span>
				<span className="topbar__heading session-preview__title" title={sessionTitle(session)}>
					{sessionTitle(session)}
				</span>
				<span className="topbar__spacer" />
				<span className="muted small session-preview__keys">
					<span className="session-preview__keygroup">
						<Key small>↑</Key>
						<Key small>↓</Key>
						<span>Blocks</span>
					</span>
					<span className="session-preview__keygroup">
						<Key small>←</Key>
						<Key small>→</Key>
						<span>Steps</span>
					</span>
					<span className="session-preview__keygroup">
						<Key small wide>Space</Key>
						<span>Play</span>
					</span>
				</span>
				<div className="segmented segmented--small" role="radiogroup" aria-label="Drill details">
					{(
						[
							["below", "Details below"],
							["side", "Details on the right"],
							["hidden", "Hide details"],
						] as const
					).map(([place, label]) => (
						<button
							key={place}
							type="button"
							role="radio"
							aria-checked={details === place}
							aria-label={label}
							title={label}
							className={`segmented__item${details === place ? " is-active" : ""}`}
							onClick={() => setDetails(place)}
						>
							<Icon name={place === "below" ? "panelBottom" : place === "side" ? "panelRight" : "eyeOff"} size={16} />
						</button>
					))}
				</div>
				{/* Always here, top right. From the session's own editor it simply goes back to it. */}
				<button
					type="button"
					className="button button--small"
					onClick={() =>
						back?.startsWith(`/session/${session.id}`) || !back
							? goBack()
							: navigate(`/session/${session.id}`, { state: { from: back } })
					}
				>
					<Icon name="pencil" size={14} />
					Edit session
				</button>
			</header>

			<div className="session-preview__body">
				<nav className="session-preview__list" aria-label="Blocks">
					{summary.length > 0 && (
						<p className="session-preview__summary" title={summary.join(" · ")}>
							{summary.join(" · ")}
						</p>
					)}
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

				<main className={`session-preview__main session-preview__main--${details}`}>
					{block && board ? (
						<>
							<div
								className={`session-preview__stagewrap${idle ? " is-idle" : ""}`}
								onPointerMove={wake}
								onPointerLeave={() => setIdle(true)}
							>
								<PlayingBoard board={board} playing={playing} step={step} />
								{steps > 0 && controls !== "dock" && (
									<FieldOverlay>
									<StepControls
										variant={controls}
										steps={steps}
										step={step}
										playing={playing}
										onPlay={() => setPlaying((p) => !p)}
										onStep={(s) => {
											setPlaying(false);
											setStep(Math.max(0, Math.min(steps, s)));
										}}
									/>
									</FieldOverlay>
								)}
							</div>
							{steps > 0 && controls === "dock" && (
								<div className="step-controls-dock">
									<StepControls
										variant="dock"
										steps={steps}
										step={step}
										playing={playing}
										onPlay={() => setPlaying((p) => !p)}
										onStep={(s) => {
											setPlaying(false);
											setStep(Math.max(0, Math.min(steps, s)));
										}}
									/>
								</div>
							)}
							{details !== "hidden" && (
							<section className="session-preview__details">
								<div className="session-preview__facts">
									<span>
										<strong>{block.minutes} min</strong> in this session
									</span>
									<span>{BOARD_TYPE_LABELS[board.meta.type].one}</span>
									{board.notes.players && <span>Players: {board.notes.players}</span>}
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
							)}
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
