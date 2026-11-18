import { useEffect, useMemo, useRef, useState } from "react";

/** Does this computer show times as 6:30 PM (rather than 18:30)? */
export function uses12Hours(): boolean {
	try {
		const cycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
		return cycle === "h11" || cycle === "h12";
	} catch {
		return false;
	}
}

/** "18:30" → "6:30 PM" (or "18:30" on 24-hour computers). */
export function showTime(value: string, twelve: boolean): string {
	const [h, m] = value.split(":").map(Number);
	if (!twelve) return value;
	return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * What the coach typed, as "HH:MM": "6", "6p", "6pm", "6:30", "630",
 * "6.30 pm", "18", "1830". Without AM or PM, 1 to 7 is taken as the evening
 * (training is mostly after school or work) and 8 to 11 as the morning.
 */
export function parseTime(text: string): string | null {
	const t = text.trim().toLowerCase().replace(/\s+/g, "");
	const m = t.match(/^(\d{1,2})(?:[:.h]?(\d{2}))?(a|am|p|pm)?$/);
	if (!m) return null;
	let h = Number(m[1]);
	const min = m[2] ? Number(m[2]) : 0;
	if (min > 59 || h > 23) return null;
	const suffix = m[3]?.[0];
	if (suffix) {
		if (h < 1 || h > 12) return null;
		h = (h % 12) + (suffix === "p" ? 12 : 0);
	} else if (h >= 1 && h <= 7) h += 12;
	return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Every half hour of the day. */
const SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

/**
 * A time, typed or picked (like Google Calendar): one box; type "6p", "18:30"
 * or "630", or pick from the list of half hours under it (scrolled to the
 * evening, the time closest to what's typed highlighted). Empty is no time.
 */
export default function TimeCombo({
	value,
	onChange,
	label,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	label: string;
}) {
	const twelve = uses12Hours();
	const [text, setText] = useState(value ? showTime(value, twelve) : "");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => setText(value ? showTime(value, twelve) : ""), [value, twelve]);

	// The slot to highlight: the one at or just after what's typed, or the time already set, or 6 PM.
	const target = useMemo(() => {
		const typed = parseTime(text);
		const t = typed ?? value ?? "18:00";
		const i = SLOTS.findIndex((s) => s >= t);
		return i === -1 ? SLOTS.length - 1 : i;
	}, [text, value]);

	useEffect(() => {
		if (!open) return;
		const i = active >= 0 ? active : target;
		listRef.current?.children[i]?.scrollIntoView({ block: active >= 0 ? "nearest" : "center" });
	}, [open, target, active]);

	const commit = (t: string | null) => {
		onChange(t);
		setText(t ? showTime(t, twelve) : "");
		setOpen(false);
		setActive(-1);
	};

	return (
		<span className="time-combo">
			<input
				className="field__input time-combo__input"
				aria-label={label}
				role="combobox"
				aria-expanded={open}
				aria-autocomplete="list"
				placeholder={twelve ? "e.g., 6:30 PM" : "e.g., 18:30"}
				value={text}
				onFocus={() => setOpen(true)}
				onChange={(e) => {
					setText(e.target.value);
					setOpen(true);
					setActive(-1);
				}}
				onBlur={() => {
					// Typed something it understands: keep it; emptied: no time; else back to what it was.
					if (!text.trim()) commit(null);
					else commit(parseTime(text) ?? value);
				}}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						setOpen(true);
						const from = active >= 0 ? active : target;
						setActive(Math.max(0, Math.min(SLOTS.length - 1, from + (e.key === "ArrowDown" ? 1 : -1))));
					} else if (e.key === "Enter") {
						e.preventDefault();
						commit(active >= 0 ? SLOTS[active] : text.trim() ? (parseTime(text) ?? value) : null);
					} else if (e.key === "Escape" && open) {
						e.stopPropagation();
						setOpen(false);
						setText(value ? showTime(value, twelve) : "");
					}
				}}
			/>
			{value && (
				<button
					type="button"
					className="icon-button icon-button--small time-combo__clear"
					aria-label="No time"
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => commit(null)}
				>
					×
				</button>
			)}
			{open && (
				<ul className="time-combo__list" role="listbox" ref={listRef}>
					{SLOTS.map((s, i) => (
						<li
							key={s}
							role="option"
							aria-selected={s === value}
							className={`time-combo__option${i === (active >= 0 ? active : target) ? " is-active" : ""}${s === value ? " is-current" : ""}`}
							onMouseDown={(e) => {
								e.preventDefault();
								commit(s);
							}}
						>
							{showTime(s, twelve)}
						</li>
					))}
				</ul>
			)}
		</span>
	);
}
