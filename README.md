# Lineup

An interactive tactical board for coaches to design drills, formations, and plays for multiple sports.

> ⚠️ **Status: Alpha**
>
> Lineup is under active development. Features, UI, and data formats may change frequently.

## Overview

Lineup is a tactical board application designed to help visualize positions, formations, and scenarios using draggable markers on a board.

The goal is to provide a flexible, offline-capable tool that can be adapted to different use cases such as:

- Sports tactics
- Strategy planning
- Scenario visualization
- Animate player movements

## Current Features

- Draggable player nodes
- Basic node positioning

> ⚠️ Visual styling is minimal at this stage and will improve over time.

## Planned Features

- Support for multiple sports
- Custom marker visuals and sprites
- Save/load board states
- Animate player movement
- Measurement and alignment tools
- Improved UI and theming

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
