# Changelog

All notable changes to this project will be documented in this file.

This project adheres to semantic versioning (0.x during early development).

---

## [Unreleased]

### Added

- Animation: build a play in steps. Each step moves some markers on from where the previous one left them, and the starting position stays as it was
- Step bar under the board: play and pause (Space), jump to the start or any step (, and . step back and forward), add a step after the current one, delete a step, set how long each step takes and the playback speed
- Move markers on a step by dragging them (or with the arrow keys), or use the new Route tool (W): click a marker, then the points it runs through, and it follows a smooth curve through them
- While editing a step, each moving marker shows its run as a dotted path, with a faded marker where it set off; drag the waypoints to reshape a run, or double-click one to remove it
- Inspector section for the step: see whether the selected markers move, and make a run straight again or keep a marker where it is for that step
- Library cards show how many steps an animated board has
- Striped kits: give a team (in board settings) or a single player (in the inspector) a second colour for vertical stripes, like Barcelona's
- Goals and mannequins can face any angle: drag the round handle in front of them (Shift snaps to 15°), type an angle, or use the turn buttons

### Changed

- Board files are now version 2, which adds the animation steps; boards saved by earlier versions open as before, with no steps
- The sidebar lists players separately from other objects, grouped by team in sections you can fold away; click a team's name to select all its players (Shift-click adds them to the selection)
- Players in the sidebar show their kit, number, name and position, sorted by shirt number with keepers first
- Shift+R turns a goal or mannequin 15° clockwise and Alt+Shift+R 15° anticlockwise (it used to turn 90°); the inspector buttons turn by 15° too
- "Use team colour" is now "Use team kit", and resets a player's stripes as well as their colour

---

## [0.5.0] - 2026-10-23

### Added

- Library home screen: every saved board as a card with a live preview, its folder, duration and when it was last edited
- Search across titles, tags, folders, categories, descriptions and coaching points, and sort by last edited or by name
- Folders: create, rename and delete them (deleting a folder keeps its boards), move boards between them, and a "Not in a folder" view
- Board menu in the library: open, duplicate, move to folder, export, and delete with a confirmation
- Autosave: boards are saved as `.lineup` files in `Documents\Lineup` shortly after every change, and straight away when you go back to the library or close the window; Ctrl+S saves immediately
- Save status next to the board title: Saved, Saving… or Couldn't save, with a Retry button
- Import `.lineup` files, several at once; a board that's already in the library comes in as a copy, so nothing is overwritten
- Export a board as a `.lineup` file or as a PNG image at twice the board's size, from the library or the editor
- Folder picker in the Notes tab
- The library's location on disk is shown at the bottom of the sidebar
- Tauri `fs` and `dialog` plugins, limited to the library folder and to files picked in a save or open dialog
- `.lineup` file format: versioned JSON (`schemaVersion: 1`); broken items are dropped and missing fields filled in when a file is opened, and files from a newer version of Lineup are refused with a clear message
- Files are written to a temporary file and then swapped in, so a crash can't leave a half-written board
- If a Linux machine has no Documents folder, the library falls back to the app's data folder
- In the browser (`npm run dev`), the library is kept in local storage

### Changed

- The app opens on the library; boards open in the editor, with a "Library" button to go back
- The board kept as a local draft by v0.3.0 and v0.4.0 is moved into the library on first launch

---

## [0.4.0] - 2026-10-23

### Added

- Draw tools: run (solid), pass (dashed) and dribble (wavy) arrows, plain lines, zones (rectangle or ellipse), freehand pen and highlighter, text, and an eraser for drawings
- Lines can be bent by dragging the diamond in the middle and straightened again, and their ends can be moved; Shift snaps lines to 15° steps
- Zones can be resized from their corners; Shift draws a square
- Arrows started on a player are anchored to that player
- Text is typed straight onto the board; double-click a text to edit it
- Equipment: goals (full size or mini, facing into the pitch), mannequins and poles, with rotation (Shift+R)
- Inspector controls for drawings: colour (with a custom picker), arrow type, arrowheads, width, zone shape and border, highlighter, text size and background
- Tool options: while a draw tool is active, the inspector sets the style of the next drawing, and restyling a drawing updates it too
- A delete button (bin icon) appears under whatever is selected
- Any player can be recoloured from the inspector (home, away and neutral colours, or a custom one), and switched back to its team colour
- Keyboard shortcuts for every new tool

### Changed

- Settings: the theme is picked from a dropdown, and custom colours are tucked into a collapsible "Customise colours" section
- Select all, duplicate, reorder, nudge and delete now work on drawings as well as markers, and the object list includes drawings
- Selected tabs and options no longer switch to a bold font
- Shirt numbers start at 1 for every team (they used to start at 2, leaving 1 for the keeper tool)

### Removed

- The goalkeeper tool (and its `K` shortcut) and the goalkeeper kit colours: tick "Goalkeeper" on any player instead; it keeps its team's colour unless you recolour it

---

## [0.3.0] - 2026-10-23

### Added

- New editor layout: tool rail, SVG pitch, and a side panel with Inspector and Notes tabs
- Place home, away and neutral players, goalkeepers, cones and a ball by clicking the pitch or dragging from the tool rail
- Select markers with a click, Shift-click or a drag box; move, nudge with the arrow keys, duplicate, reorder and delete them
- Inspector for shirt numbers, positions, names, teams and goalkeepers, plus team names and kit colours
- Drill notes: category, age group, duration, players, area, equipment, description, coaching points and tags
- Undo and redo for every change; a drag or a text edit counts as one step
- Themes: five presets, dark and light modes, and custom primary and secondary colours
- Keyboard shortcuts, listed in Settings
- The board in progress is kept as a local draft until saving to files arrives
- Unit tests (Vitest) for the board model, undo/redo and themes, run in CI

### Changed

- Boards are now plain, serialisable data with UUIDs, ready to be saved as files
- Markers are positioned by their centre, so they no longer drift when the window is resized
- Fonts are bundled with the app instead of loaded from Google Fonts, so it works offline
- The window opens at 1280 × 800

### Removed

- `@dnd-kit` and `vite-plugin-svgr` dependencies

### Fixed

- Long player names no longer widen the side panel and shrink the board; they are cut short with an ellipsis

---

## [0.2.4] - 2026-10-23

### Changed

- Relicensed from MIT to the GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later). Releases up to and including v0.2.3 remain available under the MIT License.
- Synced the app version across `package.json`, `tauri.conf.json` and `Cargo.toml`
- Updated the README with the project vision and roadmap

### Removed

- Dev outline around the pitch
- Boilerplate `greet` Tauri command

---

## [0.2.3] - 2026-03-17

### Added

- Soccer pitch background image

### Changed

- Migrated drag-and-drop engine from `@dnd-kit/core` to `@dnd-kit/react`
- Internal improvements to node dragging, canvas handling, and toolbar previews
- Improved player name visibility

---

## [0.2.2] - 2026-03-09

### Added

- Static node previews for toolbar items and drag overlays

### Changed

- Improved internal node architecture using a centralized node registry
- Refactored node rendering to use shared preview components
- Early boundary handling for canvas nodes (incomplete)

---

## [0.2.1] - 2026-02-28

### Added

- Drag-and-drop node creation from the toolbar
- Visual preview when dragging toolbar items
- Dynamic node placement based on drop position on the canvas

### Changed

- Improved drag-and-drop behavior and responsiveness

### Removed

- Click-to-create node creation with fixed placement

---

## [0.2.0] - 2026-02-17

### Added

- Toolbar-driven node creation with predefined canvas placement
- NodeFactory for standardized node creation

### Changed

- Jersey number is now optional for player nodes
- Refined drag architecture
- Improved player jersey number styling

### Fixed

- Disabled text selection on player nodes while dragging
- Corrected drag handle cursor behavior

---

## [0.1.0] - 2026-02-15

### Added

- Initial player and cone nodes
- Basic node positioning logic
