# Lineup

An interactive tactical board for coaches to design drills, formations, and plays for multiple sports.

> ⚠️ **Status: Alpha**
>
> Lineup is under active development. Features, UI, and data formats may change frequently.

## Overview

Lineup is a local-first desktop app for coaches. It brings four things together:

- **Library**: every drill and play you've saved, organised in folders
- **Editor**: draw players, equipment, arrows and zones on the pitch, write notes for the drill, and animate it step by step
- **Present / whiteboard**: show a drill or play full screen and draw over it live
- **Planner**: plan sessions and a season, and keep a log of the drills you ran with your team

Everything is stored as files on your computer. Windows comes first, then macOS and Linux, then tablets.

## Current Features

- Drag players and cones from the toolbar onto a soccer pitch
- Move markers around the pitch

## Roadmap

| Version | Milestone |
| --- | --- |
| v0.3.0 | Board foundations: select, edit, delete, undo/redo, new editor layout, themes |
| v0.4.0 | Drawing tools: arrows, lines, zones, pen, text, equipment |
| v0.5.0 | Drills: library, save/load, notes |
| v0.6.0 | Animation: steps and playback |
| v0.7.0 | Plays: present mode and export |
| v0.8.0 | Planner and session log |
| v1.0.0 | Stable desktop release (Windows, macOS, Linux) |

## Tech Stack

- Tauri
- React
- TypeScript

## Development

### Prerequisites

- Node.js
- Rust (for Tauri)

### Run locally

```bash
npm install
npm run tauri dev
```

## License

Copyright (C) 2025-2026 Aref "Daniel" Khojaste

Lineup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](LICENSE) for the full text.

Lineup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

Releases up to and including v0.2.3 were published under the MIT License, and copies of those releases remain available under its terms.
