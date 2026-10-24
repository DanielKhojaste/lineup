import { ReactNode, useEffect, useId, useRef, useState } from "react";

export interface MenuItem {
	label: string;
	onSelect: () => void;
	danger?: boolean;
	disabled?: boolean;
}

interface MenuProps {
	/** Accessible name of the button that opens the menu. */
	label: string;
	button: ReactNode;
	items: (MenuItem | "separator")[];
	buttonClassName?: string;
	align?: "start" | "end";
}

/** A button that opens a small list of actions. Arrow keys move, Escape closes. */
export function Menu({
	label,
	button,
	items,
	buttonClassName = "icon-button",
	align = "end",
}: MenuProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const id = useId();

	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		listRef.current
			?.querySelector<HTMLButtonElement>("button:not(:disabled)")
			?.focus();
		return () => document.removeEventListener("pointerdown", onPointer);
	}, [open]);

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			setOpen(false);
			rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
			return;
		}
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const buttons = [
			...(listRef.current?.querySelectorAll<HTMLButtonElement>(
				"button:not(:disabled)",
			) ?? []),
		];
		const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
		const next =
			buttons[
				(index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) %
					buttons.length
			];
		next?.focus();
	};

	return (
		<div className="menu" ref={rootRef} onKeyDown={onKeyDown}>
			<button
				type="button"
				className={buttonClassName}
				aria-label={label}
				title={label}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
				onClick={(e) => {
					e.stopPropagation();
					setOpen((o) => !o);
				}}
			>
				{button}
			</button>
			{open && (
				<div
					className={`menu__list menu__list--${align}`}
					role="menu"
					id={id}
					ref={listRef}
				>
					{items.map((item, i) =>
						item === "separator" ? (
							<div key={i} className="menu__separator" role="separator" />
						) : (
							<button
								key={item.label}
								type="button"
								role="menuitem"
								className={`menu__item${
									item.danger ? " menu__item--danger" : ""
								}`}
								disabled={item.disabled}
								onClick={(e) => {
									e.stopPropagation();
									setOpen(false);
									item.onSelect();
								}}
							>
								{item.label}
							</button>
						),
					)}
				</div>
			)}
		</div>
	);
}
