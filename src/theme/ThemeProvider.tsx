import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	chosenEffect,
	DEFAULT_THEME,
	findPreset,
	sanitizeTheme,
	ThemePreset,
	ThemeSettings,
	themeTokens,
} from "./themes";
import { findTheme, loadUserThemeFiles, useUserThemes } from "./userThemes";
import { usePreferences } from "../state/preferences";
import ThemeEffectLayer from "./ThemeEffectLayer";
import { effectColours } from "./effects";

const STORAGE_KEY = "lineup.theme";
/** The Lineup theme used most recently, to go back to when a theme of yours is deleted. */
const LAST_PRESET_KEY = "lineup.lastPreset";

function lastPreset(): ThemeSettings {
	try {
		const preset = findPreset(localStorage.getItem(LAST_PRESET_KEY) ?? "");
		if (preset) {
			const { mode, accent, secondary } = preset;
			return { preset: preset.preset, mode, accent, secondary };
		}
	} catch {
		// Fall through to the default.
	}
	return DEFAULT_THEME;
}

interface ThemeContextValue {
	theme: ThemeSettings;
	setTheme: (theme: ThemeSettings) => void;
	/** Show this theme's moving background instead, while it's being previewed (null to stop). */
	previewEffect: (theme: ThemePreset | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** The saved theme. A preset's colours come from its file, so editing the file changes it. */
function resolveTheme(saved: ThemeSettings): ThemeSettings {
	if (saved.preset === "custom") return saved;
	const preset = findTheme(saved.preset);
	// A theme of yours that's gone: back to the Lineup theme used last.
	if (!preset) return lastPreset();
	const { mode, accent, secondary } = preset;
	return { preset: saved.preset, mode, accent, secondary };
}

function loadTheme(): ThemeSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? resolveTheme(sanitizeTheme(JSON.parse(raw))) : DEFAULT_THEME;
	} catch {
		return DEFAULT_THEME;
	}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<ThemeSettings>(loadTheme);
	// The Theme preview shows the picked theme's moving background in place of this one's.
	const [previewing, setPreviewing] = useState<ThemePreset | null>(null);
	const userThemes = useUserThemes();

	// Your themes live in Documents/Lineup/themes in the desktop app.
	useEffect(() => {
		void loadUserThemeFiles();
	}, []);

	// The theme in use was deleted from "Your themes": go back to the Lineup
	// theme used most recently (a theme you saved isn't left behind as Custom).
	useEffect(() => {
		if (theme.preset !== "custom" && !findTheme(theme.preset)) setThemeState(lastPreset());
	}, [theme, userThemes]);

	useEffect(() => {
		if (!findPreset(theme.preset)) return;
		try {
			localStorage.setItem(LAST_PRESET_KEY, theme.preset);
		} catch {
			// Storage can be unavailable.
		}
	}, [theme.preset]);

	useEffect(() => {
		const root = document.documentElement;
		const tokens =
			theme.preset === "custom"
				? themeTokens(theme, undefined)
				: themeTokens(theme, findTheme(theme.preset));
		for (const [name, value] of Object.entries(tokens)) {
			root.style.setProperty(`--${name}`, value);
		}
		root.dataset.theme = theme.mode;
		root.style.colorScheme = theme.mode;
	}, [theme]);

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			setTheme: (next) => {
				const clean = sanitizeTheme(next);
				setThemeState(clean);
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
				} catch {
					// Storage can be unavailable (private mode); the theme still applies for this session.
				}
			},
			previewEffect: setPreviewing,
		}),
		[theme],
	);

	const preset = previewing ?? (theme.preset === "custom" ? undefined : findTheme(theme.preset));
	const { themeEffect, spice, spiceOverBoard } = usePreferences();
	const effect = chosenEffect(preset, themeEffect);
	const colours = useMemo(() => preset && effectColours(preset), [preset]);
	return (
		<ThemeContext.Provider value={value}>
			{children}
			{effect && colours && (
				<ThemeEffectLayer
					key={effect}
					effect={effect}
					colours={colours}
					spice={spice}
					overBoard={spiceOverBoard}
				/>
			)}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
	return context;
}
