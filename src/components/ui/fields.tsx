import {
	forwardRef,
	InputHTMLAttributes,
	ReactNode,
	TextareaHTMLAttributes,
	useEffect,
	useId,
	useRef,
} from "react";
import { useEditor } from "../../state/EditorContext";

/**
 * Text fields that edit the board. Everything typed between focusing and
 * leaving a field is recorded as one undo step.
 */
function useGestureHandlers() {
	const { dispatch } = useEditor();
	const focused = useRef(false);

	// A field can disappear while focused (e.g. its marker was deleted), and
	// browsers do not reliably fire blur then, so close the gesture here too.
	useEffect(
		() => () => {
			if (focused.current) dispatch({ type: "endGesture" });
		},
		[dispatch],
	);

	return {
		onFocus: () => {
			focused.current = true;
			dispatch({ type: "beginGesture" });
		},
		onBlur: () => {
			focused.current = false;
			dispatch({ type: "endGesture" });
		},
	};
}

type InputProps = Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"onChange" | "value"
> & {
	label: string;
	value: string;
	onValue: (value: string) => void;
	hideLabel?: boolean;
};

export const BoardInput = forwardRef<HTMLInputElement, InputProps>(
	function BoardInput(
		{ label, value, onValue, hideLabel, className, ...rest },
		ref,
	) {
		const id = useId();
		const gesture = useGestureHandlers();
		return (
			<div className={`field${className ? ` ${className}` : ""}`}>
				<label
					htmlFor={id}
					className={hideLabel ? "visually-hidden" : "field__label"}
				>
					{label}
				</label>
				<input
					ref={ref}
					id={id}
					className="field__input"
					value={value}
					onChange={(e) => onValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
					{...gesture}
					{...rest}
				/>
			</div>
		);
	},
);

type TextareaProps = Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"onChange" | "value"
> & {
	label: string;
	value: string;
	onValue: (value: string) => void;
};

export function BoardTextarea({
	label,
	value,
	onValue,
	...rest
}: TextareaProps) {
	const id = useId();
	const gesture = useGestureHandlers();
	return (
		<div className="field">
			<label htmlFor={id} className="field__label">
				{label}
			</label>
			<textarea
				id={id}
				className="field__input field__input--area"
				value={value}
				onChange={(e) => onValue(e.target.value)}
				{...gesture}
				{...rest}
			/>
		</div>
	);
}

interface ColorFieldProps {
	label: string;
	value: string;
	onValue: (value: string) => void;
}

/** Native colour picker; the change is recorded when the picker closes. */
export function ColorField({ label, value, onValue }: ColorFieldProps) {
	const id = useId();
	const gesture = useGestureHandlers();
	return (
		<div className="field field--color">
			<input
				id={id}
				type="color"
				className="field__swatch"
				value={value}
				onChange={(e) => onValue(e.target.value.toUpperCase())}
				{...gesture}
			/>
			<label htmlFor={id} className="field__label">
				{label}
			</label>
		</div>
	);
}

interface StripeFieldProps {
	value: string | undefined;
	/** Suggested stripe colour when stripes are first added. */
	suggestion: string;
	onValue: (value: string | undefined) => void;
}

/** Optional second kit colour: a "+" until stripes are added, then a picker with a remove button. */
export function StripeField({ value, suggestion, onValue }: StripeFieldProps) {
	const id = useId();
	const gesture = useGestureHandlers();
	if (value === undefined) {
		return (
			<div className="field field--color">
				<button
					id={id}
					type="button"
					className="field__swatch field__swatch--add"
					aria-label="Add stripes"
					title="Add stripes"
					onClick={() => onValue(suggestion)}
				>
					+
				</button>
				<label htmlFor={id} className="field__label">
					Stripes
				</label>
			</div>
		);
	}
	return (
		<div className="field field--color">
			<span className="stripe-field">
				<input
					id={id}
					type="color"
					className="field__swatch"
					value={value}
					onChange={(e) => onValue(e.target.value.toUpperCase())}
					{...gesture}
				/>
				<button
					type="button"
					className="stripe-field__remove"
					aria-label="Remove stripes"
					title="Remove stripes"
					onClick={() => onValue(undefined)}
				>
					×
				</button>
			</span>
			<label htmlFor={id} className="field__label">
				Stripes
			</label>
		</div>
	);
}

export function Section({
	title,
	children,
	aside,
}: {
	title: string;
	children: ReactNode;
	aside?: ReactNode;
}) {
	return (
		<section className="panel-section">
			<div className="panel-section__head">
				<h3 className="panel-section__title">{title}</h3>
				{aside}
			</div>
			{children}
		</section>
	);
}
