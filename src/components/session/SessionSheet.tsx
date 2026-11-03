import { BOARD_TYPE_LABELS } from "../../model/board";
import {
	blockStages,
	blockTimes,
	formatMinutes,
	playersText,
	Session,
	sessionMinutes,
	sessionTitle,
} from "../../model/session";
import { SPORT_INFO } from "../../model/sports";
import { Board } from "../../model/types";
import BoardPreview from "../board/BoardPreview";

/**
 * The session sheet: everything another coach needs to run the session. A
 * summary table at the top, then one section per activity with what happens,
 * the set-up diagram and the focus points, like a club's session plan.
 * Printed, saved as PDF and exported as an image from the same layout.
 */
export function SessionSheetContent({
	session,
	getBoard,
}: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
}) {
	const { header } = session;
	const times = blockTimes(session);
	const stages = blockStages(session, (id) => getBoard(id)?.notes.stage ?? "");
	const minutes = sessionMinutes(session);
	const time = minutes ? formatMinutes(minutes) : "";
	// [label, value, takes two columns]
	const cells = (
		[
			["Age group or team", header.team, false],
			["Players", playersText(header.playersMin, header.playersMax), false],
			["Sport", SPORT_INFO[header.sport].name, false],
			["Time", time, false],
			["Area", header.area, false],
			["Topics", header.topics.join(" · "), true],
			["Equipment", header.equipment, true],
		] as [string, string, boolean][]
	).filter(([, value]) => value);

	return (
		<div className="sheet">
			<div className="sheet__part">
				<h1 className="sheet__title">{sessionTitle(session)}</h1>
				{cells.length > 0 && (
					<div className="sheet__summary">
						{cells.map(([label, value, wide]) => (
							<div key={label} className={wide ? "sheet__cell sheet__cell--wide" : "sheet__cell"}>
								<span className="sheet__label">{label}</span>
								{value}
							</div>
						))}
					</div>
				)}
				{header.description && <p className="sheet__description">{header.description}</p>}
			</div>

			{session.blocks.map((block, i) => {
				const t = times[i];
				const when = `${t.from}–${t.to} min`;
				if (block.kind !== "drill") {
					return (
						<div key={block.id} className="sheet__part sheet__pause">
							<strong>
								{block.kind === "custom" && block.stage.trim()
									? [stages[i], block.label.trim()].filter(Boolean).join(" · ")
									: block.label || (block.kind === "break" ? "Break" : "Block")}
							</strong>
							<span>
								{when} · {formatMinutes(block.minutes)}
							</span>
							{block.notes && <p>{block.notes}</p>}
						</div>
					);
				}
				const board = getBoard(block.boardId);
				const notes = board?.notes;
				const points = notes?.coachingPoints.filter(Boolean) ?? [];
				const variations = notes?.variations.filter(Boolean) ?? [];
				return (
					<table key={block.id} className="sheet__part sheet__activity">
						<thead>
							<tr>
								<th>
									{stages[i]}
									<span className="sheet__when">
										{" "}
										· {when} ({formatMinutes(block.minutes)})
									</span>
								</th>
								<th className="sheet__setup">Set-up</th>
								<th className="sheet__focus">Focus points</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									<div className="sheet__name">
										{board?.meta.title ?? "Missing board"}
										{board && (
											<span className="sheet__type">
												{" "}
												· {BOARD_TYPE_LABELS[board.meta.type].one}
											</span>
										)}
									</div>
									{notes?.players && (
										<p>
											<b>Players:</b> {notes.players}
										</p>
									)}
									{notes?.area && (
										<p>
											<b>Area:</b> {notes.area}
										</p>
									)}
									{notes?.equipment && (
										<p>
											<b>Equipment:</b> {notes.equipment}
										</p>
									)}
									{notes?.description && (
										<p className="sheet__text">
											<b>Organisation:</b> {notes.description}
										</p>
									)}
									{variations.length > 0 && (
										<>
											<p>
												<b>Variations and progressions:</b>
											</p>
											<ul>
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
								</td>
								<td className="sheet__setup">{board && <BoardPreview board={board} />}</td>
								<td className="sheet__focus">
									{points.length > 0 && (
										<ul>
											{points.map((p, j) => (
												<li key={j}>{p}</li>
											))}
										</ul>
									)}
								</td>
							</tr>
						</tbody>
					</table>
				);
			})}
		</div>
	);
}

/** The sheet as it's printed (Ctrl+P); hidden on screen. */
export default function SessionSheet(props: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
}) {
	return (
		<div className="print-sheet" aria-hidden="true">
			<SessionSheetContent {...props} />
		</div>
	);
}
