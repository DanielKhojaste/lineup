import { useId, useMemo, useRef, useState } from "react";
import { Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { useLibrary } from "../../state/LibraryContext";
import { useGestureHandlers } from "./fields";
import ShowAllDialog from "./ShowAllDialog";

/**
 * A sport's mark until there are icons: its first letter ("S" soccer, "B"
 * basketball), or two when another sport starts with the same letter: the
 * initials of a two-word name ("FH" field hockey), else the first two ("FU" futsal).
 */
export function sportLetters(sport: Sport): string {
	const name = SPORT_INFO[sport].name;
	const first = name[0].toUpperCase();
	const shared = SPORTS.some((s) => s !== sport && SPORT_INFO[s].name[0].toUpperCase() === first);
	if (!shared) return first;
	const words = name.split(" ");
	return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

const SPORT_LETTERS = Object.fromEntries(SPORTS.map((s) => [s, sportLetters(s)])) as Record<Sport, string>;

/**
 * The mark beside a team for its sport: two letters for now ("SO", "BA"),
 * the sport's own icon later. Nothing when the sport isn't known.
 */
export function TeamSportMark({ sport }: { sport?: Sport }) {
	if (!sport) return null;
	return (
		<span className="team-mark team-mark--letters" title={SPORT_INFO[sport].name}>
			{SPORT_LETTERS[sport]}
		</span>
	);
}

/** A row in the list: a team, and one of the sports it plays (if any are known). */
interface TeamRow {
	team: string;
	sport?: Sport;
}

/**
 * A team or age group: pick one of the coach's saved teams from the list
 * under the box, or type a new one (it's saved for next time).
 */
export default function TeamField({
	label = "Team",
	value,
	onChange,
	placeholder = "U12 Girls",
	hideLabel = false,
	className = "",
	/** In an editor with undo: a whole edit undoes in one step. */
	undoable = false,
	sport,
}: {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hideLabel?: boolean;
	className?: string;
	undoable?: boolean;
	/** The sport here, if known: a new team gets it, and its teams come first. */
	sport?: Sport;
}) {
	const library = useLibrary();
	const id = useId();
	const gesture = useGestureHandlers();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	// Typing filters the list; just focusing shows every team.
	const [typed, setTyped] = useState(false);
	const listRef = useRef<HTMLUListElement>(null);

	// A team saved before teams had sports: the sports of the sessions and plans it's on.
	const sportsOf = (team: string): Sport[] => {
		const saved = library.teamSports[team];
		if (saved?.length) return saved;
		const key = team.toLowerCase();
		return [
			...new Set([
				...library.sessions.filter((x) => x.header.team.trim().toLowerCase() === key).map((x) => x.header.sport),
				...library.plans.filter((p) => p.sport && p.team.trim().toLowerCase() === key).map((p) => p.sport as Sport),
			]),
		];
	};
	// A team that plays two sports is two rows ("U12 Girls" soccer, "U12 Girls" basketball).
	const options = useMemo(() => {
		const q = typed ? value.trim().toLowerCase() : "";
		const rows: TeamRow[] = library.teams
			.filter((t) => t.toLowerCase().includes(q))
			.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)))
			.flatMap((team) => {
				const sports = sportsOf(team);
				return sports.length ? sports.map((s) => ({ team, sport: s })) : [{ team }];
			});
		// The sport here first.
		return sport
			? [...rows.filter((r) => r.sport === sport), ...rows.filter((r) => r.sport !== sport)]
			: rows;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [library.teams, library.teamSports, library.sessions, library.plans, value, typed, sport]);
	const rowKey = (r: TeamRow) => `${r.team}\u0000${r.sport ?? ""}`;
	// A new team, when the sport isn't known here: which sport is it?
	const [asking, setAsking] = useState<string | null>(null);

	/** "BU10 Black   " is "BU10 Black", and a saved team with the same name (any capitals) is that team. */
	const tidy = (team: string) => {
		const t = team.trim().replace(/\s+/g, " ");
		return library.teams.find((x) => x.toLowerCase() === t.toLowerCase()) ?? t;
	};
	const save = (team: string) => {
		const t = tidy(team);
		if (t !== team) onChange(t);
		if (!t) return;
		const isNew = !library.teams.some((x) => x.toLowerCase() === t.toLowerCase());
		void library.addTeams([t]);
		if (sport) void library.addTeamSport(t, sport);
		else if (isNew) setAsking(t);
	};
	const [showAll, setShowAll] = useState(false);
	const LIMIT = 8;
	const pick = (row: TeamRow) => {
		const team = row.team;
		setShowAll(false);
		setAsking(null);
		onChange(team);
		save(team);
		setOpen(false);
		setActive(-1);
	};
	const show = open && options.length > 0 && !(options.length === 1 && options[0].team === value.trim());

	return (
		<div className={`field team-field ${className}`}>
			<label htmlFor={id} className={hideLabel ? "visually-hidden" : "field__label"}>
				{label}
			</label>
			<input
				id={id}
				className="field__input"
				value={value}
				maxLength={120}
				placeholder={placeholder}
				autoComplete="off"
				role="combobox"
				aria-expanded={show}
				aria-controls={`${id}-list`}
				aria-autocomplete="list"
				onChange={(e) => {
					setAsking(null);
					onChange(e.target.value);
					setTyped(true);
					setOpen(true);
					setActive(-1);
				}}
				onFocus={(e) => {
					setTyped(false);
					setOpen(true);
					if (undoable) gesture.onFocus();
				}}
				onBlur={(e) => {
					setOpen(false);
					save(value);
					if (undoable) gesture.onBlur();
				}}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						setOpen(true);
						const n = options.length;
						if (n) setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
					} else if (e.key === "Enter") {
						if (show && active >= 0) {
							e.preventDefault();
							pick(options[active]);
						}
					} else if (e.key === "Escape" && show) {
						e.stopPropagation();
						setOpen(false);
					}
				}}
			/>
			{show && (
				<ul className="team-field__list" id={`${id}-list`} role="listbox" ref={listRef}>
					{options.slice(0, LIMIT).map((r, i) => (
						<li
							key={rowKey(r)}
							role="option"
							aria-selected={i === active}
							className={`team-field__option${i === active ? " is-active" : ""}${r.team === value ? " is-current" : ""}`}
							title={r.sport ? `${r.team} (${SPORT_INFO[r.sport].name})` : r.team}
							// Before the box loses focus, so the pick lands.
							onMouseDown={(e) => {
								e.preventDefault();
								pick(r);
							}}
						>
							<TeamSportMark sport={r.sport} />
							<span className="team-field__name">{r.team}</span>
						</li>
					))}
					{options.length > LIMIT && (
						<li
							role="option"
							aria-selected={false}
							className="team-field__option team-field__more"
							onMouseDown={(e) => {
								e.preventDefault();
								setOpen(false);
								setShowAll(true);
							}}
						>
							Show all {options.length} teams…
						</li>
					)}
				</ul>
			)}
			{asking && asking === value.trim() && (
				<div className="team-field__ask" role="group" aria-label={`Which sport does ${asking} play?`}>
					<span className="muted small">New team: which sport?</span>
					{SPORTS.map((s) => (
						<button
							key={s}
							type="button"
							className="filter-chip team-field__sport"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								void library.addTeamSport(asking, s);
								setAsking(null);
							}}
						>
							<TeamSportMark sport={s} />
							{SPORT_INFO[s].name}
						</button>
					))}
					<button type="button" className="link-button small" onClick={() => setAsking(null)}>
						Skip
					</button>
				</div>
			)}
			{showAll && (
				<ShowAllDialog
					title="Teams"
					items={options}
					itemKey={rowKey}
					itemText={(r) => `${r.team} ${r.sport ? SPORT_INFO[r.sport].name : ""}`}
					renderItem={(r) => (
						<span className="show-all__team">
							<TeamSportMark sport={r.sport} />
							<span className="show-all__text">{r.team}</span>
							{r.sport && <span className="muted small">{SPORT_INFO[r.sport].name}</span>}
						</span>
					)}
					searchPlaceholder="Search teams"
					onPick={pick}
					onClose={() => setShowAll(false)}
				/>
			)}
		</div>
	);
}
