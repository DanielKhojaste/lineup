import { useMemo, useState } from "react";
import { SessionHeader, totalMinutes } from "../../model/session";
import { SPORT_INFO } from "../../model/sports";
import { SURFACES } from "../board/Pitch";
import SportPickerDialog from "../library/SportPickerDialog";
import { suggestedTopics } from "../../model/topics";
import { useLibrary } from "../../state/LibraryContext";
import { useSessionEditor } from "../../state/SessionContext";
import { Icon } from "../Icon";
import { BoardInput, BoardTextarea } from "../ui/fields";

/** How many suggestions show before "Show all". */
const SUGGESTIONS_SHOWN = 12;

/** Topic tags: suggestions for the sport plus the coach's own, and a box to add new ones. */
function Topics() {
	const { state, dispatch } = useSessionEditor();
	const library = useLibrary();
	const { topics, sport } = state.session.header;
	const [draft, setDraft] = useState("");
	const [showAll, setShowAll] = useState(false);
	const set = (next: string[]) =>
		dispatch({ type: "updateHeader", patch: { topics: next } });
	const has = (t: string) => topics.some((x) => x.toLowerCase() === t.toLowerCase());

	// The coach's own topics (kept in the library) and ones used in other sessions.
	const own = useMemo(
		() => [...library.topics, ...library.sessions.flatMap((s) => s.header.topics)],
		[library.topics, library.sessions],
	);
	const query = draft.trim().toLowerCase();
	const suggestions = suggestedTopics(sport, own).filter(
		(t) => !has(t) && (!query || t.toLowerCase().includes(query)),
	);
	const shown = showAll || query ? suggestions : suggestions.slice(0, SUGGESTIONS_SHOWN);

	const add = (topic: string) => {
		const t = topic.trim();
		setDraft("");
		if (!t || has(t)) return;
		set([...topics, t]);
		// A topic the coach made up is remembered for every session.
		if (!suggestedTopics(sport).some((p) => p.toLowerCase() === t.toLowerCase()))
			void library.addTopics([t]);
	};

	return (
		<div className="field session-header__wide">
			<label className="field__label" htmlFor="session-topic">
				Topics
			</label>
			<div className="chips">
				{topics.map((t) => (
					<span key={t} className="chip">
						{t}
						<button
							type="button"
							className="chip__remove"
							aria-label={`Remove topic ${t}`}
							onClick={() => set(topics.filter((x) => x !== t))}
						>
							<Icon name="close" size={12} />
						</button>
					</span>
				))}
				<input
					id="session-topic"
					className="chip-input"
					placeholder={topics.length ? "+ Add a topic" : "Pick below, or type your own and press Enter"}
					value={draft}
					maxLength={40}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							add(draft);
						}
					}}
				/>
			</div>
			{shown.length > 0 && (
				<div className="topic-suggestions" aria-label="Suggested topics">
					{shown.map((t) => (
						<button
							key={t}
							type="button"
							className="filter-chip"
							onClick={() => add(t)}
						>
							+ {t}
						</button>
					))}
					{!showAll && !query && suggestions.length > SUGGESTIONS_SHOWN && (
						<button type="button" className="link-button" onClick={() => setShowAll(true)}>
							Show all {suggestions.length}
						</button>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * The session's length as two boxes, hours and minutes, or worked out from
 * the plan (the blocks added up) with "From the plan" ticked.
 */
function DurationField() {
	const { state, dispatch } = useSessionEditor();
	const { header } = state.session;
	const auto = header.autoTime;
	const total = auto ? totalMinutes(state.session) : (header.plannedMinutes ?? 0);
	const hours = Math.floor(total / 60);
	const minutes = total % 60;
	const set = (h: number, m: number) => {
		const value = Math.max(0, h) * 60 + Math.max(0, m);
		dispatch({
			type: "updateHeader",
			patch: { plannedMinutes: value > 0 ? value : null },
		});
	};
	const num = (v: string) => (v === "" ? 0 : Math.floor(Number(v)) || 0);

	return (
		<fieldset className="field">
			<legend className="field__label">Time</legend>
			<div className="duration-field">
				<label>
					<input
						className="field__input"
						type="number"
						min={0}
						max={4}
						placeholder="1"
						aria-label="Hours"
						disabled={auto}
						value={total ? hours : ""}
						onChange={(e) => set(num(e.target.value), minutes)}
					/>
					<span className="muted">h</span>
				</label>
				<label>
					<input
						className="field__input"
						type="number"
						min={0}
						max={59}
						step={5}
						placeholder="15"
						aria-label="Minutes"
						disabled={auto}
						value={total ? minutes : ""}
						onChange={(e) => set(hours, Math.min(59, num(e.target.value)))}
					/>
					<span className="muted">min</span>
				</label>
			</div>
			<label className="check duration-field__auto">
				<input
					type="checkbox"
					checked={auto}
					onChange={(e) =>
						dispatch({
							type: "updateHeader",
							patch: {
								autoTime: e.target.checked,
								// Unticking keeps the plan's total as the time to start from.
								...(!e.target.checked && !header.plannedMinutes
									? { plannedMinutes: totalMinutes(state.session) || null }
									: {}),
							},
						})
					}
				/>
				From the plan
			</label>
		</fieldset>
	);
}

/** How many players: two boxes, from and to (either can be left empty). */
function PlayersField() {
	const { state, dispatch } = useSessionEditor();
	const { playersMin, playersMax } = state.session.header;
	const num = (v: string) => (v === "" ? null : Math.floor(Number(v)) || null);
	return (
		<fieldset className="field">
			<legend className="field__label">Players</legend>
			<div className="duration-field">
				<label>
					<input
						className="field__input"
						type="number"
						min={1}
						max={99}
						placeholder="8"
						aria-label="Fewest players"
						value={playersMin ?? ""}
						onChange={(e) =>
							dispatch({ type: "updateHeader", patch: { playersMin: num(e.target.value) } })
						}
					/>
					<span className="muted">to</span>
				</label>
				<label>
					<input
						className="field__input"
						type="number"
						min={1}
						max={99}
						placeholder="12"
						aria-label="Most players"
						value={playersMax ?? ""}
						onChange={(e) =>
							dispatch({ type: "updateHeader", patch: { playersMax: num(e.target.value) } })
						}
					/>
				</label>
			</div>
		</fieldset>
	);
}

/**
 * The session's details: enough for another coach to pick it up and run it.
 * Only the title is required; equipment and area are tucked away.
 */
export default function SessionHeaderForm() {
	const { state, dispatch } = useSessionEditor();
	const { header, meta } = state.session;
	const [titleTouched, setTitleTouched] = useState(false);
	const [pickingSport, setPickingSport] = useState(false);
	const update = (patch: Partial<SessionHeader>) =>
		dispatch({ type: "updateHeader", patch });
	const missingTitle = !meta.title.trim();

	return (
		<section className="session-header" aria-label="Session details">
			<div className="session-header__grid">
				<div
					className="session-header__wide session-header__title"
					onBlur={() => setTitleTouched(true)}
				>
					<BoardInput
						label="Title"
						placeholder="e.g. Playing out from the back"
						maxLength={120}
						required
						aria-invalid={titleTouched && missingTitle}
						autoFocus={missingTitle}
						value={meta.title}
						onValue={(title) => dispatch({ type: "updateMeta", patch: { title } })}
					/>
					{titleTouched && missingTitle && (
						<p className="field__error">Please give the session a title.</p>
					)}
				</div>
				<BoardInput
					label="Age group or team"
					placeholder="U12, or U12 Girls"
					maxLength={120}
					value={header.team}
					onValue={(team) => update({ team })}
				/>
				<div className="field">
					<span className="field__label" id="session-sport-label">
						Sport
					</span>
					<button
						type="button"
						className="sport-chip"
						aria-labelledby="session-sport-label"
						title="Change the session's sport"
						onClick={() => setPickingSport(true)}
					>
						{header.sport ? (
							<span
								className="sport-swatch"
								style={{ background: SURFACES[header.sport].floor }}
								aria-hidden="true"
							/>
						) : (
							<Icon name="grid" size={14} />
						)}
						{header.sport ? SPORT_INFO[header.sport].name : "Any sport"}
						<Icon name="chevronDown" size={14} />
					</button>
					<SportPickerDialog
						open={pickingSport}
						title="Which sport is this session for?"
						confirmLabel="Use this sport"
						initial={header.sport}
						onClose={() => setPickingSport(false)}
						onPick={(sport) => update({ sport })}
					/>
				</div>
				<DurationField />
				<div className="session-header__wide">
					<BoardTextarea
						label="Description"
						rows={3}
						placeholder="What the session works on and how it runs, so another coach could pick it up"
						value={header.description}
						onValue={(description) => update({ description })}
					/>
				</div>
				<Topics />
				<details
					className="disclosure session-header__wide"
					open={!!(header.equipment || header.area || header.playersMin || header.playersMax)}
				>
					<summary>More details (optional)</summary>
					<div className="disclosure__body session-header__more">
						<PlayersField />
						<BoardInput
							label="Equipment"
							placeholder="Cones, bibs, 2 mini goals"
							maxLength={300}
							value={header.equipment}
							onValue={(equipment) => update({ equipment })}
						/>
						<BoardInput
							label="Area"
							placeholder="Half pitch, or 40 × 30 m"
							maxLength={120}
							value={header.area}
							onValue={(area) => update({ area })}
						/>
					</div>
				</details>
			</div>
		</section>
	);
}
