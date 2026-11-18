import TimeCombo from "./TimeCombo";

/**
 * An optional time ("18:30", or none): type it (6p, 630, 18:30) or pick from
 * the half hours under the box. The hour, minutes and AM/PM boxes it replaced
 * are kept on archive/time-field-boxes.
 */
export default function TimeField(props: {
	value: string | null;
	onChange: (value: string | null) => void;
	/** For screen readers, e.g. "Time" or "Kick-off". */
	label: string;
}) {
	return <TimeCombo {...props} />;
}
