import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { readClipboardText, writeClipboardText } from "../../utils/clipboard";
import { Icon } from "../Icon";

export interface ContextMenuItem {
	label: string;
	onSelect?: () => void;
	/** Shown on the right, e.g. "Ctrl+C". */
	shortcut?: string;
	danger?: boolean;
	disabled?: boolean;
	/** Draws a tick next to the item (for on/off options). */
	checked?: boolean;
	/** Items of a menu that opens to the side. */
	submenu?: ContextMenuEntry[];
}

export type ContextMenuEntry = ContextMenuItem | "separator";

interface Position {
	x: number;
	y: number;
}

interface ContextMenuValue {
	/**
	 * Open a menu at the pointer (or wherever `at` says). Pass the event of a
	 * contextmenu handler so the browser's own menu is cancelled.
	 */
	openMenu: (
		at:
			| Position
			| {
					clientX: number;
					clientY: number;
					button?: number;
					preventDefault?: () => void;
			  },
		entries: ContextMenuEntry[],
	) => void;
	closeMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuValue | null>(null);

export function useContextMenu(): ContextMenuValue {
	const value = useContext(ContextMenuContext);
	if (!value)
		throw new Error("useContextMenu must be used inside <ContextMenuProvider>");
	return value;
}

/** Inputs, text areas and editable text: where Cut / Copy / Paste make sense. */
export function isTextField(
	target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable || target instanceof HTMLTextAreaElement)
		return true;
	return (
		target instanceof HTMLInputElement &&
		!["checkbox", "radio", "range", "color", "button", "submit", "file"].includes(
			target.type,
		)
	);
}

type Field = HTMLInputElement | HTMLTextAreaElement;
const isField = (el: HTMLElement): el is Field =>
	el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/** Some input types (number, email) don't expose a selection; this returns null for them. */
function fieldSelection(el: Field): [number, number] | null {
	try {
		if (el.selectionStart === null || el.selectionEnd === null) return null;
		return [el.selectionStart, el.selectionEnd];
	} catch {
		return null;
	}
}

/** Replace a field's selection (or its whole value) the way typing would, so undo and React both see it. */
function insertIntoField(el: HTMLElement, text: string) {
	el.focus();
	if (document.execCommand("insertText", false, text)) return;
	if (!isField(el)) return;
	// Fallback: set the value and announce it like an edit.
	const range = fieldSelection(el);
	const value = range
		? el.value.slice(0, range[0]) + text + el.value.slice(range[1])
		: text;
	const setter = Object.getOwnPropertyDescriptor(
		Object.getPrototypeOf(el),
		"value",
	)?.set;
	setter?.call(el, value);
	el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Lineup's own Cut / Copy / Paste / Select all menu for text fields, which
 * replaces the browser's (and with it "Inspect" and the like).
 */
function textFieldMenu(el: HTMLElement): ContextMenuEntry[] {
	const editable =
		el.isContentEditable ||
		(isField(el) && !el.readOnly && !el.disabled);

	// Remember the selection now: clicking the menu could move focus.
	let selected = "";
	let restore = () => el.focus();
	if (isField(el)) {
		const range = fieldSelection(el);
		if (range) {
			selected = el.value.slice(range[0], range[1]);
			restore = () => {
				el.focus();
				el.setSelectionRange(range[0], range[1]);
			};
		} else {
			selected = window.getSelection()?.toString() ?? "";
		}
	} else {
		const sel = window.getSelection();
		const saved = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
		selected = sel?.toString() ?? "";
		restore = () => {
			el.focus();
			if (saved) {
				const s = window.getSelection();
				s?.removeAllRanges();
				s?.addRange(saved);
			}
		};
	}
	const hasText = isField(el) ? el.value.length > 0 : !!el.textContent;

	return [
		{
			label: "Cut",
			shortcut: "Ctrl+X",
			disabled: !editable || !selected,
			onSelect: async () => {
				await writeClipboardText(selected);
				restore();
				insertIntoField(el, "");
			},
		},
		{
			label: "Copy",
			shortcut: "Ctrl+C",
			disabled: !selected,
			onSelect: () => void writeClipboardText(selected),
		},
		{
			label: "Paste",
			shortcut: "Ctrl+V",
			disabled: !editable,
			onSelect: async () => {
				const text = await readClipboardText().catch(() => "");
				if (!text) return;
				restore();
				// A single-line field takes the text on one line.
				insertIntoField(
					el,
					el instanceof HTMLInputElement ? text.replace(/\s*\n\s*/g, " ") : text,
				);
			},
		},
		"separator",
		{
			label: "Select all",
			shortcut: "Ctrl+A",
			disabled: !hasText,
			onSelect: () => {
				el.focus();
				if (isField(el)) el.select();
				else {
					const range = document.createRange();
					range.selectNodeContents(el);
					const s = window.getSelection();
					s?.removeAllRanges();
					s?.addRange(range);
				}
			},
		},
	];
}

function MenuList({
	entries,
	position,
	onDone,
	onBack,
	autoFocus,
	submenuOf,
}: {
	entries: ContextMenuEntry[];
	position: Position;
	onDone: () => void;
	/** Closes this submenu (ArrowLeft). */
	onBack?: () => void;
	autoFocus: boolean;
	/** The item a submenu opens from; it's placed beside it instead of at `position`. */
	submenuOf?: DOMRect;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [place, setPlace] = useState<Position | null>(null);
	const [open, setOpen] = useState<{ index: number; rect: DOMRect; focus: boolean } | null>(
		null,
	);
	const closeTimer = useRef<number>(0);

	// Keep the menu on screen: flip it left or up when it would run off an edge.
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const { width, height } = el.getBoundingClientRect();
		const margin = 6;
		let x = position.x;
		let y = position.y;
		if (submenuOf) {
			x = submenuOf.right - 2;
			y = submenuOf.top - 5;
			if (x + width > window.innerWidth - margin) x = submenuOf.left - width + 2;
		} else if (x + width > window.innerWidth - margin) {
			x = Math.max(margin, x - width);
		}
		if (y + height > window.innerHeight - margin)
			y = Math.max(margin, window.innerHeight - margin - height);
		setPlace({ x: Math.max(margin, x), y: Math.max(margin, y) });
	}, [position, submenuOf]);

	useEffect(() => {
		if (autoFocus && place)
			ref.current
				?.querySelector<HTMLButtonElement>("button:not(:disabled)")
				?.focus();
	}, [autoFocus, place]);

	const buttons = () => [
		...(ref.current?.querySelectorAll<HTMLButtonElement>(
			":scope > button:not(:disabled)",
		) ?? []),
	];

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.target instanceof HTMLElement && !ref.current?.contains(e.target))
			return;
		const list = buttons();
		const index = list.indexOf(document.activeElement as HTMLButtonElement);
		if (index === -1 && e.key !== "Escape") return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			e.stopPropagation();
			const next =
				list[(index + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length];
			next?.focus();
		} else if (e.key === "ArrowRight") {
			const button = list[index];
			const i = Number(button?.dataset.index);
			const entry = entries[i];
			if (entry !== "separator" && entry?.submenu) {
				e.preventDefault();
				e.stopPropagation();
				setOpen({ index: i, rect: button.getBoundingClientRect(), focus: true });
			}
		} else if (e.key === "ArrowLeft" && onBack) {
			e.preventDefault();
			e.stopPropagation();
			onBack();
		}
	};

	return (
		<div
			ref={ref}
			className="menu__list context-menu"
			role="menu"
			style={{
				left: place?.x ?? position.x,
				top: place?.y ?? position.y,
				visibility: place ? "visible" : "hidden",
			}}
			onKeyDown={onKeyDown}
			onContextMenu={(e) => e.preventDefault()}
		>
			{entries.map((entry, i) =>
				entry === "separator" ? (
					// Separators at the start, at the end or next to another are dropped.
					i === 0 ||
					i === entries.length - 1 ||
					entries[i - 1] === "separator" ? null : (
						<div key={i} className="menu__separator" role="separator" />
					)
				) : (
					<button
						key={`${i}-${entry.label}`}
						type="button"
						role={entry.checked === undefined ? "menuitem" : "menuitemcheckbox"}
						aria-checked={entry.checked}
						aria-haspopup={entry.submenu ? "menu" : undefined}
						aria-expanded={entry.submenu ? open?.index === i : undefined}
						data-index={i}
						className={`menu__item context-menu__item${
							entry.danger ? " menu__item--danger" : ""
						}${open?.index === i ? " is-open" : ""}`}
						disabled={entry.disabled}
						// Keep focus (and the text selection) where it was when clicking.
						onPointerDown={(e) => e.preventDefault()}
						onPointerEnter={(e) => {
							window.clearTimeout(closeTimer.current);
							if (entry.submenu) {
								const rect = e.currentTarget.getBoundingClientRect();
								setOpen({ index: i, rect, focus: false });
							} else if (open) {
								closeTimer.current = window.setTimeout(() => setOpen(null), 150);
							}
						}}
						onClick={(e) => {
							e.stopPropagation();
							if (entry.submenu) {
								setOpen({
									index: i,
									rect: e.currentTarget.getBoundingClientRect(),
									focus: e.detail === 0,
								});
								return;
							}
							onDone();
							entry.onSelect?.();
						}}
					>
						<span className="context-menu__check" aria-hidden="true">
							{entry.checked && <Icon name="check" size={14} />}
						</span>
						<span className="context-menu__label">{entry.label}</span>
						{entry.shortcut && (
							<span className="context-menu__shortcut">{entry.shortcut}</span>
						)}
						{entry.submenu && (
							<span className="context-menu__more" aria-hidden="true">
								<Icon name="chevronRight" size={14} />
							</span>
						)}
					</button>
				),
			)}
			{open &&
				(() => {
					const entry = entries[open.index];
					if (entry === "separator" || !entry.submenu) return null;
					return (
						<MenuList
							key={open.index}
							entries={entry.submenu}
							position={{ x: open.rect.right, y: open.rect.top }}
							submenuOf={open.rect}
							autoFocus={open.focus}
							onDone={onDone}
							onBack={() => {
								setOpen(null);
								(
									ref.current?.querySelector(
										`:scope > button[data-index="${open.index}"]`,
									) as HTMLButtonElement | null
								)?.focus();
							}}
						/>
					);
				})()}
		</div>
	);
}

/**
 * Right-click menus for the whole app. The browser's own menu never shows:
 * text fields get Lineup's Cut / Copy / Paste menu, and other parts of the app
 * open their menus with `useContextMenu().openMenu`.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
	const [menu, setMenu] = useState<{
		position: Position;
		entries: ContextMenuEntry[];
		/** Opened from the keyboard: focus its first item. */
		keyboard: boolean;
		/** Where it's drawn: an open dialog sits in the top layer, so a menu opened over one goes inside it. */
		container: HTMLElement;
	} | null>(null);
	const returnFocus = useRef<HTMLElement | null>(null);

	const closeMenu = useCallback(() => setMenu(null), []);

	const openMenu = useCallback<ContextMenuValue["openMenu"]>((at, entries) => {
		if ("preventDefault" in at) at.preventDefault?.();
		const position = "clientX" in at ? { x: at.clientX, y: at.clientY } : at;
		returnFocus.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// The menu key and Shift+F10 open menus too; then the first item gets
		// focus so the arrow keys work straight away.
		const keyboard = !("button" in at) || at.button !== 2;
		const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
		const container = dialogs[dialogs.length - 1] ?? document.body;
		setMenu({ position, entries, keyboard, container });
	}, []);

	// The fallback for anything without its own menu: text fields get Cut / Copy
	// / Paste, everything else gets nothing (never the browser's menu).
	useEffect(() => {
		const onContextMenu = (e: MouseEvent) => {
			if (e.defaultPrevented) return;
			e.preventDefault();
			if (!isTextField(e.target)) return;
			let { clientX, clientY } = e;
			if (e.button !== 2) {
				// From the keyboard: open under the field rather than at 0, 0.
				const r = (e.target as HTMLElement).getBoundingClientRect();
				clientX = r.left + 8;
				clientY = r.bottom;
			}
			openMenu(
				{ clientX, clientY, button: e.button },
				textFieldMenu(e.target as HTMLElement),
			);
		};
		window.addEventListener("contextmenu", onContextMenu);
		return () => window.removeEventListener("contextmenu", onContextMenu);
	}, [openMenu]);

	// Close on a click elsewhere, Escape, scrolling, resizing or leaving the window.
	useEffect(() => {
		if (!menu) return;
		const close = () => setMenu(null);
		const onPointerDown = (e: PointerEvent) => {
			if (!(e.target as Element).closest?.(".context-menu")) close();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				close();
				returnFocus.current?.focus();
			} else if (e.key === "Tab") {
				e.preventDefault();
			} else if (
				(e.key === "ArrowDown" || e.key === "ArrowUp") &&
				!(document.activeElement as Element | null)?.closest?.(".context-menu")
			) {
				// Opened with the mouse: the arrow keys move into the menu.
				e.preventDefault();
				e.stopPropagation();
				const items = document.querySelectorAll<HTMLButtonElement>(
					".context-menu > button:not(:disabled)",
				);
				items[e.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
			}
		};
		const onScroll = (e: Event) => {
			if (!(e.target as Element).closest?.(".context-menu")) close();
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("keydown", onKey, true);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("wheel", onScroll, true);
		window.addEventListener("resize", close);
		window.addEventListener("blur", close);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("keydown", onKey, true);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("wheel", onScroll, true);
			window.removeEventListener("resize", close);
			window.removeEventListener("blur", close);
		};
	}, [menu]);

	const value = useMemo(() => ({ openMenu, closeMenu }), [openMenu, closeMenu]);

	return (
		<ContextMenuContext.Provider value={value}>
			{children}
			{menu &&
				createPortal(
					<MenuList
						// A new menu (even at the same spot) starts fresh.
						key={`${menu.position.x},${menu.position.y},${menu.entries.length}`}
						entries={menu.entries}
						position={menu.position}
						autoFocus={menu.keyboard}
						onDone={closeMenu}
					/>,
					menu.container,
				)}
		</ContextMenuContext.Provider>
	);
}
