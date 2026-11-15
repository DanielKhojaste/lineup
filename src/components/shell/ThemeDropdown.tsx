import { KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { THEME_PRESETS, ThemePreset, ThemeSettings, themeTokens } from "../../theme/themes";
import { findTheme } from "../../theme/userThemes";
import { Icon } from "../Icon";

/**
 * A theme as a small circle: the primary and secondary as two halves, inside
 * a thin ring of the theme's background.
 */
export function ThemeSwatch({ settings, size = 22 }: { settings: ThemeSettings; size?: number }) {
	const t = themeTokens(
		settings,
		settings.preset === "custom" ? undefined : findTheme(settings.preset),
	);
	return (
		<span
			className="theme-swatch"
			style={{ width: size, height: size, background: t.bg }}
			aria-hidden="true"
		>
			<span
				style={{
					background: `linear-gradient(135deg, ${t.accent} 50%, ${t.secondary} 50%)`,
				}}
			/>
		</span>
	);
}

const modeName = (t: ThemeSettings) => (t.mode === "dark" ? "dark" : "light");

/**
 * The theme list in Settings: a dropdown that shows each theme's swatch, with
 * Lineup's themes, your themes, and Custom while it isn't saved.
 */
export default function ThemeDropdown({
	value,
	userThemes,
	onChange,
	label = "Theme",
}: {
	value: ThemeSettings;
	userThemes: ThemePreset[];
	onChange: (theme: ThemePreset) => void;
	label?: string;
}) {
	const id = useId();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const current: ThemePreset = findTheme(value.preset) ?? { ...value, name: "Custom" };
	const groups: { label: string; themes: ThemePreset[] }[] = [
		{ label: "Lineup themes", themes: THEME_PRESETS },
		...(userThemes.length ? [{ label: "Your themes", themes: userThemes }] : []),
		...(value.preset === "custom"
			? [{ label: "Not saved", themes: [{ ...value, name: "Custom" }] }]
			: []),
	];
	const all = groups.flatMap((g) => g.themes);

	// Close on a click anywhere else.
	useEffect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", away);
		return () => document.removeEventListener("pointerdown", away);
	}, [open]);

	// When the list opens near the bottom of the Settings window, scroll it into view.
	useEffect(() => {
		if (open) listRef.current?.scrollIntoView({ block: "nearest" });
	}, [open]);

	// Keep the highlighted theme in view.
	useEffect(() => {
		if (!open) return;
		listRef.current
			?.querySelector(`[data-index="${active}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [open, active]);

	const show = () => {
		setActive(Math.max(0, all.findIndex((t) => t.preset === value.preset)));
		setOpen(true);
	};
	const pick = (theme: ThemePreset) => {
		if (theme.preset !== "custom") onChange(theme);
		setOpen(false);
		buttonRef.current?.focus();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (!open) {
			if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
				e.preventDefault();
				show();
			}
			return;
		}
		if (e.key === "Escape") {
			// Close the list, not the Settings window.
			e.preventDefault();
			e.stopPropagation();
			setOpen(false);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((i) => Math.min(all.length - 1, i + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => Math.max(0, i - 1));
		} else if (e.key === "Home" || e.key === "End") {
			e.preventDefault();
			setActive(e.key === "Home" ? 0 : all.length - 1);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			pick(all[active]);
		} else if (e.key === "Tab") {
			setOpen(false);
		}
	};

	let index = -1;
	return (
		<div className="field theme-dropdown" ref={rootRef}>
			<span className="field__label" id={`${id}-label`}>
				{label}
			</span>
			<button
				ref={buttonRef}
				type="button"
				className="field__input theme-dropdown__button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-labelledby={`${id}-label ${id}-value`}
				aria-controls={open ? `${id}-list` : undefined}
				aria-activedescendant={open ? `${id}-option-${active}` : undefined}
				onClick={() => (open ? setOpen(false) : show())}
				onKeyDown={onKeyDown}
			>
				<ThemeSwatch settings={value} />
				<span className="theme-dropdown__name" id={`${id}-value`}>
					{current.name} <span className="muted">({modeName(value)})</span>
				</span>
				<Icon name="chevronDown" size={14} />
			</button>
			{open && (
				<ul
					ref={listRef}
					id={`${id}-list`}
					className="theme-dropdown__list"
					role="listbox"
					aria-labelledby={`${id}-label`}
				>
					{groups.map((group) => (
						<li key={group.label} role="presentation">
							<span className="theme-dropdown__group" role="presentation">
								{group.label}
							</span>
							<ul role="group" aria-label={group.label}>
								{group.themes.map((theme) => {
									index++;
									const i = index;
									const selected = theme.preset === value.preset;
									return (
										<li
											key={theme.preset}
											id={`${id}-option-${i}`}
											data-index={i}
											role="option"
											aria-selected={selected}
											className={`theme-dropdown__option${i === active ? " is-active" : ""}${
												selected ? " is-selected" : ""
											}`}
											onPointerEnter={() => setActive(i)}
											onClick={() => pick(theme)}
										>
											<ThemeSwatch settings={theme} />
											<span className="theme-dropdown__name">
												{theme.name} <span className="muted">({modeName(theme)})</span>
											</span>
											{selected && <Icon name="check" size={14} />}
										</li>
									);
								})}
							</ul>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
