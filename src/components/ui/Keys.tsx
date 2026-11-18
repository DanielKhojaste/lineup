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
	Enter: "Enter",
	Tab: "Tab",
	"Menu key": "☰ Menu",
};

/** One key drawn as a keycap; `small` for menus and top bars. */
export function Key({ children, wide, small }: { children: ReactNode; wide?: boolean; small?: boolean }) {
	return <kbd className={`key${wide ? " key--wide" : ""}${small ? " key--small" : ""}`}>{children}</kbd>;
}

/**
 * A shortcut written like "Ctrl+Z" or "Ctrl+Enter", drawn as keycaps
 * (Ctrl and Z), for menus and hints in sentences.
 */
export function KeyCombo({ text, small }: { text: string; small?: boolean }) {
	// "Ctrl++" and "Ctrl+-": the last part can itself be + or -.
	const parts = text.endsWith("++") ? [...text.slice(0, -2).split("+"), "+"] : text.split("+");
	return (
		<span className="keys__combo" aria-label={text}>
			{parts.map((part, i) => (
				<Key key={i} small={small} wide={part === "Space"}>
					{KEY_LABELS[part] ?? part}
				</Key>
			))}
		</span>
	);
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
	// Letters, numbers and , . [ ] = -
	if (/^[A-Z0-9,.[\]=-]$/.test(text)) return <Key>{text}</Key>;
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

/** A sentence with its key names ("Hold Shift", "Ctrl+Enter or Esc") drawn as small keycaps. */
export function TextWithKeys({ text }: { text: string }) {
	const parts = text.split(/(Ctrl\+[A-Za-z0-9=-]+|\bShift\b|\bEsc\b|\bEnter\b|\bDelete\b|\bSpace\b)/);
	return (
		<>
			{parts.map((part, i) => (i % 2 ? <KeyCombo key={i} text={part} small /> : part))}
		</>
	);
}
