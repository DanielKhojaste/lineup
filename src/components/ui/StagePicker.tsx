import { useId, useState } from "react";
import { DRILL_STAGES } from "../../model/board";
import { BoardInput } from "./fields";

/**
 * What part of a session a drill is: one of the usual ones ("Warm-up",
 * "Small-sided game (SSG)"…) or the coach's own wording.
 */
export default function StagePicker({
	value,
	onChange,
	label = "Part of the session",
	emptyLabel = "—",
	hideLabel,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	/** What the empty choice says, e.g. "From the drill (Warm-up)". */
	emptyLabel?: string;
	hideLabel?: boolean;
	className?: string;
}) {
	const id = useId();
	const custom = value !== "" && !DRILL_STAGES.includes(value);
	const [typing, setTyping] = useState(custom);

	return (
		<div className={`field stage-picker${className ? ` ${className}` : ""}`}>
			<label htmlFor={id} className={hideLabel ? "visually-hidden" : "field__label"}>
				{label}
			</label>
			<div className="stage-picker__row">
				<select
					id={id}
					className="field__input"
					value={typing || custom ? "__custom" : value}
					onChange={(e) => {
						if (e.target.value === "__custom") {
							setTyping(true);
							return;
						}
						setTyping(false);
						onChange(e.target.value);
					}}
				>
					<option value="">{emptyLabel}</option>
					{DRILL_STAGES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
					<option value="__custom">{custom ? value : "Custom…"}</option>
				</select>
				{(typing || custom) && (
					<span
						className="stage-picker__own"
						onBlur={() => {
							if (!value.trim()) setTyping(false);
						}}
					>
						{/* Typing here is one undo step, like other text fields. */}
						<BoardInput
							label={`${label}: your own`}
							hideLabel
							placeholder="e.g. Technical, Rondo, Match"
							maxLength={60}
							autoFocus={typing && !custom}
							value={value}
							onValue={onChange}
						/>
					</span>
				)}
			</div>
		</div>
	);
}
