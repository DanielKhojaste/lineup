import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { applyPreviewChoices, PREVIEW_CHOICES, PreviewKey, setPreviewChoice, usePreviewChoice } from "./designs";

function ChoiceRow({ k }: { k: PreviewKey }) {
	const value = usePreviewChoice(k);
	const { label, options } = PREVIEW_CHOICES[k];
	return (
		<div className="design-switcher__row">
			<span className="design-switcher__label">{label}</span>
			<div className="segmented segmented--small" role="radiogroup" aria-label={label}>
				{options.map(([id, name]) => (
					<button
						key={id}
						type="button"
						role="radio"
						aria-checked={value === id}
						className={`segmented__item${value === id ? " is-active" : ""}`}
						onClick={() => setPreviewChoice(k, id)}
					>
						{name}
					</button>
				))}
			</div>
		</div>
	);
}

/** The preview branch's panel: switch between the designs to compare, live. */
export default function DesignSwitcher() {
	const [open, setOpen] = useState(() => localStorage.getItem("lineup.preview.open") !== "0");
	useEffect(() => applyPreviewChoices(), []);
	const toggle = () => {
		setOpen(!open);
		localStorage.setItem("lineup.preview.open", open ? "0" : "1");
	};
	return (
		<aside className={`design-switcher${open ? " is-open" : ""}`} aria-label="Designs to compare">
			<button type="button" className="design-switcher__head" onClick={toggle} aria-expanded={open}>
				<Icon name="eye" size={14} />
				Designs to compare
				<Icon name={open ? "chevronDown" : "chevronUp"} size={14} />
			</button>
			{open && (
				<div className="design-switcher__body">
					{(Object.keys(PREVIEW_CHOICES) as PreviewKey[]).map((k) => (
						<ChoiceRow key={k} k={k} />
					))}
					<p className="muted small">Preview branch only. Tell me which ones to keep.</p>
				</div>
			)}
		</aside>
	);
}
