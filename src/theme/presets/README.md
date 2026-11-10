# Theme files

Each `.json` file in this folder is one theme in Settings › Appearance. Change a
file and the app picks it up (straight away with `npm run tauri dev`); add a file
to add a theme. The file name is the theme's id, so keep it once people use it.

```jsonc
{
	"name": "Amber Night",  // shown in Settings
	"order": 1,             // position in the list
	"mode": "dark",         // "dark" or "light"
	"accent": "#FDB20B",    // the primary colour
	"secondary": "#2C0055", // the secondary colour
	"tokens": {}            // optional: set any colour below by hand
}
```

## How the colours are made

The app makes every other colour from `mode`, `accent` and `secondary`
(`themeTokens` in `src/theme/themes.ts`): text on top of each colour, softer
washes for backgrounds, and versions that stay readable as text.

**A dark secondary in dark mode is lifted.** On a dark theme, a secondary that
would barely show against the panels (like Amber Night's purple) is mixed with
white until it does. The file keeps the colour you picked, and light mode uses
it as it is.

## Tokens you can set

Anything in `tokens` replaces the colour the app would make. Leave it out to
keep the made one.

| Token | What it is |
| --- | --- |
| `bg`, `surface`, `sunken`, `raised`, `hover` | Backgrounds: the window, panels, wells, raised controls, hover |
| `border`, `border-strong` | Lines between things |
| `text`, `text-muted` | Text |
| `board-bg` | Around the field in the editor |
| `danger` | Delete, errors, "over time" |
| `accent`, `on-accent`, `accent-text`, `accent-soft` | The primary: fill, text on it, as text, a faint wash |
| `secondary`, `on-secondary`, `secondary-text`, `secondary-soft` | The same for the secondary |
| `chip-bg`, `chip-text` | Tags and topics |
| `focus` | The keyboard focus outline |

To see every component in a theme's colours, open the **Theme preview** (Settings ›
Appearance › Preview themes).
