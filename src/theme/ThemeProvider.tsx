import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	DEFAULT_THEME,
	findPreset,
	sanitizeTheme,
	ThemeSettings,
	themeTokens,
} from "./themes";

const STORAGE_KEY = "lineup.theme";

interface ThemeContextValue {
	theme: ThemeSettings;
	setTheme: (theme: ThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** The saved theme. A preset's colours come from its file, so editing the file changes it. */
export function resolveTheme(saved: ThemeSettings): ThemeSettings {
	if (saved.preset === "custom") return saved;
	const preset = findPreset(saved.preset);
	if (!preset) return { ...saved, preset: "custom" };
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

	useEffect(() => {
		const root = document.documentElement;
		for (const [name, value] of Object.entries(themeTokens(theme))) {
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
		}),
		[theme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
	return context;
}
