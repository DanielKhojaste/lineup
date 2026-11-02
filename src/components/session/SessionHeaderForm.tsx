import { useMemo, useState } from "react";
import { SessionHeader } from "../../model/session";
import { SPORT_INFO, SPORTS } from "../../model/sports";
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

	// Topics used in other sessions count as the coach's own suggestions.
	const own = useMemo(
		() => library.sessions.flatMap((s) => s.header.topics),
		[library.sessions],
	);
	const query = draft.trim().toLowerCase();
	const suggestions = suggestedTopics(sport, own).filter(
		(t) => !has(t) && (!query || t.toLowerCase().includes(query)),
	);
	const shown = showAll || query ? suggestions : suggestions.slice(0, SUGGESTIONS_SHOWN);

	const add = (topic: string) => {
		const t = topic.trim();
		setDraft("");
		if (t && !has(t)) set([...topics, t]);
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

/** Planned length as two boxes: hours and minutes. */
function DurationField() {
	const { state, dispatch } = useSessionEditor();
	const total = state.session.header.plannedMinutes ?? 0;
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
						value={total ? minutes : ""}
						onChange={(e) => set(hours, Math.min(59, num(e.target.value)))}
					/>
					<span className="muted">min</span>
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
						<p className="field__error">Give the session a title.</p>
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
					<label className="field__label" htmlFor="session-sport">
						Sport
					</label>
					<select
						id="session-sport"
						className="field__input"
						value={header.sport}
						onChange={(e) => update({ sport: e.target.value as SessionHeader["sport"] })}
					>
						<option value="">Any sport</option>
						{SPORTS.map((s) => (
							<option key={s} value={s}>
								{SPORT_INFO[s].name}
							</option>
						))}
					</select>
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
					open={!!(header.equipment || header.area)}
				>
					<summary>More details (optional)</summary>
					<div className="disclosure__body session-header__more">
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
