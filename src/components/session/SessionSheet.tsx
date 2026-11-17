import { BOARD_TYPE_LABELS } from "../../model/board";
import { focusView } from "../../model/focusView";
import {
	blockStages,
	blockTimes,
	formatMinutes,
	playersText,
	Session,
	SessionBlock,
	sessionMinutes,
	sessionTitle,
} from "../../model/session";
import { SPORT_INFO } from "../../model/sports";
import { Board } from "../../model/types";
import BoardPreview from "../board/BoardPreview";

/** A part of the session's colour on the sheet, from its name ("Warm-up 1", "Main", "Scrimmage"…). */
function stageTone(stage: string, block: SessionBlock): string {
	if (block.kind === "break") return "break";
	const s = stage.toLowerCase();
	if (/warm|activation|prep/.test(s)) return "warm";
	if (/cool|talk|stretch|debrief/.test(s)) return "cool";
	if (/game|scrimmage|match|small-sided|ssg/.test(s)) return "game";
	if (block.kind === "drill" || /main|activity|technical|tactical|skill|drill/.test(s)) return "main";
	return "other";
}

/** "Warm-up 1" → "Warm-up": the part's name without its number. */
const stageName = (stage: string) => stage.replace(/\s+\d+$/, "");

/**
 * The session sheet (the summary): a header with the facts, a timeline of
 * the whole session coloured by part, then each drill with its diagram zoomed
 * to the area it uses, what happens and its focus points as tick boxes, the
 * other blocks as short rows, and room for notes. Printed, saved as PDF and
 * exported as an image from the same layout. The ink saver draws the pitches
 * white, for home printers.
 */
export function SessionSheetContent({
	session,
	getBoard,
	ink = false,
}: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
	ink?: boolean;
}) {
	const { header } = session;
	const times = blockTimes(session);
	const stages = blockStages(session, (id) => getBoard(id)?.notes.stage ?? "");
	const minutes = sessionMinutes(session);
	const players = playersText(header.playersMin, header.playersMax);
	const facts = (
		[
			["Time", minutes ? formatMinutes(minutes) : ""],
			["Players", players],
			["Area", header.area],
			["Equipment", header.equipment],
		] as [string, string][]
	).filter(([, v]) => v);
	const timed = session.blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.minutes > 0);

	return (
		<div className={`sheet${ink ? " sheet--ink" : ""}`}>
			<div className="sheet__part sheet__head">
				<h1 className="sheet__title">{sessionTitle(session)}</h1>
				<div className="sheet__sub">
					{[header.team, SPORT_INFO[header.sport].name].filter(Boolean).join(" · ")}
				</div>
				{facts.length > 0 && (
					<div className="sheet__facts">
						{facts.map(([label, value]) => (
							<span key={label}>
								<b>{label}</b>
								{value}
							</span>
						))}
					</div>
				)}
				{header.topics.length > 0 && (
					<div className="sheet__topics">
						{header.topics.map((t) => (
							<span key={t} className="sheet__pill">
								{t}
							</span>
						))}
					</div>
				)}
				{header.description && <p className="sheet__description">{header.description}</p>}
				{minutes > 0 && (
					<>
						<div className="sheet__timeline" aria-label="Timeline">
							{timed.map(({ b, i }) => (
								<span
									key={b.id}
									className={`sheet__tl sheet__tl--${stageTone(stages[i], b)}`}
									style={{ flexGrow: b.minutes }}
								>
									{b.kind === "break"
										? ""
										: b.kind === "drill"
											? (getBoard(b.boardId)?.meta.title ?? stageName(stages[i]))
											: b.label || stageName(stages[i])}
								</span>
							))}
						</div>
						<div className="sheet__axis">
							<span>0</span>
							{timed
								.filter(({ b }) => b.kind !== "break")
								.slice(1)
								.map(({ b, i }) => (
									<span key={b.id} style={{ left: `${(times[i].from / minutes) * 100}%` }}>
										{times[i].from}
									</span>
								))}
							<span className="sheet__axis-end">{minutes} min</span>
						</div>
					</>
				)}
			</div>

			{session.blocks.map((block, i) => {
				const t = times[i];
				const when = `${t.from}–${t.to} min`;
				const tone = stageTone(stages[i], block);
				const tag = (
					<span className={`sheet__stage sheet__stage--${tone}`}>
						{block.kind === "break" ? "Break" : stageName(stages[i])}
					</span>
				);
				if (block.kind !== "drill") {
					const name =
						block.kind === "custom"
							? block.label.trim() || stageName(stages[i])
							: block.label.trim() || "Break";
					return (
						<div key={block.id} className={`sheet__part sheet__row sheet__row--${tone}`}>
							<div className="sheet__row-head">
								{block.kind === "custom" && block.stage.trim() ? tag : null}
								<strong>{name}</strong>
								<span className="sheet__row-when">
									{when} · {formatMinutes(block.minutes)}
								</span>
							</div>
							{block.notes && <p className="sheet__row-notes">{block.notes}</p>}
						</div>
					);
				}
				const board = getBoard(block.boardId);
				const notes = board?.notes;
				const points = notes?.coachingPoints.filter(Boolean) ?? [];
				const variations = notes?.variations.filter(Boolean) ?? [];
				const mini = (
					[
						["Players", notes?.players],
						["Area", notes?.area],
						["Equipment", notes?.equipment],
					] as [string, string | undefined][]
				).filter(([, v]) => v);
				return (
					<div key={block.id} className="sheet__part sheet__drill">
						<div className="sheet__diagram">
							{board && <BoardPreview board={board} view={focusView(board)} ink={ink} />}
						</div>
						<div className="sheet__drill-text">
							<div className="sheet__when">
								{tag}
								{when} · {formatMinutes(block.minutes)}
							</div>
							<div className="sheet__name">
								{board?.meta.title ?? "Missing drill"}
								{board && <span className="sheet__type"> · {BOARD_TYPE_LABELS[board.meta.type].one}</span>}
							</div>
							{mini.length > 0 && (
								<div className="sheet__mini">
									{mini.map(([label, value]) => (
										<span key={label}>
											<b>{label}</b> {value}
										</span>
									))}
								</div>
							)}
							{notes?.description && <p className="sheet__text">{notes.description}</p>}
							{points.length > 0 && (
								<ul className="sheet__ticks">
									{points.map((p, j) => (
										<li key={j}>{p}</li>
									))}
								</ul>
							)}
							{variations.length > 0 && (
								<>
									<div className="sheet__label">Progressions</div>
									<ul className="sheet__list">
										{variations.map((v, j) => (
											<li key={j}>{v}</li>
										))}
									</ul>
								</>
							)}
							{block.notes && (
								<p className="sheet__text">
									<b>Notes:</b> {block.notes}
								</p>
							)}
						</div>
					</div>
				);
			})}

			<div className="sheet__part sheet__notes">
				<div className="sheet__label">Notes</div>
				<div className="sheet__lines">
					<span />
					<span />
					<span />
				</div>
				<div className="sheet__made">Made with Lineup</div>
			</div>
		</div>
	);
}

/** The sheet as it's printed (Ctrl+P); hidden on screen. */
export default function SessionSheet(props: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
	ink?: boolean;
}) {
	return (
		<div className="print-sheet" aria-hidden="true">
			<SessionSheetContent {...props} />
		</div>
	);
}
