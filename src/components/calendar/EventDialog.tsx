import { useState } from "react";
import ColorSwatches from "./ColorSwatches";
import { usePreferences } from "../../state/preferences";
import TeamField from "../ui/TeamField";
import TimeField from "../ui/TimeField";
import { CalendarEntry, describeDay, eventTitle, KIND_COLORS, parseISODate, toISODate } from "../../model/calendar";
import { Modal } from "../ui/Dialog";

/**
 * Add or change a match ("vs Riverside", "@ North FC") or any other event
 * (a meeting, a tournament day, photos…) on the calendar.
 */
export default function EventDialog({
	entry,
	onSave,
	onRemove,
	onClose,
}: {
	entry: CalendarEntry & { isNew?: boolean };
	onSave: (entry: CalendarEntry) => void;
	onRemove: () => void;
	onClose: () => void;
}) {
	const [draft, setDraft] = useState(entry);
	const preferences = usePreferences();
	const set = (patch: Partial<CalendarEntry>) => setDraft((d) => ({ ...d, ...patch }));
	const match = draft.kind === "match";
	const past = draft.date < toISODate(new Date());
	const date = parseISODate(draft.date);

	return (
		<Modal
			open
			title={entry.isNew ? (match ? "Add a match" : "Add an event") : eventTitle(entry)}
			onClose={onClose}
		>
			<form
				className="dialog__section"
				onSubmit={(e) => {
					e.preventDefault();
					const { isNew: _, ...clean } = draft;
					onSave({ ...clean, label: clean.label.trim() });
					onClose();
				}}
			>
				{entry.isNew && (
					<div className="segmented" role="radiogroup" aria-label="Kind">
						{(["match", "event"] as const).map((k) => (
							<button
								key={k}
								type="button"
								role="radio"
								aria-checked={draft.kind === k}
								className={`segmented__item${draft.kind === k ? " is-active" : ""}`}
								onClick={() => set({ kind: k })}
							>
								{k === "match" ? "Match" : "Other event"}
							</button>
						))}
					</div>
				)}
				{match ? (
					<div className="field-grid event-dialog__match">
						<label className="field">
							<span className="field__label">Opponent</span>
							<input
								className="field__input"
								value={draft.label}
								maxLength={120}
								placeholder="Riverside"
								required
								data-autofocus=""
								onChange={(e) => set({ label: e.target.value })}
							/>
						</label>
						<div className="field">
							<span className="field__label">Where</span>
							<div className="segmented" role="radiogroup" aria-label="Home or away">
								{[false, true].map((away) => (
									<button
										key={String(away)}
										type="button"
										role="radio"
										aria-checked={draft.away === away}
										className={`segmented__item${draft.away === away ? " is-active" : ""}`}
										onClick={() => set({ away })}
									>
										{away ? "Away" : "Home"}
									</button>
								))}
							</div>
						</div>
					</div>
				) : (
					<label className="field">
						<span className="field__label">Name</span>
						<input
							className="field__input"
							value={draft.label}
							maxLength={120}
							placeholder="Team photos, parents' meeting, tournament…"
							required
							data-autofocus=""
							onChange={(e) => set({ label: e.target.value })}
						/>
					</label>
				)}
				<div className="field-grid">
					<label className="field">
						<span className="field__label">Date</span>
						<input
							className="field__input"
							type="date"
							required
							value={draft.date}
							onChange={(e) => e.target.value && set({ date: e.target.value })}
						/>
					</label>
					<div className="field">
						<span className="field__label">
							{match ? "Kick-off" : "Time"} <span className="muted">(optional)</span>
						</span>
						<TimeField label="Time" value={draft.time} onChange={(time) => set({ time })} />
					</div>
				</div>
				<TeamField value={draft.team} onChange={(team) => set({ team })} />
				<label className="field">
					<span className="field__label">
						Location <span className="muted">(optional)</span>
					</span>
					<input
						className="field__input"
						value={draft.location}
						maxLength={120}
						placeholder={match ? (draft.away ? "Their ground" : "Pitch 2, Riverside Park") : "Clubhouse"}
						onChange={(e) => set({ location: e.target.value })}
					/>
				</label>
				<div className="field">
					<span className="field__label">Colour</span>
					<ColorSwatches
						label="Colour"
						value={draft.color}
						defaultColor={preferences.calendarColors[draft.kind] || KIND_COLORS[draft.kind]}
						defaultLabel={`The usual for ${match ? "matches" : "events"}`}
						onChange={(color) => set({ color })}
					/>
				</div>
				<label className="field">
					<span className="field__label">
						{match && past ? "Result and notes" : "Notes"} <span className="muted">(optional)</span>
					</span>
					<textarea
						className="field__input field__input--area"
						rows={3}
						maxLength={4000}
						placeholder={
							match
								? past
									? "2–1 win. What worked, what to work on…"
									: "Where, when to meet, what to bring…"
								: "Anything to remember"
						}
						value={draft.log}
						onChange={(e) => set({ log: e.target.value })}
					/>
				</label>
				{date && (
					<p className="muted small">
						{date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} (
						{describeDay(draft.date)})
					</p>
				)}
				<div className="dialog__actions">
					{!entry.isNew && (
						<>
							<button type="button" className="button button--danger-text" onClick={onRemove}>
								Remove
							</button>
							<span className="topbar__spacer" />
						</>
					)}
					<button type="button" className="button" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary">
						{entry.isNew ? "Add" : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
