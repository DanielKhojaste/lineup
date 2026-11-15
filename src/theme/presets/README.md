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
	"pair": "amber-day",    // optional: the same theme in the other mode
	"chips": "outline",     // optional: tags and topics as a soft wash with a border ("filled" if left out)
	"effects": ["spice"],   // optional: moving backgrounds, the first shown by default (see ../effects/)
	"tokens": {}            // optional: set any colour below by hand
}
```

A theme with the same `name` in both modes (like Violet) is paired by itself;
`pair` is only needed when the names differ (Amber Night and Amber Day). The
Theme preview shows a paired theme's dark and light versions side by side.

People can also save, import and export their own themes in Settings ›
Appearance. Those are `.lineup-theme` files with the same fields (no `order`
or `pair`). In the desktop app they're kept in `Documents\Lineup\themes\`
(one file each, next to the boards), so they're backed up with the library
and can be edited by hand; a file dropped in there shows up next time Lineup
starts.

Themes kept for later (like Lagoon) live in `../extra-themes/`, where Lineup
doesn't list them.

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
keep the made one. Backgrounds and text (`bg`, `surface`, `text`…) are read
first, so the softer washes and readable text colours are made from them; Dune
uses this for its sand.

| Token | What it is |
| --- | --- |
| `bg`, `surface`, `sunken`, `raised`, `hover` | Backgrounds: the window, panels, wells, raised controls, hover |
| `border`, `border-strong` | Lines between things |
| `text`, `text-muted` | Text |
| `board-bg` | Around the field in the editor |
| `danger` | Delete, errors, "over time" |
| `accent`, `on-accent`, `accent-text`, `accent-soft` | The primary: fill, text on it, as text, a faint wash |
| `secondary`, `on-secondary`, `secondary-text`, `secondary-soft` | The same for the secondary |
| `chip-bg`, `chip-text`, `chip-border` | Tags and topics |
| `focus` | The keyboard focus outline |

To see every component in a theme's colours, open the **Theme preview** (Settings ›
Appearance › Preview themes).
