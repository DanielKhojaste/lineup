import { MouseEvent } from "react";
import { Icon } from "../Icon";

/** How a library card takes part in selecting several cards at once. */
export interface CardSelection {
	/** Select mode is on: a click selects instead of opening. */
	selecting: boolean;
	selected: boolean;
	toggle: () => void;
	/** True when this click should select rather than open (select mode, or Ctrl/⌘+click). */
	handles: (e: MouseEvent) => boolean;
}

/** The tick box in a card's corner while selecting. */
export function CardCheck({ checked }: { checked: boolean }) {
	return (
		<span className={`card-check${checked ? " is-checked" : ""}`} aria-hidden="true">
			{checked && <Icon name="check" size={14} />}
		</span>
	);
}
