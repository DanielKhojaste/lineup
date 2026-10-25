import { useEffect, useRef, useState } from "react";
import { setPreferences, usePreferences } from "../../state/preferences";
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
import PitchPicker from "./PitchPicker";

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
	const preferences = usePreferences();

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
					<h3>New boards</h3>
					<PitchPicker
						label="Default sport"
						value={preferences.defaultPitch}
						onChange={(defaultPitch) => setPreferences({ defaultPitch })}
					/>
					<p className="muted small">
						New boards start with this sport. Pick another one from the arrow
						next to New board, or change a board's sport in its settings.
					</p>
				</section>

				<section className="dialog__section">
					<h3>Appearance</h3>
					<div className="theme-picker">
						<ThemePreview settings={theme} />
						<div className="field">
							<label className="field__label" htmlFor="theme-select">
								Theme
							</label>
							<select
								id="theme-select"
								className="field__input"
								value={theme.preset}
								onChange={(e) => {
									const preset = THEME_PRESETS.find(
										(p) => p.preset === e.target.value,
									);
									if (preset) setTheme(preset);
								}}
							>
								{THEME_PRESETS.map((preset) => (
									<option key={preset.preset} value={preset.preset}>
										{preset.name} ({preset.mode === "dark" ? "dark" : "light"})
									</option>
								))}
								{theme.preset === "custom" && (
									<option value="custom">Custom</option>
								)}
							</select>
						</div>
					</div>

					<details className="disclosure">
						<summary>Customise colours</summary>
						<div className="disclosure__body">
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
								Changing a colour switches the theme to Custom. Text on your
								colours turns light or dark automatically so it stays readable.
							</p>
						</div>
					</details>
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
