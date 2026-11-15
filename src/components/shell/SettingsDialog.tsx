import { Segmented } from "../ui/controls";
import { MARKER_SCALES } from "../../config/sizes";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setPreferences, usePreferences } from "../../state/preferences";
import { Shortcut, SHORTCUTS } from "../../state/useShortcuts";
import { isHexColor, normalizeHex } from "../../theme/color";
import {
	THEME_PRESETS,
	ThemeMode,
	ThemePreset,
	ThemeSettings,
	themeTokens,
} from "../../theme/themes";
import { addUserTheme, findTheme, useUserThemes } from "../../theme/userThemes";
import ThemeEffectControls from "./ThemeEffectControls";
import { INTERFACE_SCALES } from "../../config/sizes";
import { scaleLabel } from "../../app/interfaceScale";
import ThemeActions from "./ThemeActions";
import ThemeDropdown from "./ThemeDropdown";
import { Keys } from "../ui/Keys";
import { useTheme } from "../../theme/ThemeProvider";
import { Icon } from "../Icon";
import PitchPicker from "./PitchPicker";

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
	const navigate = useNavigate();

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	const userThemes = useUserThemes();
	const [saveName, setSaveName] = useState("");
	const current: ThemePreset = findTheme(theme.preset) ?? {
		...theme,
		name: "Custom",
	};

	const saveCustom = () => {
		const saved = addUserTheme({ ...theme, name: saveName || "My theme" });
		setTheme(saved);
		setSaveName("");
	};

	const groups = SHORTCUTS.reduce<Map<Shortcut["group"], Shortcut[]>>((map, s) => {
		map.set(s.group, [...(map.get(s.group) ?? []), s]);
		return map;
	}, new Map());

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
						row
						label="Default sport"
						sizeLabel="Default size"
						value={preferences.defaultPitch}
						onChange={(defaultPitch) => setPreferences({ defaultPitch })}
					/>
					<div className="settings__sizes">
						<Segmented
							label="Player size"
							value={String(preferences.playerScale)}
							options={MARKER_SCALES.map((o) => ({ value: String(o.value), label: o.label }))}
							onChange={(v) => setPreferences({ playerScale: Number(v) })}
						/>
						<Segmented
							label="Equipment size"
							value={String(preferences.equipmentScale)}
							options={MARKER_SCALES.map((o) => ({ value: String(o.value), label: o.label }))}
							onChange={(v) => setPreferences({ equipmentScale: Number(v) })}
						/>
					</div>
					<p className="muted small">
						New boards start with this sport and these sizes. You can pick another
						sport in the New board window. Changing a board's sizes changes these
						too, so new boards look like the last one you worked on.
					</p>
				</section>

				<section className="dialog__section">
					<h3>Appearance</h3>
					<ThemeDropdown value={theme} userThemes={userThemes} onChange={setTheme} />
					<ThemeEffectControls theme={current} />

					<div className="field">
						<span className="field__label" id="interface-size-label">
							Interface size
						</span>
						<div className="segmented interface-size" role="radiogroup" aria-labelledby="interface-size-label">
							{INTERFACE_SCALES.map((scale) => (
								<button
									key={scale}
									type="button"
									role="radio"
									aria-checked={preferences.interfaceScale === scale}
									className={`segmented__item${
										preferences.interfaceScale === scale ? " is-active" : ""
									}`}
									onClick={() => setPreferences({ interfaceScale: scale })}
								>
									{scaleLabel(scale)}
								</button>
							))}
						</div>
						<span className="muted small">Text and controls, everywhere. Ctrl+= and Ctrl+- change it too.</span>
					</div>

					<ThemeActions
						theme={current}
						onImported={setTheme}
						before={
							<button
								type="button"
								className="button button--small"
								onClick={() => {
									onClose();
									navigate("/themes");
								}}
							>
								<Icon name="eye" size={14} />
								Preview all themes
							</button>
						}
					/>

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
							{theme.preset === "custom" && (
								<form
									className="settings__save"
									onSubmit={(e) => {
										e.preventDefault();
										saveCustom();
									}}
								>
									<input
										className="field__input"
										placeholder="Name, e.g. Club colours"
										aria-label="Theme name"
										maxLength={40}
										value={saveName}
										onChange={(e) => setSaveName(e.target.value)}
									/>
									<button type="submit" className="button button--small">
										Save as a theme
									</button>
								</form>
							)}
						</div>
					</details>
				</section>

				<section className="dialog__section">
					<details className="disclosure shortcuts-disclosure">
						<summary>
							<h3>Keyboard shortcuts</h3>
							<span className="muted small">{SHORTCUTS.length} shortcuts</span>
						</summary>
					<div className="shortcuts">
						{[...groups].map(([group, list]) => (
							<div key={group} className="shortcuts__group">
								<h4>{group}</h4>
								<dl>
									{list.map((s) => (
										<div key={s.action} className="shortcuts__row">
											<dt>
												<Keys shortcut={s} />
											</dt>
											<dd>{s.action}</dd>
										</div>
									))}
								</dl>
							</div>
						))}
					</div>
					</details>
				</section>
			</div>
		</dialog>
	);
}
