import { CALENDAR_COLORS } from "../../model/calendar";
import { Icon } from "../Icon";

/**
 * A row of colours to pick from, with "Default" first (the kind's colour, or
 * the theme's). `value` is "" for Default.
 */
export default function ColorSwatches({
	value,
	onChange,
	defaultColor,
	label,
	defaultLabel = "Default",
}: {
	value: string;
	onChange: (color: string) => void;
	/** What Default looks like ("" is the theme's colour). */
	defaultColor: string;
	label: string;
	defaultLabel?: string;
}) {
	const custom = !!value && !CALENDAR_COLORS.some((c) => c.toLowerCase() === value.toLowerCase());
	const swatch = (color: string, name: string) => {
		const on = value.toLowerCase() === color.toLowerCase();
		return (
			<button
				key={color || "default"}
				type="button"
				role="radio"
				aria-checked={on}
				aria-label={name}
				className={`swatch-pick${on ? " is-active" : ""}${color ? "" : " swatch-pick--default"}`}
				style={{ ["--swatch" as string]: color || defaultColor || "var(--accent)" }}
				onClick={() => onChange(color)}
			>
				{on && <Icon name="check" size={12} />}
			</button>
		);
	};
	return (
		<span className="swatch-row" role="radiogroup" aria-label={label}>
			{swatch("", defaultLabel)}
			{CALENDAR_COLORS.map((c) => swatch(c, c))}
			{/* Any other colour: the swatch shows it once picked. */}
			<label
				className={`swatch-pick swatch-pick--custom${custom ? " is-active" : ""}`}
				style={custom ? { ["--swatch" as string]: value } : undefined}
				aria-label="Custom colour"
			>
				{custom ? <Icon name="check" size={12} /> : <Icon name="plus" size={12} />}
				<input
					type="color"
					className="visually-hidden"
					value={custom ? value : "#ffffff"}
					onChange={(e) => onChange(e.target.value.toUpperCase())}
				/>
			</label>
		</span>
	);
}
