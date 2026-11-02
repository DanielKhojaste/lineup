import { useState } from "react";
import {
	addDays,
	layOutSessions,
	parseISODate,
	startOfWeek,
	toISODate,
	WEEKDAYS,
} from "../../model/calendar";
import { Plan, planSessionIds } from "../../model/plan";
import { Modal } from "../ui/Dialog";

const LONG_DATE: Intl.DateTimeFormatOptions = {
	weekday: "short",
	day: "numeric",
	month: "short",
	year: "numeric",
};

/**
 * Lay a plan out on the calendar: pick the first day and the training days,
 * and each session goes on the next training day, in order.
 */
export default function PlanToCalendarDialog({
	plan,
	open,
	onClose,
	onConfirm,
}: {
	plan: Plan;
	open: boolean;
	onClose: () => void;
	onConfirm: (entries: ReturnType<typeof layOutSessions>, firstDate: string) => void;
}) {
	// Next Monday by default.
	const [start, setStart] = useState(() =>
		toISODate(addDays(startOfWeek(new Date()), 7)),
	);
	const [days, setDays] = useState<number[]>([1, 3]);
	const [time, setTime] = useState("");
	const [team, setTeam] = useState(plan.team);
	const sessionIds = planSessionIds(plan);
	const entries = layOutSessions(sessionIds, start, days, {
		time: time || null,
		team,
		planId: plan.id,
	});
	const first = entries[0] && parseISODate(entries[0].date);
	const last =
		entries.length > 0 && parseISODate(entries[entries.length - 1].date);

	return (
		<Modal open={open} title="Put the plan on the calendar" onClose={onClose}>
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					if (!entries.length) return;
					onConfirm(entries, entries[0].date);
					onClose();
				}}
			>
				<div className="field-grid">
					<label className="field">
						<span className="field__label">Starting from</span>
						<input
							className="field__input"
							type="date"
							value={start}
							required
							onChange={(e) => setStart(e.target.value)}
						/>
					</label>
					<label className="field">
						<span className="field__label">
							Time <span className="muted">(optional)</span>
						</span>
						<input
							className="field__input"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
						/>
					</label>
				</div>
				<fieldset className="field">
					<legend className="field__label">Training days</legend>
					<div className="day-toggles">
						{WEEKDAYS.map((label, i) => (
							<button
								key={label}
								type="button"
								className={`filter-chip${days.includes(i) ? " is-active" : ""}`}
								aria-pressed={days.includes(i)}
								onClick={() =>
									setDays((d) =>
										d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort(),
									)
								}
							>
								{label}
							</button>
						))}
					</div>
				</fieldset>
				<label className="field">
					<span className="field__label">Team</span>
					<input
						className="field__input"
						value={team}
						maxLength={120}
						placeholder="U12 Girls"
						onChange={(e) => setTeam(e.target.value)}
					/>
				</label>
				<p className="muted">
					{sessionIds.length === 0
						? "This plan has no sessions yet."
						: days.length === 0
						  ? "Pick at least one training day."
						  : first && last
						    ? `${sessionIds.length} session${sessionIds.length === 1 ? "" : "s"}, from ${first.toLocaleDateString(undefined, LONG_DATE)} to ${last.toLocaleDateString(undefined, LONG_DATE)}.`
						    : "Pick a start date."}
				</p>
				<div className="dialog__actions">
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button
						type="submit"
						className="button button--primary"
						disabled={!entries.length}
					>
						Put on calendar
					</button>
				</div>
			</form>
		</Modal>
	);
}
