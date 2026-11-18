import { useId, useMemo, useRef, useState } from "react";
import { useLibrary } from "../../state/LibraryContext";
import { useGestureHandlers } from "./fields";
import ShowAllDialog from "./ShowAllDialog";

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
}: {
	label?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hideLabel?: boolean;
	className?: string;
	undoable?: boolean;
}) {
	const library = useLibrary();
	const id = useId();
	const gesture = useGestureHandlers();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	// Typing filters the list; just focusing shows every team.
	const [typed, setTyped] = useState(false);
	const listRef = useRef<HTMLUListElement>(null);

	const options = useMemo(() => {
		const q = typed ? value.trim().toLowerCase() : "";
		return library.teams
			.filter((t) => t.toLowerCase().includes(q))
			.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)));
	}, [library.teams, value, typed]);

	/** "BU10 Black   " is "BU10 Black", and a saved team with the same name (any capitals) is that team. */
	const tidy = (team: string) => {
		const t = team.trim().replace(/\s+/g, " ");
		return library.teams.find((x) => x.toLowerCase() === t.toLowerCase()) ?? t;
	};
	const save = (team: string) => {
		const t = tidy(team);
		if (t !== team) onChange(t);
		if (t) void library.addTeams([t]);
	};
	const [showAll, setShowAll] = useState(false);
	const LIMIT = 8;
	const pick = (team: string) => {
		setShowAll(false);
		onChange(team);
		save(team);
		setOpen(false);
		setActive(-1);
	};
	const show = open && options.length > 0 && !(options.length === 1 && options[0] === value.trim());

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
					{options.slice(0, LIMIT).map((t, i) => (
						<li
							key={t}
							role="option"
							aria-selected={i === active}
							className={`team-field__option${i === active ? " is-active" : ""}${t === value ? " is-current" : ""}`}
							title={t}
							// Before the box loses focus, so the pick lands.
							onMouseDown={(e) => {
								e.preventDefault();
								pick(t);
							}}
						>
							{t}
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
			{showAll && (
				<ShowAllDialog
					title="Teams"
					items={options}
					itemKey={(t) => t}
					itemText={(t) => t}
					renderItem={(t) => <span className="show-all__text">{t}</span>}
					searchPlaceholder="Search teams"
					onPick={pick}
					onClose={() => setShowAll(false)}
				/>
			)}
		</div>
	);
}
