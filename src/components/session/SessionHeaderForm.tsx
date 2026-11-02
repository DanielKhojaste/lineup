import { useState } from "react";
import { SessionHeader } from "../../model/session";
import { SPORT_INFO, SPORTS } from "../../model/sports";
import { useSessionEditor } from "../../state/SessionContext";
import { Icon } from "../Icon";
import { BoardInput, BoardTextarea } from "../ui/fields";

function FocusPoints() {
	const { state, dispatch } = useSessionEditor();
	const points = state.session.header.focusPoints;
	const [draft, setDraft] = useState("");
	const set = (focusPoints: string[]) =>
		dispatch({ type: "updateHeader", patch: { focusPoints } });
	const add = () => {
		const point = draft.trim();
		setDraft("");
		if (!point || points.some((p) => p.toLowerCase() === point.toLowerCase()))
			return;
		set([...points, point]);
	};

	return (
		<div className="field session-header__wide">
			<label className="field__label" htmlFor="focus-point">
				Focus points
			</label>
			<div className="chips">
				{points.map((point) => (
					<span key={point} className="chip">
						{point}
						<button
							type="button"
							className="chip__remove"
							aria-label={`Remove focus point ${point}`}
							onClick={() => set(points.filter((p) => p !== point))}
						>
							<Icon name="close" size={12} />
						</button>
					</span>
				))}
				<input
					id="focus-point"
					className="chip-input"
					placeholder="+ Add a focus point"
					value={draft}
					maxLength={80}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							add();
						}
					}}
					onBlur={add}
				/>
			</div>
		</div>
	);
}

const TEXT_FIELDS: {
	key: keyof SessionHeader;
	label: string;
	placeholder: string;
	wide?: boolean;
}[] = [
	{ key: "team", label: "Team or age group", placeholder: "U12 Girls" },
	{ key: "phase", label: "Phase", placeholder: "Attacking" },
	{ key: "topic", label: "Topic", placeholder: "Attacking transition" },
	{
		key: "principle",
		label: "Principle",
		placeholder: "Beat an opponent 1v1 to create scoring chances",
		wide: true,
	},
	{ key: "area", label: "Area", placeholder: "50 × 30 m" },
	{ key: "equipment", label: "Equipment", placeholder: "Cones, bibs, 2 mini goals", wide: true },
];

/** The top of the session sheet: who it's for, what it works on, and how long. */
export default function SessionHeaderForm() {
	const { state, dispatch } = useSessionEditor();
	const { header, startTime } = state.session;
	const update = (patch: Partial<SessionHeader>) =>
		dispatch({ type: "updateHeader", patch });

	return (
		<section className="session-header" aria-label="Session details">
			<div className="session-header__grid">
				{TEXT_FIELDS.slice(0, 1).map((f) => (
					<BoardInput
						key={f.key}
						label={f.label}
						placeholder={f.placeholder}
						maxLength={120}
						value={header[f.key] as string}
						onValue={(v) => update({ [f.key]: v })}
					/>
				))}
				<div className="field">
					<label className="field__label" htmlFor="session-sport">
						Sport
					</label>
					<select
						id="session-sport"
						className="field__input"
						value={header.sport}
						onChange={(e) =>
							update({ sport: e.target.value as SessionHeader["sport"] })
						}
					>
						<option value="">Any sport</option>
						{SPORTS.map((s) => (
							<option key={s} value={s}>
								{SPORT_INFO[s].name}
							</option>
						))}
					</select>
				</div>
				{TEXT_FIELDS.slice(1).map((f) => (
					<BoardInput
						key={f.key}
						className={f.wide ? "session-header__wide" : undefined}
						label={f.label}
						placeholder={f.placeholder}
						maxLength={f.wide ? 300 : 120}
						value={header[f.key] as string}
						onValue={(v) => update({ [f.key]: v })}
					/>
				))}
				<FocusPoints />
				<div className="field">
					<label className="field__label" htmlFor="session-planned">
						Planned time (min)
					</label>
					<input
						id="session-planned"
						className="field__input"
						type="number"
						min={0}
						max={240}
						placeholder="75"
						value={header.plannedMinutes ?? ""}
						onChange={(e) =>
							update({
								plannedMinutes:
									e.target.value === "" ? null : Number(e.target.value),
							})
						}
					/>
				</div>
				<div className="field">
					<label className="field__label" htmlFor="session-start">
						Start time <span className="muted">(optional)</span>
					</label>
					<div className="time-field">
						<input
							id="session-start"
							className="field__input"
							type="time"
							value={startTime ?? ""}
							onChange={(e) =>
								dispatch({
									type: "setStartTime",
									startTime: e.target.value || null,
								})
							}
						/>
						{startTime && (
							<button
								type="button"
								className="icon-button icon-button--small"
								aria-label="Clear the start time"
								title="Show durations only"
								onClick={() => dispatch({ type: "setStartTime", startTime: null })}
							>
								<Icon name="close" size={14} />
							</button>
						)}
					</div>
				</div>
				<BoardTextarea
					label="Notes"
					rows={2}
					placeholder="Anything else for the session sheet"
					value={header.notes}
					onValue={(notes) => update({ notes })}
				/>
			</div>
		</section>
	);
}
