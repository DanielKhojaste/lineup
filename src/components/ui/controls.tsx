import { ReactNode, useId } from "react";

interface SegmentedProps<T extends string> {
	label: string;
	value: T | null;
	options: { value: T; label: ReactNode; title?: string }[];
	onChange: (value: T) => void;
	/** A short line under the buttons. */
	hint?: string;
}

/** A row of mutually exclusive buttons (a radio group). `value` is null when mixed. */
export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
	hint,
}: SegmentedProps<T>) {
	const id = useId();
	return (
		<div className="field">
			<span className="field__label" id={id}>
				{label}
			</span>
			<div className="segmented" role="radiogroup" aria-labelledby={id}>
				{options.map((o) => (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={value === o.value}
						title={o.title}
						className={`segmented__item${
							value === o.value ? " is-active" : ""
						}`}
						onClick={() => onChange(o.value)}
					>
						{o.label}
					</button>
				))}
			</div>
			{hint && <span className="field__hint">{hint}</span>}
		</div>
	);
}

interface SwatchesProps {
	label: string;
	value: string | null;
	colors: readonly string[];
	onChange: (color: string) => void;
	/** Show a colour picker after the swatches for any other colour (on unless turned off). */
	custom?: boolean;
	/** What the picker opens on when the selection has mixed colours. */
	current?: string;
}

/** The picker only takes #RRGGBB: expand #RGB and drop any transparency. */
function toHex6(color: string): string {
	const hex = color.trim().replace(/^#/, "");
	if (/^[0-9a-f]{3}$/i.test(hex))
		return `#${[...hex].map((c) => c + c).join("")}`.toLowerCase();
	if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) return `#${hex.slice(0, 6)}`.toLowerCase();
	return "#ffffff";
}

export function Swatches({
	label,
	value,
	colors,
	onChange,
	custom = true,
	current,
}: SwatchesProps) {
	const id = useId();
	const isCustom =
		value !== null &&
		!colors.some((c) => c.toUpperCase() === value.toUpperCase());
	return (
		<div className="field">
			<span className="field__label" id={id}>
				{label}
			</span>
			<div className="swatches" role="radiogroup" aria-labelledby={id}>
				{colors.map((color) => {
					const active = value?.toUpperCase() === color.toUpperCase();
					return (
						<button
							key={color}
							type="button"
							role="radio"
							aria-checked={active}
							aria-label={color}
							className={`swatch${active ? " is-active" : ""}`}
							style={{ background: color }}
							onClick={() => onChange(color)}
						/>
					);
				})}
				{custom && (
					<label
						className={`swatch swatch--custom${isCustom ? " is-active" : ""}`}
						title="Other colour"
					>
						<span className="visually-hidden">Other colour</span>
						<input
							type="color"
							// The picker opens on the colour in use (e.g. the team's blue), not white.
							value={toHex6(value ?? current ?? "#ffffff")}
							onChange={(e) => onChange(e.target.value.toUpperCase())}
						/>
					</label>
				)}
			</div>
		</div>
	);
}

/** The shared value of a property across several items, or null when they differ. */
export function common<T, V>(items: T[], get: (item: T) => V): V | null {
	if (items.length === 0) return null;
	const first = get(items[0]);
	return items.every((item) => get(item) === first) ? first : null;
}
