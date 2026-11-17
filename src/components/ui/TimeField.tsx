import { useState } from "react";
import { usePreviewChoice } from "../../preview/designs";
import TimeCombo from "./TimeCombo";

/** Does this computer show times as 6:30 PM (rather than 18:30)? */
function uses12Hours(): boolean {
	try {
		const cycle = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle;
		return cycle === "h11" || cycle === "h12";
	} catch {
		return false;
	}
}

const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/**
 * An optional time ("18:30", or none), as an hour, minutes and (on computers
 * that use them) AM or PM, which always shows one: PM until another is picked,
 * since most sessions are after school or work.
 */
export default function TimeField({
	value,
	onChange,
	label,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	/** For screen readers, e.g. "Time" or "Kick-off". */
	label: string;
}) {
	const design = usePreviewChoice("time");
	const twelve = uses12Hours();
	const [h24, m] = value ? value.split(":").map(Number) : [null, null];
	// AM or PM is kept even while there's no time, so it's never blank.
	const [pmPick, setPmPick] = useState(h24 === null ? true : h24 >= 12);
	const pm = h24 === null ? pmPick : h24 >= 12;
	const hour12 = h24 === null ? "" : String(((h24 + 11) % 12) + 1);
	const minutes = m === null ? "00" : String(m).padStart(2, "0");
	const minuteOptions = MINUTES.includes(minutes) ? MINUTES : [...MINUTES, minutes].sort();

	// Preview branch: the "type or pick" box to compare (updates-302).
	if (design === "combo") return <TimeCombo value={value} onChange={onChange} label={label} />;

	const emit = (hour: number | null, minute: string, isPm: boolean) => {
		if (hour === null) return onChange(null);
		const h = twelve ? (hour % 12) + (isPm ? 12 : 0) : hour;
		onChange(`${String(h).padStart(2, "0")}:${minute}`);
	};

	return (
		<span className="time-field" role="group" aria-label={label}>
			<select
				className="field__input time-field__part"
				aria-label="Hour"
				value={twelve ? hour12 : h24 === null ? "" : String(h24)}
				onChange={(e) => emit(e.target.value === "" ? null : Number(e.target.value), minutes, pm)}
			>
				<option value="">--</option>
				{(twelve ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i)).map(
					(h) => (
						<option key={h} value={String(h)}>
							{twelve ? h : String(h).padStart(2, "0")}
						</option>
					),
				)}
			</select>
			<span className="time-field__colon">:</span>
			<select
				className="field__input time-field__part"
				aria-label="Minutes"
				value={minutes}
				disabled={h24 === null}
				onChange={(e) => h24 !== null && onChange(`${String(h24).padStart(2, "0")}:${e.target.value}`)}
			>
				{minuteOptions.map((mm) => (
					<option key={mm} value={mm}>
						{mm}
					</option>
				))}
			</select>
			{twelve && (
				<span className="segmented segmented--small time-field__ampm" role="radiogroup" aria-label="AM or PM">
					{(["AM", "PM"] as const).map((p) => {
						const on = (p === "PM") === pm;
						return (
							<button
								key={p}
								type="button"
								role="radio"
								aria-checked={on}
								className={`segmented__item${on ? " is-active" : ""}`}
								onClick={() => {
									setPmPick(p === "PM");
									if (h24 !== null) emit(Number(hour12), minutes, p === "PM");
								}}
							>
								{p}
							</button>
						);
					})}
				</span>
			)}
		</span>
	);
}
