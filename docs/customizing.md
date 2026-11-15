# Customizing Lineup

Where to change the things that are meant to be tuned. Each section names the
file and what's safe to change. After a change, run `npm test` (some tests
check these values) and `npm run tauri dev` to see it.

## Marker sizes

**File:** `src/config/sizes.ts`

- `PLAYER_DRAWN_SIZES`: how big players are drawn for S, M, L and XL. The second
  number in each pair is the drawn size (1 = the original player size). Change
  these freely.
- `MARKER_SCALES`: the sizes boards store (0.75, 1, 1.3, 1.6) and their labels.
  **Don't change the numbers** once people have boards: saved boards use them.
  The labels can change.
- `DEFAULT_SIZES`: the sizes a brand-new install starts with. After that, new
  boards use the sizes the coach picked last (Settings › New boards).

Equipment is drawn at its stored size (no table), and goals always keep the
sport's real goal size.

## Selection box

**File:** `src/components/board/boxSelect.ts`

`BOX_SELECT` at the top sets how a drag box picks things:

- `drawings` (lines, zones, text): `"half"` (half or more inside) or `"touch"`
  (any part; a zone only by its edge)
- `markers` (players and equipment): `"touch"` (any part) or `"centre"` (the
  centre must be inside)

## Themes

**Folder:** `src/theme/presets/` (one JSON file per theme; its README lists
every field and colour)

- Edit a file to change a theme; add a file to add one. The file name is the
  theme's id, so keep it once people use the theme.
- `src/theme/extra-themes/` keeps themes that aren't shown (Lagoon). Move a
  file into `presets/` to show it.
- How the other colours are made from a theme's primary and secondary:
  `themeTokens` in `src/theme/themes.ts`. The base greys for dark and light are
  `BASE` in the same file.

## Text limits

**File:** `src/utils/text.ts`

`TEXT_LIMITS` sets the longest text each kind of field takes (titles, names,
tags, descriptions…). Text fields use these by default.

## Sports

- **Fields:** `SPORT_INFO` in `src/model/sports.ts` (size in metres, the margin
  around the field, goal size, players per side). The order of `SPORTS` is the
  order everywhere in the app.
- **Field colours and markings:** `SURFACES` and one drawing function per sport
  in `src/components/board/Pitch.tsx`.
- **The ball:** `BALL_ICONS` in `src/components/shell/ToolRail.tsx`
  (the tool rail) and the ball drawing in `src/components/board/Markers.tsx`.
  `ballName` in `src/model/sports.ts` names it ("Puck" in ice hockey).
- **Session topics suggested for each sport:** `TOPIC_PRESETS` in
  `src/model/topics.ts`.

## Keyboard shortcuts

**File:** `src/state/useShortcuts.ts`

The keys themselves are in `TOOL_KEYS` and the key handler; `SHORTCUTS` is the
list shown in Settings (keep it in step when a key changes).
