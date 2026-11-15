import { Fragment, ReactNode } from "react";
import { Shortcut } from "../../state/useShortcuts";

/** Names that are keys on the keyboard, and what's printed on their keycap. */
const KEY_LABELS: Record<string, ReactNode> = {
	Ctrl: "Ctrl",
	Shift: "⇧ Shift",
	Alt: "Alt",
	Esc: "Esc",
	Space: "Space",
	Delete: "Delete",
	"Menu key": "☰ Menu",
};

/** One key drawn as a keycap. */
export function Key({ children, wide }: { children: ReactNode; wide?: boolean }) {
	return <kbd className={`key${wide ? " key--wide" : ""}`}>{children}</kbd>;
}

/** A key, or words like "click" that aren't keys. */
function Part({ text }: { text: string }) {
	if (text === "Arrow keys")
		return (
			<span className="keys__combo" aria-label="Arrow keys">
				{["←", "↑", "↓", "→"].map((arrow) => (
					<Key key={arrow}>{arrow}</Key>
				))}
			</span>
		);
	if (text in KEY_LABELS) return <Key wide={text === "Space"}>{KEY_LABELS[text]}</Key>;
	// Letters, numbers and , . [ ]
	if (/^[A-Z0-9,.[\]]$/.test(text)) return <Key>{text}</Key>;
	return <span className="keys__words">{text}</span>;
}

/** A shortcut drawn as keycaps: "+" between keys pressed together, "or" between two ways of doing it. */
export function Keys({ shortcut }: { shortcut: Shortcut }) {
	return (
		<span className="keys">
			{shortcut.keys.map((combo, i) => (
				<Fragment key={i}>
					{i > 0 && <span className="keys__sep">{shortcut.join ?? "or"}</span>}
					<span className="keys__combo">
						{combo.map((part, j) => (
							<Fragment key={j}>
								{j > 0 && <span className="keys__plus">+</span>}
								<Part text={part} />
							</Fragment>
						))}
					</span>
				</Fragment>
			))}
			{shortcut.note && <span className="keys__words">({shortcut.note})</span>}
		</span>
	);
}
