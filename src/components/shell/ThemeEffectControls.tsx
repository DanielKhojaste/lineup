import { TESTING_SWITCHES } from "../../testing";
import { setPreferences, usePreferences } from "../../state/preferences";
import { DEFAULT_SPICE, EFFECTS, SpiceSettings } from "../../theme/effects";
import { chosenEffect, ThemePreset } from "../../theme/themes";

const SLIDERS: [keyof SpiceSettings, string, number, number][] = [
	["size", "Size", 0.4, 3],
	["speed", "Speed", 0.1, 4],
	["amount", "Amount", 0.1, 3],
];

const times = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, "")}×`;

/**
 * A theme's moving background: on or off, which one (when the theme has
 * several), and how Dune's spice looks. Used in Settings › Appearance and on
 * the Theme preview page; the choices are kept on this computer, so they
 * stay the same next time.
 */
export default function ThemeEffectControls({ theme }: { theme: ThemePreset }) {
	const { themeEffect, spice, spiceOverBoard } = usePreferences();
	const effects = theme.effects ?? [];
	if (!effects.length) return null;
	const chosen = chosenEffect(theme, themeEffect);
	const choose = (value: string) =>
		setPreferences({ themeEffect: { ...themeEffect, [theme.preset]: value } });
	const isDefault = SLIDERS.every(([key]) => spice[key] === DEFAULT_SPICE[key]);

	return (
		<div className="effect-controls">
			{effects.length === 1 ? (
				<label className="check">
					<input
						type="checkbox"
						checked={chosen !== null}
						onChange={(e) => choose(e.target.checked ? effects[0] : "off")}
					/>
					{EFFECTS[effects[0]].label} in the background
				</label>
			) : (
				<label className="effect-controls__pick">
					<span className="field__label">Moving background</span>
					<select value={chosen ?? "off"} onChange={(e) => choose(e.target.value)}>
						{effects.map((effect) => (
							<option key={effect} value={effect}>
								{EFFECTS[effect].label}
							</option>
						))}
						<option value="off">None</option>
					</select>
				</label>
			)}
			{chosen === "spice" && (
				<div className="spice-settings">
					{SLIDERS.map(([key, label, min, max]) => (
						<label key={key} className="spice-settings__row">
							<span className="field__label">{label}</span>
							<input
								type="range"
								min={min}
								max={max}
								step={0.05}
								value={spice[key]}
								onChange={(e) =>
									setPreferences({ spice: { ...spice, [key]: Number(e.target.value) } })
								}
							/>
							<span className="spice-settings__value">{times(spice[key])}</span>
						</label>
					))}
					<button
						type="button"
						className="link-button"
						disabled={isDefault}
						onClick={() => setPreferences({ spice: { ...DEFAULT_SPICE } })}
					>
						Reset spice particle settings
					</button>
				</div>
			)}
			{TESTING_SWITCHES && chosen && (
				<label className="check effect-controls__dev">
					<input
						type="checkbox"
						checked={spiceOverBoard}
						onChange={(e) => setPreferences({ spiceOverBoard: e.target.checked })}
					/>
					Over the board too (for testing; goes before the release)
				</label>
			)}
		</div>
	);
}
