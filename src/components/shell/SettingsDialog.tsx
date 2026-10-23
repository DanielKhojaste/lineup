import { useEffect, useRef, useState } from "react";
import { SHORTCUTS } from "../../state/useShortcuts";
import { isHexColor, normalizeHex } from "../../theme/color";
import {
	THEME_PRESETS,
	ThemeMode,
	ThemeSettings,
	themeTokens,
} from "../../theme/themes";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";

function ThemePreview({ settings }: { settings: ThemeSettings }) {
	const t = themeTokens(settings);
	return (
		<span
			className="theme-preview"
			style={{ background: t.bg, borderColor: t.border }}
			aria-hidden="true"
		>
			<span className="theme-preview__bar" style={{ background: t.surface }}>
				<span style={{ background: t.accent }} />
			</span>
			<span className="theme-preview__body">
				<span className="theme-preview__pitch" />
				<span className="theme-preview__side" style={{ background: t.surface }}>
					<span style={{ background: t["chip-bg"] }} />
					<span style={{ background: t.accent }} />
				</span>
			</span>
		</span>
	);
}

function HexColorInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	const [text, setText] = useState(value);
	useEffect(() => setText(value), [value]);

	return (
		<div className="color-input">
			<input
				type="color"
				aria-label={`${label} colour picker`}
				className="field__swatch"
				value={value}
				onChange={(e) => onChange(normalizeHex(e.target.value))}
			/>
			<label className="color-input__text">
				<span className="field__label">{label}</span>
				<input
					className="field__input mono"
					value={text}
					maxLength={7}
					spellCheck={false}
					onChange={(e) => {
						setText(e.target.value);
						if (
							isHexColor(e.target.value) &&
							e.target.value.replace("#", "").length === 6
						) {
							onChange(normalizeHex(e.target.value));
						}
					}}
					onBlur={() => setText(value)}
				/>
			</label>
		</div>
	);
}

export default function SettingsDialog({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const custom = (patch: Partial<ThemeSettings>) =>
		setTheme({ ...theme, ...patch, preset: "custom" });
	const setMode = (mode: ThemeMode) => custom({ mode });

	return (
		<dialog
			ref={ref}
			className="dialog"
			aria-labelledby="settings-title"
			onClose={onClose}
			onClick={(e) => {
				// Clicking the backdrop closes the dialog.
				if (e.target === ref.current) onClose();
			}}
		>
			<div className="dialog__inner">
				<header className="dialog__head">
					<h2 id="settings-title">Settings</h2>
					<button
						type="button"
						className="icon-button"
						aria-label="Close settings"
						onClick={onClose}
					>
						<Icon name="close" size={18} />
					</button>
				</header>

				<section className="dialog__section">
					<h3>Theme</h3>
					<div
						className="theme-grid"
						role="radiogroup"
						aria-label="Theme presets"
					>
						{THEME_PRESETS.map((preset) => {
							const active = theme.preset === preset.preset;
							return (
								<button
									key={preset.preset}
									type="button"
									role="radio"
									aria-checked={active}
									className={`theme-card${active ? " is-active" : ""}`}
									onClick={() => setTheme(preset)}
								>
									<ThemePreview settings={preset} />
									<span className="theme-card__name">
										{preset.name}
										{active && <Icon name="check" size={14} />}
									</span>
								</button>
							);
						})}
					</div>
				</section>

				<section className="dialog__section">
					<h3>
						Customise
						{theme.preset === "custom" && <span className="badge">Custom</span>}
					</h3>
					<div className="customise">
						<div className="field">
							<span className="field__label" id="mode-label">
								Mode
							</span>
							<div
								className="segmented"
								role="radiogroup"
								aria-labelledby="mode-label"
							>
								{(["dark", "light"] as ThemeMode[]).map((mode) => (
									<button
										key={mode}
										type="button"
										role="radio"
										aria-checked={theme.mode === mode}
										className={`segmented__item${
											theme.mode === mode ? " is-active" : ""
										}`}
										onClick={() => setMode(mode)}
									>
										{mode === "dark" ? "Dark" : "Light"}
									</button>
								))}
							</div>
						</div>
						<HexColorInput
							label="Primary"
							value={theme.accent}
							onChange={(accent) => custom({ accent })}
						/>
						<HexColorInput
							label="Secondary"
							value={theme.secondary}
							onChange={(secondary) => custom({ secondary })}
						/>
					</div>
					<p className="muted small">
						Text on your colours switches between light and dark automatically
						so it stays readable.
					</p>
				</section>

				<section className="dialog__section">
					<h3>Keyboard shortcuts</h3>
					<dl className="shortcuts">
						{SHORTCUTS.map((s) => (
							<div key={s.keys} className="shortcuts__row">
								<dt>
									<kbd>{s.keys}</kbd>
								</dt>
								<dd>{s.action}</dd>
							</div>
						))}
					</dl>
				</section>
			</div>
		</dialog>
	);
}
