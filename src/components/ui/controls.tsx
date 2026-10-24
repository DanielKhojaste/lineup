import { ReactNode, useId } from "react";

interface SegmentedProps<T extends string> {
	label: string;
	value: T | null;
	options: { value: T; label: ReactNode; title?: string }[];
	onChange: (value: T) => void;
}

/** A row of mutually exclusive buttons (a radio group). `value` is null when mixed. */
export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
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
		</div>
	);
}

interface SwatchesProps {
	label: string;
	value: string | null;
	colors: readonly string[];
	onChange: (color: string) => void;
	/** Show a native colour picker after the swatches for any other colour. */
	custom?: boolean;
}

export function Swatches({
	label,
	value,
	colors,
	onChange,
	custom = false,
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
							value={isCustom ? value! : "#ffffff"}
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
