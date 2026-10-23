# Changelog

All notable changes to this project will be documented in this file.

This project adheres to semantic versioning (0.x during early development).

---

## [Unreleased]

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
