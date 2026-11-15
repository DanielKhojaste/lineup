import { setPreferences, usePreferences } from "../../state/preferences";
import { DEFAULT_SPICE, SpiceSettings } from "../../theme/SpiceEffect";
import { ThemeEffect } from "../../theme/themes";

const SLIDERS: [keyof SpiceSettings, string, number, number][] = [
	["size", "Size", 0.4, 3],
	["speed", "Speed", 0.1, 4],
	["amount", "Amount", 0.1, 3],
];

const times = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, "")}×`;

/**
 * Turning a theme's moving background on or off, and how Dune's spice looks.
 * Used in Settings › Appearance and on the Theme preview page; the choices are
 * kept on this computer, so they stay the same next time.
 */
export default function SpiceControls({ effect }: { effect?: ThemeEffect }) {
	const { themeEffects, spice, spiceOverBoard } = usePreferences();
	if (!effect) return null;
	const isDefault = SLIDERS.every(([key]) => spice[key] === DEFAULT_SPICE[key]);

	return (
		<div className="spice-controls">
			<label className="check">
				<input
					type="checkbox"
					checked={themeEffects}
					onChange={(e) => setPreferences({ themeEffects: e.target.checked })}
				/>
				Drifting spice in the background
			</label>
			{effect === "spice" && themeEffects && (
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
					{import.meta.env.DEV && (
						<label className="check spice-settings__dev">
							<input
								type="checkbox"
								checked={spiceOverBoard}
								onChange={(e) => setPreferences({ spiceOverBoard: e.target.checked })}
							/>
							Over the board too (testing only, not in the app)
						</label>
					)}
				</div>
			)}
		</div>
	);
}
