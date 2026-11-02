import { useId } from "react";
import { FieldVariant, Sport, SPORT_INFO, SPORTS } from "../../model/sports";
import { PitchSettings } from "../../model/types";

/** A sport and a full or half field: used for the default sport and for each board. */
export default function PitchPicker({
	value,
	onChange,
	label = "Sport",
}: {
	value: PitchSettings;
	onChange: (pitch: PitchSettings) => void;
	label?: string;
}) {
	const id = useId();
	const surface = SPORT_INFO[value.sport].surface;
	return (
		<div className="pitch-picker">
			<div className="field">
				<label className="field__label" htmlFor={id}>
					{label}
				</label>
				<select
					id={id}
					className="field__input"
					value={value.sport}
					onChange={(e) =>
						onChange({ ...value, sport: e.target.value as Sport })
					}
				>
					{SPORTS.map((sport) => (
						<option key={sport} value={sport}>
							{SPORT_INFO[sport].name}
						</option>
					))}
				</select>
			</div>
			<div className="field">
				<span className="field__label" id={`${id}-variant`}>
					Size
				</span>
				<div
					className="segmented"
					role="radiogroup"
					aria-labelledby={`${id}-variant`}
				>
					{(["full", "half"] as FieldVariant[]).map((variant) => (
						<button
							key={variant}
							type="button"
							role="radio"
							aria-checked={value.variant === variant}
							className={`segmented__item${
								value.variant === variant ? " is-active" : ""
							}`}
							onClick={() => onChange({ ...value, variant })}
						>
							{variant === "full" ? `Full ${surface}` : `Half ${surface}`}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
