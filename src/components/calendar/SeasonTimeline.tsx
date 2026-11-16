import { useState } from "react";
import {
	addDays,
	daysBetween,
	parseISODate,
	PHASE_COLORS,
	PhaseColor,
	phaseOn,
	sampleSeason,
	Season,
	SeasonPhase,
	toISODate,
} from "../../model/calendar";
import { newId } from "../../model/board";
import { Icon } from "../Icon";
import { Modal } from "../ui/Dialog";

const short = (date: string) =>
	parseISODate(date)!.toLocaleDateString(undefined, { day: "numeric", month: "short" });

const COLOR_NAMES: Record<PhaseColor, string> = {
	grey: "Grey",
	green: "Green",
	blue: "Blue",
	purple: "Purple",
	amber: "Amber",
	red: "Red",
};

/**
 * The season across the top of the calendar: its phases in proportion, a line
 * at today, and the stretch the calendar is showing. Clicking a phase shows
 * its first week.
 */
export default function SeasonTimeline({
	season,
	today,
	view,
	onJump,
	onEdit,
	onNew,
}: {
	season: Season | undefined;
	today: string;
	/** The first and last day the calendar is showing. */
	view: { start: string; end: string };
	onJump: (date: string) => void;
	onEdit: () => void;
	onNew: () => void;
}) {
	if (!season)
		return (
			<section className="season season--empty" aria-label="Season">
				<span className="muted">
					Lay out your season: pre-season, the playing phases, breaks and tournaments, in a timeline above the
					calendar.
				</span>
				<button type="button" className="button button--small" onClick={onNew}>
					<Icon name="plus" size={14} />
					Add a season
				</button>
			</section>
		);

	const total = daysBetween(season.start, season.end);
	/** Where a date sits along the season, from 0 to 100. */
	const at = (date: string) =>
		Math.min(100, Math.max(0, ((daysBetween(season.start, date) - 1) / total) * 100));
	const span = (start: string, end: string) => at(toISODate(addDays(parseISODate(end)!, 1))) - at(start);
	const weeks = Math.round(total / 7);
	const now = phaseOn(season, today);
	const inSeason = season.start <= today && today <= season.end;
	const showView = view.end >= season.start && view.start <= season.end;

	return (
		<section className="season" aria-label={season.name || "Season"}>
			<div className="season__head">
				<b className="season__name">{season.name || "Season"}</b>
				<span className="muted">
					{short(season.start)} – {short(season.end)} · {weeks} weeks
				</span>
				{now && (
					<span className="season__now">
						Now: {now.name || "Unnamed phase"}, week {Math.ceil(daysBetween(now.start, today) / 7)} of{" "}
						{Math.ceil(daysBetween(now.start, now.end) / 7)}
					</span>
				)}
				<span className="topbar__spacer" />
				<button type="button" className="button button--small" onClick={onNew}>
					<Icon name="plus" size={14} />
					New season
				</button>
				<button type="button" className="button button--small" onClick={onEdit}>
					<Icon name="pencil" size={14} />
					Edit season
				</button>
			</div>
			<div className="season__track">
				{season.phases.map((p) => (
					<button
						key={p.id}
						type="button"
						className={`season__phase season__phase--${p.color}`}
						style={{ left: `${at(p.start)}%`, width: `${span(p.start, p.end)}%` }}
						title={`${p.name || "Unnamed phase"}: ${short(p.start)} – ${short(p.end)}. Click to show it.`}
						onClick={() => onJump(p.start)}
					>
						<span>{p.name}</span>
					</button>
				))}
				{showView && (
					<span
						className="season__view"
						aria-hidden="true"
						style={{ left: `${at(view.start)}%`, width: `${span(view.start, view.end)}%` }}
					/>
				)}
				{inSeason && (
					<span className="season__today" style={{ left: `${at(today)}%` }} title="Today" aria-hidden="true" />
				)}
			</div>
		</section>
	);
}

/** Make or change a season: its name, its dates and its phases. */
export function SeasonDialog({
	season,
	isNew,
	onSave,
	onDelete,
	onClose,
}: {
	season: Season;
	isNew: boolean;
	onSave: (season: Season) => void;
	onDelete: () => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState<Season>(season);
	const set = (patch: Partial<Season>) => setDraft((d) => ({ ...d, ...patch }));
	const setPhase = (id: string, patch: Partial<SeasonPhase>) =>
		set({ phases: draft.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
	const addPhase = () => {
		const last = draft.phases[draft.phases.length - 1];
		const start = last ? toISODate(addDays(parseISODate(last.end)!, 1)) : draft.start;
		const end = toISODate(addDays(parseISODate(start)!, 27));
		const color = PHASE_COLORS[(draft.phases.length + 1) % PHASE_COLORS.length];
		set({ phases: [...draft.phases, { id: newId(), name: "", start, end: end > draft.end ? draft.end : end, color }] });
	};
	const problem =
		draft.end < draft.start
			? "The season ends before it starts."
			: draft.phases.some((p) => p.end < p.start)
				? "A phase ends before it starts."
				: draft.phases.some((p) => p.start < draft.start || p.end > draft.end)
					? "A phase goes outside the season's dates."
					: "";

	return (
		<Modal open title={isNew ? "Add a season" : "Edit season"} onClose={onClose} className="dialog--season">
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					if (problem) return;
					onSave({ ...draft, phases: [...draft.phases].sort((a, b) => a.start.localeCompare(b.start)) });
					onClose();
				}}
			>
				<div className="season-form__top">
					<label className="field">
						<span className="field__label">Name</span>
						<input
							className="field__input"
							value={draft.name}
							maxLength={60}
							placeholder="Season 2026–27"
							data-autofocus=""
							onChange={(e) => set({ name: e.target.value })}
						/>
					</label>
					<label className="field">
						<span className="field__label">Starts</span>
						<input
							className="field__input"
							type="date"
							required
							value={draft.start}
							onChange={(e) => e.target.value && set({ start: e.target.value })}
						/>
					</label>
					<label className="field">
						<span className="field__label">Ends</span>
						<input
							className="field__input"
							type="date"
							required
							value={draft.end}
							onChange={(e) => e.target.value && set({ end: e.target.value })}
						/>
					</label>
				</div>
				<div className="field">
					<span className="field__label">Phases</span>
					<ul className="season-form__phases">
						{draft.phases.map((p) => (
							<li key={p.id} className="season-form__phase">
								<select
									className={`season-form__color season__phase--${p.color}`}
									aria-label="Colour"
									value={p.color}
									onChange={(e) => setPhase(p.id, { color: e.target.value as PhaseColor })}
								>
									{PHASE_COLORS.map((c) => (
										<option key={c} value={c}>
											{COLOR_NAMES[c]}
										</option>
									))}
								</select>
								<input
									className="field__input"
									aria-label="Phase name"
									value={p.name}
									maxLength={60}
									placeholder="Pre-season, In-season, Winter break…"
									onChange={(e) => setPhase(p.id, { name: e.target.value })}
								/>
								<input
									className="field__input"
									type="date"
									aria-label="Phase starts"
									value={p.start}
									onChange={(e) => e.target.value && setPhase(p.id, { start: e.target.value })}
								/>
								<input
									className="field__input"
									type="date"
									aria-label="Phase ends"
									value={p.end}
									onChange={(e) => e.target.value && setPhase(p.id, { end: e.target.value })}
								/>
								<button
									type="button"
									className="icon-button icon-button--small icon-button--danger"
									aria-label={`Remove ${p.name || "phase"}`}
									onClick={() => set({ phases: draft.phases.filter((x) => x.id !== p.id) })}
								>
									<Icon name="trash" size={15} />
								</button>
							</li>
						))}
					</ul>
					<button type="button" className="link-button" onClick={addPhase}>
						+ Add a phase
					</button>
				</div>
				{problem && <p className="field__error">{problem}</p>}
				<div className="dialog__actions">
					{!isNew && (
						<>
							<button type="button" className="button button--danger-text" onClick={onDelete}>
								Delete season
							</button>
							<span className="topbar__spacer" />
						</>
					)}
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary" disabled={!!problem}>
						{isNew ? "Add season" : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}

/** A new season to start from: the usual phases, or (after another season) the year after it. */
export function newSeason(seasons: Season[], today = new Date()): Season {
	const last = [...seasons].sort((a, b) => a.end.localeCompare(b.end)).pop();
	if (!last) return sampleSeason(today);
	const shift = (d: string) => {
		const x = parseISODate(d)!;
		return toISODate(new Date(x.getFullYear() + 1, x.getMonth(), x.getDate()));
	};
	return {
		id: newId(),
		name: last.name.replace(/(\d{4})\D+(\d{2,4})/, (_, a: string, b: string) => {
			const y = Number(a) + 1;
			return `${y}–${String(y + 1).slice(b.length === 2 ? 2 : 0)}`;
		}),
		start: shift(last.start),
		end: shift(last.end),
		phases: last.phases.map((p) => ({ ...p, id: newId(), start: shift(p.start), end: shift(p.end) })),
	};
}
