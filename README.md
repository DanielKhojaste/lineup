# Lineup

A tactics board and session planner for coaches of any team sport: draw drills, set out line-ups, animate plays, and keep them all in one library on your computer.

> ⚠️ **Status: Alpha**
>
> Lineup is under active development. Features, the interface and the file format may still change.

![Barça's starting XI against Real Madrid, 19 November 2023, on the Lineup board](docs/screenshots/lineup.png)

## Overview

Lineup is a local-first desktop app for coaches of any team sport. It brings these together:

- **Library**: every drill, line-up and play you've saved, organised by sport and in folders
- **Editor**: players, equipment, arrows, zones and text on the field or court, with notes for the drill and step-by-step animation
- **Sessions** _(coming)_: build a training session from your drills, with breaks and timings, and print the session sheet
- **Plans** _(coming)_: season plans made of sessions grouped by topic (like "attacking transition"), not tied to dates, so you can reuse and share them
- **Calendar** _(coming)_: put sessions or a whole plan on dates, and keep a log of the sessions you ran
- **Sharing** _(coming)_: send a drill, session or plan to another coach as one file
- **Present / whiteboard** _(coming)_: show a drill or play full screen and draw over it live

Everything is stored as files on your computer, and the app works without an account. An optional premium subscription with an account, cloud sync and sharing by link is planned. Windows comes first, then macOS and Linux, then tablets.

## Features

### Any team sport

- Soccer, futsal, basketball, volleyball, handball and field hockey, each drawn to scale with its own markings
- A full or half field for every sport, picked in the **New board** window; set a default sport so new boards start on it
- Change a board's sport or switch between full and half in its settings
- The ball and goals match the sport, and players and equipment can be drawn smaller or bigger

### Line-ups and players

- Home, away and neutral players with shirt numbers, positions and names
- Team kits in one colour or in stripes (like Barcelona's blue and garnet), and any player can have their own kit
- The sidebar groups players by team: fold a team away, or click its name to select the whole team
- Goalkeepers, cones, a ball, goals, mannequins and poles; goals and mannequins turn to any angle

### Drawing

![A rondo drill with a zone, cones, passes and notes](docs/screenshots/drill.png)

- Run, pass and dribble arrows, lines, zones, freehand pen and highlighter, and text
- Bend arrows, resize zones, snap angles with Shift, and attach arrows to players
- Drill notes: category, age group, duration, players, area, equipment, description, coaching points and tags

### Animation

![A third-man run playing out step by step](docs/screenshots/animation.gif)

- Build a play in steps: each step moves some markers on from where the last one left them
- Drag markers to move them, or use the **Route** tool to click the points a player runs through; Lineup draws a smooth curve through them
- See each run as a dotted path with a faded marker where it started, and reshape it by dragging its waypoints
- Play, pause and step through (Space, `,` and `.`), set how long each step takes, and play at half or double speed

![Editing a step: dotted runs, waypoints and the step bar](docs/screenshots/animation.png)

### Library and files

![The library with folders and previews](docs/screenshots/library.png)

- Every board saves automatically to `Documents\Lineup` as a `.lineup` file
- Browse by sport or folder, search across titles, tags and notes, sort, duplicate and delete
- Import and export `.lineup` files, and export any board as a PNG image
- Undo and redo for every change, and copy and paste between boards
- Right-click anything for its actions
- Dark and light themes, five presets, and your own primary and secondary colours
- Keyboard shortcuts for everything (listed in Settings)

### Example boards

The [`examples`](examples) folder has boards you can import from the library's **Import** button:

- [`barca-real-madrid-2023.lineup`](examples/barca-real-madrid-2023.lineup): Barça 5–0 Real Madrid, Liga F, 19 November 2023, with both starting XIs
- [`rondo-4v2.lineup`](examples/rondo-4v2.lineup): a rondo with a transition gate
- [`third-man-run.lineup`](examples/third-man-run.lineup): an animated third-man run down the right

## Roadmap

| Version | Milestone | Status |
| --- | --- | --- |
| v0.3.0 | Board foundations: select, edit, delete, undo/redo, new editor layout, themes | ✅ |
| v0.4.0 | Drawing tools: arrows, lines, zones, pen, text, equipment | ✅ |
| v0.5.0 | Drills: library, saving and loading, notes, PNG export | ✅ |
| v0.6.0 | Animation: steps, routes and playback; striped kits | ✅ |
| v0.7.0 | Any team sport: soccer, futsal, basketball, volleyball, handball, hockey; right-click menus | Next |
| v0.8.0 | Sessions: drills and breaks with timings, board types, a session sheet you can print | |
| v0.9.0 | Plans and calendar: season plans by topic, sessions on dates, a session log | |
| v0.10.0 | Sharing: drills, sessions and plans as one file; GIF and video export of plays | |
| v0.11.0 | Accounts, cloud sync and premium | |
| v0.12.0 | Present mode, animation round two, highlights | |
| v1.0.0 | Stable desktop release (Windows, macOS, Linux) | |

## Tech stack

- [Tauri 2](https://tauri.app) (Rust) for the desktop app and file access
- React 19 and TypeScript, built with Vite
- Vitest for tests

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 20.19 or later
- [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform

### Run locally

```bash
npm install
npm run tauri dev
```

`npm run dev` runs the app in a normal browser instead, with the library kept in the browser's storage. That's handy for working on the interface, but files and dialogs need the desktop app.

### Tests

```bash
npm test
```

### Version

The version number lives in [`VERSION`](VERSION). To release, change it there and run `npm run version:sync`, which copies it into `package.json`, `package-lock.json`, `tauri.conf.json` and `Cargo.toml`.

## License

Copyright (C) 2025-2026 Aref "Daniel" Khojaste

Lineup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. See [LICENSE](LICENSE) for the full text.

Lineup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

Releases up to and including v0.2.3 were published under the MIT License, and copies of those releases remain available under its terms.
