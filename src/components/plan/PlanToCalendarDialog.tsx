import { useState } from "react";
import TeamField from "../ui/TeamField";
import TimeField from "../ui/TimeField";
import {
	addDays,
	layOutWeeks,
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
	onConfirm: (entries: ReturnType<typeof layOutWeeks>, firstDate: string) => void;
}) {
	// Next Monday by default.
	const [start, setStart] = useState(() =>
		toISODate(addDays(startOfWeek(new Date()), 7)),
	);
	const [days, setDays] = useState<number[]>([1, 3]);
	const [time, setTime] = useState("");
	const [team, setTeam] = useState(plan.team);
	const sessionIds = planSessionIds(plan);
	// Week by week: each week's sessions on that week's training days.
	const entries = layOutWeeks(plan.topics.map((week) => week.sessionIds), start, days, {
		time: time || null,
		team,
		planId: plan.id,
	});
	const first = entries[0] && parseISODate(entries[0].date);
	const last =
		entries.length > 0 && parseISODate(entries[entries.length - 1].date);

	return (
		<Modal open={open} title="Add the plan to the calendar" onClose={onClose}>
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
						<span className="field__label">Week 1 starts</span>
						<input
							className="field__input"
							type="date"
							value={start}
							required
							onChange={(e) => setStart(e.target.value)}
						/>
					</label>
					<div className="field">
						<span className="field__label">
							Time <span className="muted">(optional)</span>
						</span>
						<TimeField label="Time" value={time || null} onChange={(t) => setTime(t ?? "")} />
					</div>
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
				<TeamField value={team} onChange={setTeam} />
				<p className="muted">
					{sessionIds.length === 0
						? "This plan has no sessions yet."
						: days.length === 0
						  ? "Pick at least one training day."
						  : first && last
						    ? `${plan.topics.length} week${plan.topics.length === 1 ? "" : "s"}, ${sessionIds.length} session${sessionIds.length === 1 ? "" : "s"}, from ${first.toLocaleDateString(undefined, LONG_DATE)} to ${last.toLocaleDateString(undefined, LONG_DATE)}.`
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
						Add to calendar
					</button>
				</div>
			</form>
		</Modal>
	);
}
