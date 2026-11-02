import { BOARD_TYPE_LABELS } from "../../model/board";
import {
	blockTimes,
	formatMinutes,
	Session,
	sessionTitle,
	totalMinutes,
} from "../../model/session";
import { SPORT_INFO } from "../../model/sports";
import { Board } from "../../model/types";
import BoardPreview from "../board/BoardPreview";

/**
 * The printable session sheet: a header table like a coach's session plan,
 * then one row per block with its time, what happens and the drill's diagram.
 * Only shown when printing (or saving as PDF).
 */
export default function SessionSheet({
	session,
	getBoard,
}: {
	session: Session;
	getBoard: (id: string) => Board | undefined;
}) {
	const { header } = session;
	const times = blockTimes(session);
	const total = totalMinutes(session);
	const rows: [string, string][] = [
		["Age group or team", header.team],
		["Sport", header.sport ? SPORT_INFO[header.sport].name : ""],
		["Topics", header.topics.join(" · ")],
		[
			"Time",
			[
				header.plannedMinutes ? formatMinutes(header.plannedMinutes) : "",
				total && total !== header.plannedMinutes
					? `(activities add up to ${formatMinutes(total)})`
					: "",
			]
				.filter(Boolean)
				.join(" ") || (total ? formatMinutes(total) : ""),
		],
		["Equipment", header.equipment],
		["Area", header.area],
	];

	return (
		<div className="print-sheet" aria-hidden="true">
			<h1 className="sheet__title">{sessionTitle(session)}</h1>
			{header.description && <p className="sheet__description">{header.description}</p>}
			<table className="sheet__header">
				<tbody>
					{rows
						.filter(([, value]) => value)
						.map(([label, value]) => (
							<tr key={label}>
								<th scope="row">{label}</th>
								<td>{value}</td>
							</tr>
						))}
				</tbody>
			</table>

			<table className="sheet__blocks">
				<thead>
					<tr>
						<th className="sheet__time">Time</th>
						<th>Activity</th>
						<th className="sheet__diagram">Set-up</th>
					</tr>
				</thead>
				<tbody>
					{session.blocks.map((block, i) => {
						const t = times[i];
						const board = block.kind === "drill" ? getBoard(block.boardId) : undefined;
						const title =
							block.kind === "drill"
								? board?.meta.title ?? "Missing board"
								: block.label || (block.kind === "break" ? "Break" : "Block");
						const points = board?.notes.coachingPoints.filter(Boolean) ?? [];
						return (
							<tr key={block.id} className={`sheet__row sheet__row--${block.kind}`}>
								<td className="sheet__time">
									<strong>{`${t.from}–${t.to} min`}</strong>
									<div>{formatMinutes(block.minutes)}</div>
								</td>
								<td>
									<div className="sheet__activity">
										{title}
										{board && (
											<span className="sheet__type">
												{" "}
												· {BOARD_TYPE_LABELS[board.meta.type].one}
											</span>
										)}
									</div>
									{board && (
										<div className="sheet__facts">
											{[board.notes.players, board.notes.area, board.notes.equipment]
												.filter(Boolean)
												.join(" · ")}
										</div>
									)}
									{board?.notes.description && <p>{board.notes.description}</p>}
									{points.length > 0 && (
										<ul>
											{points.map((p, j) => (
												<li key={j}>{p}</li>
											))}
										</ul>
									)}
									{block.notes && <p className="sheet__notes">{block.notes}</p>}
								</td>
								<td className="sheet__diagram">
									{board && <BoardPreview board={board} />}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
