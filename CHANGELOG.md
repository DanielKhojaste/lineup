# Changelog

All notable changes to this project will be documented in this file.

This project adheres to semantic versioning (0.x during early development).

---

## [Unreleased]

### Added

- (Preview branch) The **Attach** window: boards have the same search and sport filter as sessions, both tabs list the folders on the left (only the ones with something for the sport picked, with counts), the sport stays when switching tabs, and a match opens on **Board**. The tab is just "Board"
- (Preview branch) Animation controls: **F** (compact corner) fades when the pointer is still, like E, and counts from 0 ("0 / 3"). **E** with more than 10 steps shows a track instead of a dot per step. Test files in `examples`: **TEST: third-man run, 20 steps** and the session **TEST: animation controls** (the same play with 3 steps and 20)
- **Session details:** export or print a session with a page per drill: page 1 has the session's facts, timeline and an outline of every block (with the page each drill is on), then each drill gets a large diagram, what happens, coaching points as tick boxes, progressions and room for notes. It's under **Export** and **Print** next to the one-page **Session summary**, with the ink saver too
- Calendar: a busy day in the month view shows its first three items and **+N more**, which lists everything on that day (with a search when there's a lot)
- **Lots of teams:** the Team box lists eight, then **Show all N teams…**; the calendar's Team filter lists the ten you use most, then **Show all teams…**. Both open a window with every team and a search
- (Preview branch) **Designs to compare**: a panel in the corner switches between two sets of animation controls floating over the field in the session preview (a bar, or corner buttons), and two calendar item designs (type above, or icon in line)
- (Preview branch) Calendar items are a **Practice**, a **Match** or an **Event**, made in one window; any of them can have a session attached (a practice's plan, a match's warm-up), a practice can have its own name, and a match a formation (a board)
- **Teams**: pick a saved team from the list under any Team box (sessions, plans, the calendar), or type a new one, which is saved for next time. **Settings › Teams** lists them to add or remove. Your library's existing teams are there from the start
- Calendar: an optional **Location** for every item, shown on it, in its tooltip and under Coming up
- Calendar **colours**: a colour for practices, matches and events in **Settings › Calendar colours**, and any item can have its own, including any custom colour
- Calendar: **matches** ("vs Riverside", or "@ North FC" away, with kick-off and a result) and **other events** (team photos, a parents' meeting…), from **Add a match** or a day's right-click menu. Each kind has its colour: training to come in the theme's colour, sessions that ran with a ✓, matches in purple, events in blue, with a key under the calendar
- **Delete** (or Backspace) in the library deletes the selected items, or the card that has focus, after asking
- Example **basketball** and **volleyball** sessions (two drills each) in the `examples` folder, alongside the soccer ones
- **Session preview:** go through a session block by block, with its drills listed on the left and the picked one large on the right, its minutes, players, tags, notes and coaching points under it. Plays move by themselves, or step through them with ← and →; ↑ and ↓ move between blocks. The details can go under the drill, beside it, or be hidden to make the drill as big as the window allows (Lineup remembers which), the preview starts at the first drill, and **Back** returns to where you opened it: the session, or the library. Open it with **Preview** in the session, or from the session's menu in the library
- **Plans:** a block of training, like a season, **week by week**: each week has its sessions in order and can have a topic, like "Pressing" (notes too, when you want them). Make them under **Plans** in the library: add sessions from the panel on the right (or make a new one for the week), drag them between weeks (a line shows where they'll land), and duplicate a plan for next season. A plan has no dates, so it can be reused; **Add to calendar** puts each week's sessions on that week's training days
- **Calendar:** a month or week view (it remembers which) of every session on its date, with the time and team. **Add a plan** from the week it starts, on your training days (say Tuesdays and Thursdays), add a single session to a day, drag a session to another day, and add notes on how it went. A session counts as run once its date has passed, with a tick (or mark it as cancelled). With more than one sport, each session shows its sport's colour and the calendar can show one sport at a time. Coming up and recently run are listed beside it, a plan shows when each of its sessions last ran, and drills show when they were last used when you add them to a session

- **Interface size** in Settings › Appearance: 90%, 100%, 110%, 125% or 150%, for text and controls everywhere. **Ctrl+=**, **Ctrl+-** and **Ctrl+0** change it from anywhere, and Lineup remembers it

### Changed

- Session preview: the key hints (Blocks, Steps, Play) show in the smallest window again. A long title shrinks first, then hints that don't fit drop out whole, never cut in half; layout tests check 960×600, 1100×720 and 1440×900
- Library: **Boards**, **Sessions** and **Plans** each have sport chips at the top (the sport stays when moving between them). The board-type chips (Drills, Plays…) are gone; folders and sports show **All / Boards / Sessions** when they have both
- "Drills" is now "boards" wherever it meant boards in general: session cards ("3 boards"), search boxes, the session's library panel, messages
- "8 topics maximum" (was "Maximum 8 topics")
- Calendar items get a thin outline in their own colour on hover (Ring), instead of a stronger background
- **Printed and exported sessions** (the summary): the facts in one line, a timeline of the whole session coloured by part, each drill's diagram zoomed to the area it uses with its focus points as tick boxes, the other blocks as clear rows in full ink, and room for notes. **Print with ink saver** and **PDF document, ink saver** draw the pitches white with soft lines, for printing at home
- Times are picked as hour, minutes and AM or PM (PM until you pick otherwise; computers set to 24-hour times get 0–23 and no AM/PM)
- Windows focus what they're meant to: e.g. Save when opening a practice, not the first field
- Plans: removing a week asks first (Ctrl+Z still brings it back)
- Plans: topic bubbles only fill the rest of the box's line (never a second row); "Maximum 8 topics"
- Session preview: **Edit session** is always at the top right; the team, length and players moved above the blocks; the key hints have room between them, and step aside in small windows
- Calendar: the season timeline is put away for now (kept on the `archive/season-timeline` branch; saved seasons stay in the calendar file)
- Calendar: planned practices no longer have a dot; opening a practice no longer selects the day in its date; the month or week sits centred between the arrows; long team names end in "…" in the Team filter and on items
- Links like **+ Add notes** get a soft tint on hover instead of an underline
- Settings: keyboard shortcuts are always in two columns, whatever the window or interface size
- Calendar: in the week view, clicking a session opens its preview (Back returns to the calendar); right-click to edit the date, team or status. **Preview session** and **Edit session** are in every session's menu
- Library: **Calendar** shows when the next session is (Today, Tomorrow, Thu 19, 3 Dec), with the session in its tooltip, instead of a count
- Plans: each week has a trash can to remove it (Ctrl+Z brings it back)
- Plans: a session's pictures and text are one button, a little apart from its number; a session without drills shows "No drills yet"
- Plans: matching topics show as bubbles beside the topic box while typing; long topics are cut with "…", and a week has 8 topics at most
- The calendar's session picker always shows every sport with its number of sessions, and starts on the calendar's sport filter
- Plans: each week can have several **topics** (chips, with the sport's topics and your own suggested); a week's single topic from before becomes its first
- Plans: weeks have a drag handle in every layout, to put them in a different order
- Plans: selecting a session opens its preview (Back returns to the plan); **Edit session** is in its menu. Sessions are numbered within their week
- Plans: the Outline has **All weeks** at the top, and remembers which week (or all) was showing for each plan
- Plans: the description gets the whole width and grows with its text
- Calendar hover: the item's background gets a touch stronger (quick: `--hover-duration`, 0.14s); the day keeps its own hover. Each item has a stronger tint of its colour down its left edge
- The week view shows a session's first two topics
- Dragging a session in a plan barely tilts it
- More room between the session preview's shortcuts and its buttons
- The library's **All** view (boards and sessions together) is gone for now; it opens on **Boards** instead
- **New board**: your default sport on top with both its fields: one click, or Enter, makes the board. Other sports are below, one click then the field. Before there's a default, it's a grid of sports (with a tick to make one the default) then the field
- A plan's weeks are an **Outline**: the weeks on the left, the picked week (or all of them) large beside it. (List and Table layouts were tried and are kept on the `archive/plan-layouts` branch)
- The calendar's week view shows each session's team, minutes, first three drills (with pictures) and topics
- Adding a session to the calendar opens a picker with the library's session cards, a search and the sports, instead of a long dropdown
- Keyboard shortcuts are drawn as keys everywhere they're shown: menus, tool hints, Settings and the session preview
- A card's **Folders ›** menu stays open while you tick folders, so a board or session can go into several at once
- The **Select** button has an empty tick box, like the boxes on the cards, and its text is the size of the other buttons
- Version tags put the Windows, macOS and Linux installers on a draft GitHub release, ready for its notes

### Developers

- Development builds keep a log of errors, warnings and library events: in the console, `__lineupLog()` in the dev tools, and a file per day in `Documents\Lineup\logs\` in the desktop app. Release builds keep nothing
- Layout tests: `npm run test:layout` (Playwright; once: `npx playwright install chromium`) fills every screen with the longest names and the most topics and fails on any sideways scrollbar

### Fixed

- Printing no longer prints the theme's moving background (Dune's spice and the like) over the page
- Exported PDFs: text can be selected, copied and searched (an invisible text layer over the page); pictures are sharper (about 290 dpi instead of 190) and files much smaller (a 17 MB export is now under 1 MB)
- Player names on exported and printed diagrams are white with a dark edge again (they came out black on the grass), and bigger
- The minutes under the session timeline no longer overlap at the end ("70" beside "71 min")
- Exports and prints with the ink saver are named "Session (ink saver)"; Session details "Session (details)"
- Team names lose stray spaces ("BU10 Black   " is "BU10 Black"), and a name you type that's already saved, in any capitals, picks the saved team
- Desktop app: preferences (player and equipment sizes, colours…) are also kept in the app's own data folder (`Lineup/settings.json`), so they're the same in every build, dev and installed. The file has a version and when it changed, ready to sync with an account later
- Theme effects (spice, desert night) never draw over any picture of a board, including the session preview's
- Printed and exported sessions: cones no longer sit on black discs and players no longer have thick dark rings (the board's hidden hover ring showed up where the app's styles don't reach)
- A session with many topics in a plan no longer makes the page scroll sideways
- A card's ⋯ button no longer sits on top of the end of its details line

---

## [0.8.1] - 2026-11-15

### Added

- Share sessions: export a session as a `.lineup-session` file with every drill it uses inside, from the session's **Export** menu or its menu in the library
- Import sessions: the library's **Import** button takes `.lineup-session` files as well as boards, and brings in the session's drills with it. A drill that's already in your library isn't added twice
- **Created** and **Imported** in the sidebar: what you made yourself and what came from files. Imported boards and sessions stay out of **Not in a folder**, and a copy of one counts as yours
- Click a block's name in the plan ("Activity 1") to pick its part of the session from a short menu, instead of a dropdown on every block
- Other blocks in a session (a game, a team talk) can be a part of the session too, like **Scrimmage**, and are numbered with the rest
- Hide the session editor's **Add from library** panel to give the plan more room; Lineup remembers it
- **Change sport / field** from a button in the board's Field settings, or from the board's right-click menu. It opens the same pictures as New board, with the board's sport and field now in grey and your pick in the accent colour. Tick **Start with a blank board** to clear the board as well; there's no confirmation, because Ctrl+Z brings everything back
- **Size of a single marker:** select players or equipment and pick S, M, L or XL under Size. It goes on top of the board's player and equipment sizes, and goals keep their real size
- Shirt numbers **0 and 00** (basketball and hockey use them)
- **All** in the library: boards and sessions together in one grid, in the order picked in Sort, first in the sidebar and where the library opens. Folders and sports mix them the same way. The library opens on the view and sort you picked last, even after a restart
- **Select several** boards and sessions with the **Select** button (or Ctrl+click a card), then add them to a folder (or a new one), export them to a folder you pick, or delete them. One box selects all or none, with a dash when some are selected; the tick closes select mode
- **A board or session can be in several folders:** tick them in its **Folders ›** menu (with **New folder…**), or in the board's Notes. Removing it from a folder or deleting a folder keeps it in its others, and files from earlier versions keep their one folder
- **Ice hockey:** a full or half NHL rink (200 × 85 ft) with rounded boards on plain ice (no dark corners) and no empty room around it, the red and blue lines, faceoff circles and dots, goal creases and the trapezoids behind the goals. The ball is a puck (and is called one), the goals are ice hockey size, and sessions suggest ice hockey topics (power play, breakouts, forechecking…)
- A colour picker after the swatches everywhere you pick a colour, equipment included. It opens on the colour in use (a blue player's picker starts on that blue)
- **Theme preview:** Settings › Appearance › Preview themes shows every component that uses a theme's primary and secondary colours (buttons, the tool rail, tabs, fields, the library, tags, the session plan, the step bar, selections on the board) and every colour the theme makes, for any theme, with dark and light side by side. Try a theme there before using it
- **Theme files:** each theme is a file in `src/theme/presets/` that can be edited, with optional hand-set colours; a README there explains them
- **Your own themes:** save custom colours as a theme with a name, **import** and **export** themes as `.lineup-theme` files (plain text you can share or edit), **rename** them and delete the ones you don't want, in Settings or in the Theme preview. They're listed under "Your themes" and kept as files in `Documents\Lineup\themes\`, next to your boards (themes saved before this are moved there). Deleting the theme in use goes back to the Lineup theme you used last
- Save and open windows for exports start in Documents, then wherever you saved that kind of file last (themes remember their own folder)
- New dark themes inspired by Denis Villeneuve's Dune films, each with its own backgrounds to set the mood: **Dune** (a strong spice orange and the vivid Fremen blue on warm, cinnamon-tinged Arrakis panels, with **drifting spice**: glowing red-orange flakes like the spice in the films' air, carried across the panels by the wind, never over the board; its size, speed and amount can be changed in Settings › Appearance or on the Theme preview page), **Dune Sand** (desert gold and spice), **Fremen** (the blue of the eyes of Ibad and sand gold, on the blue-black of a desert night, with see-through topics and a **desert night** of twinkling, sparkling stars and comets) and **Giedi Prime** (the Harkonnen world in black and white, with the red of the arena). The spice and the desert night can be turned off in Settings › Appearance or on the Theme preview page, and Lineup remembers it. They never cover the board, and they're off when the computer asks for reduced motion.
- Theme files can set their own backgrounds and text colours, and every other colour is made from them
- The Theme preview's **Show both dark and light themes** shows a theme's dark and light versions side by side, with the one you picked on the left. It only shows for themes that come in both
- Keyboard shortcuts in Settings are drawn as keyboard keys, one shortcut per row, in groups (Tools, Selecting and moving, Editing, Animation), in two columns under a **Keyboard shortcuts** dropdown

### Changed

- Back from a drill opened in a session, the session is where you left it instead of at the top
- Messages like "Imported 2 boards and 1 session." close by themselves after 7 seconds; messages about a problem stay until closed
- Library file names work on every system: names Windows keeps for itself (CON, NUL, COM1…) get a _ added, dots and spaces at the end are dropped, and an untitled session's file is "Untitled session" rather than "Untitled board"
- The time in file names uses hyphens ("Untitled session (2026-11-03 11-16)"); files named with dots are renamed when the library opens
- Touchline's secondary is a blue instead of orange. Violet, Violet light and Touchline dark are kept in `src/theme/extra-themes/`, out of the list, with Lagoon
- Text in a theme's colours (links, tabs, "Warm-up 1") is mixed towards the text colour until it's easy to read, in every theme
- Amber Night's tags and topics are see-through purple with a bright purple border (a theme file can set its own chip colours, or pick filled or outline chips)
- Tags and topics have their text centred, with even space on both sides
- The theme list in Settings is a dropdown with a swatch for each theme: a circle split into its primary and secondary, in a thin ring of its background. The Theme preview uses the same swatches
- Settings: the default sport and default size are on one row, and the theme buttons say what they do (Preview all themes, Import…, Export…)
- In dark themes, a secondary colour too dark to see (like Amber Night's purple) is shown lighter, so tags and topics read on dark panels
- **Smaller players:** XL is drawn as the old L and L as the old M, with M and S a little bigger than the old S, so players look realistic next to the field. The sizes are set in `src/config/sizes.ts`
- **New boards start with the sizes you used last** (player and equipment sizes), also set in Settings › New boards
- A session's time can be set to **Auto** (it was "From the plan"), and the message about a plan that's longer than the session's time has the Auto tick in it
- The message after importing a session says drills already in your library "weren't added again"
- The Boards icon's squares no longer run into a thick cross in the middle
- **Selection box:** lines, zones and text are picked when half or more of them is in the box, and players and equipment when the box touches any part of them (before, the box had to go around the whole drawing, and a marker's centre had to be in it)
- Every text field has a sensible limit (titles 100 characters, search 80, names 40…), and long text shown elsewhere ends with an ellipsis, so a very long search no longer makes the library scroll sideways
- A new session isn't saved until something is in it, so opening one and going straight back no longer leaves an empty "Untitled session"
- The tool rail's ball is the board's sport's ball (a basketball, a volleyball, a hockey ball)
- The basketball hoop is a softer burnt orange, so it no longer glares on the maple
- "Use team kit" only shows when a player's kit is different from the team's
- Keyboard shortcuts for the board (like Delete and Ctrl+Z) no longer reach it while a window is open
- The plan's colours follow the part of the session: warm-ups, activities, games and scrimmages in yellow, and water breaks and cool-downs in grey. The strip on session cards in the library uses the same colours

---

## [0.8.0] - 2026-11-03

### Added

- **Sessions:** a new kind of document in the library. A session puts drills from your library in order with water breaks and other blocks (a team talk, a game), each with its own length in minutes, and shows when each one starts (0–12 min, 12–14 min…)
- Session details, enough for another coach to run it: a title (the only thing required), age group or team, sport, time (hours and minutes), a description and **topics**: tags like Passing or Pressing, suggested for the session's sport, plus your own. Equipment and area are under "More details". The plan's total shows against the session's time, with how much is left or over
- Add drills from the library panel beside the plan (the session's sport only; search or filter by type); each drill shows its picture and notes, and opens on a click (the back button returns to the session). Reorder blocks by dragging their handle or with the arrow keys, and right-click a block for more
- **Session sheet:** the title, a summary (age group or team, sport, time, area, topics, equipment) and the description, then a section per activity with its part of the session and minutes, what happens (players, area, equipment, organisation, variations and progressions, the block's notes), the set-up diagram and the focus points. Activities aren't split across pages
- **Export a session as a PDF or an image (PNG)** from the session editor or its card in the library, and print it (Ctrl+P)
- **Parts of a session:** each drill can say what part of a session it is (Warm-up, Activity, Small-sided game (SSG), Scrimmage, Cool-down, or Custom…; "—" when not set), in its Notes; a session can set its own for each drill. They're numbered in order (Warm-up 1, Warm-up 2, Activity 1…), drills with none count as Activities, and water breaks are numbered too
- **A session's sport:** every session is for one sport, and only that sport's drills can go in it. A new session starts on the sport you're looking at or your default sport; without a default, it asks first, with the same pictures as New board. In the session, the sport is a chip that opens the same picker, and drills left from another sport are pointed out
- Session time can come **from the plan** (the blocks added up), and the session's optional details include how many players (from and to)
- Each block in the session plan has move up, move down and remove buttons, and dragging one shows a line where it will land
- Topics you make up are remembered in the library and suggested in every session
- **Variations and progressions** in a drill's Notes, shown in sessions and on the sheet
- Sessions in the library: their own "Sessions" view, a Sessions chip next to the board types in folders and sports (which count sessions too), cards with the first drills' pictures and a strip showing how the time is split, and they show up in folders and sports next to boards
- **Board types:** Drill, Play, Line-up, Set piece or Other, set in the Notes tab. The library filters boards by type; boards from earlier versions become Plays if they're animated and Drills if not

### Changed

- Text fields no longer suggest things you typed before
- **Library files are named after their board or session** ("Cool Board.lineup"); when two have the same name, the date and time they were made is added. Files named by id from earlier versions are renamed when the library opens, and renaming a board renames its file
- Library cards: the ⋯ button opens the same menu as right-clicking, with **Rename…**, Move to folder › and Export › (Lineup file or PNG for boards, PDF or PNG for sessions)
- The library remembers what it was showing (view, filters, search and sort) when you come back from a board or session
- "All boards" is now "Boards", sorting by "Recent", and "Not in a folder" is at the top of the folders
- Deleting a board says which sessions use it
- Long names are cut short with an ellipsis in menus and tooltips
- Text in windows (like New board) can't be highlighted; "Use this for new boards from now on" says when the pick is already your default

### Fixed

- Boards no longer pile up in the wrong library view when two files in the Lineup folder hold the same board (one copied in by hand, say): the copy gets its own id, and saving writes back to the file a board came from instead of making a second one

---

## [0.7.0] - 2026-11-03

### Added

- More sports: futsal, basketball, volleyball, handball and field hockey, as well as soccer, each with its own field or court drawn to scale with its markings (basketball keys, three-point lines and hoops; the volleyball net and attack lines; handball and futsal goal areas; the hockey shooting circles)
- Full or half field for every sport; a half field is drawn with the goal (or hoop, or net) at the top, and goals placed on it face down the field
- A New board window: pick the sport, then a full or half field, from pictures of each; it opens on your default sport (set in Settings, or tick "Use this for new boards from now on"), so Enter makes a board straight away
- A Field section in the board's settings to change its sport or switch between a full and a half field (undoable)
- Player size and equipment size (S, M, L, XL) in each board's Display settings: players, and cones, balls, mannequins and poles, can be drawn smaller or bigger; goals stay their real size
- The ball looks like the sport's ball (basketball, volleyball, hockey ball), and full-size goals are the sport's real goal size
- The editor, library previews and PNG export show just the field and its margin, so half fields and narrow courts fill the screen instead of sitting in empty bands; markers and drawings stay on the field
- Volleyball has 3 m behind the end lines (room to serve) and 1.5 m at the sides; futsal, basketball and handball have 1.5 m around the court
- The library sidebar lists your sports, with how many boards each has; click one to see just its boards. Cards show each board's sport and are all the same shape
- Right-click menus everywhere: on markers and drawings (cut, copy, paste, duplicate, team, goalkeeper, goal size, turning, line style, straighten, remove a run from a step, front and back, delete), on an empty spot of the board (paste or add something there, select all, undo and redo, show names, full or half field, clear the board), on players and teams in the sidebar, on library cards (open, duplicate, move to a folder, export, delete), on folders and on the library itself. The menu key and Shift+F10 open them from the keyboard
- Copy, cut and paste markers and drawings (Ctrl+C, Ctrl+X, Ctrl+V), on the same board or another one; pasted players keep their shirt numbers when they're free
- Clear the board (from its right-click menu), with a confirmation; Ctrl+Z brings everything back

### Changed

- `.lineup` files are now saved compressed, so they no longer open as readable text (they're also about a third of the size); files from earlier versions still open and are converted the next time they're saved
- The window opens at the size and position it was closed at, and maximised or full screen if it was
- The goal tool is hidden for basketball and volleyball, which don't have goals
- The README covers the new sports and the new plan: sessions, season plans and a calendar next, then sharing, then accounts and a premium cloud subscription
- Text fields have Lineup's own Cut, Copy, Paste and Select all menu instead of the browser's, so "Inspect" and other browser items never show (Tauri clipboard plugin)
- A "Desktop builds" workflow on GitHub builds the Windows, macOS and Linux installers on demand (Actions tab, "Run workflow") and for every version tag
- The version number lives in a `VERSION` file; `npm run version:sync` copies it into `package.json`, `tauri.conf.json` and `Cargo.toml`, and the Desktop builds workflow checks they match
- `.gitattributes`: `.lineup` files are binary, and `package-lock.json` stays at LF line endings

---

## [0.6.1] - 2026-10-25

### Changed

- The app no longer shows the browser's right-click menu (Back, Reload, Inspect…) except in text fields, which keep Cut, Copy and Paste
- Text on the page can't be highlighted by double-clicking or Ctrl+A; text fields still can
- The README roadmap follows the new plan: any team sport next, then sessions, then present mode and export, then the planner
- Clicking a team's name in the sidebar when all its players are selected now deselects them
- The step section's buttons are now "Straighten run" and "Remove run" (it was "Stay put this step"), with clearer descriptions
- The Barça example board and screenshots show the kit as garnet with blue stripes, with the keepers in their 2023/24 goalkeeper colours (Cata Coll in green, Misa in black)

### Fixed

- Release builds of the desktop app compile on macOS and Linux again (a Windows-only import broke them)
- `Cargo.toml` and `Cargo.lock` no longer show as changed on Windows after a build (`.gitattributes` keeps them at LF line endings)

---

## [0.6.0] - 2026-10-23

### Added

- Animation: build a play in steps. Each step moves some markers on from where the previous one left them, and the starting position stays as it was
- Step bar under the board: play and pause (Space), jump to the start or any step (, and . step back and forward), add a step after the current one, delete a step, set how long each step takes and the playback speed
- Move markers on a step by dragging them (or with the arrow keys), or use the new Route tool (W): click a marker, then the points it runs through, and it follows a smooth curve through them
- While editing a step, each moving marker shows its run as a dotted path, with a faded marker where it set off; drag the waypoints to reshape a run, or double-click one to remove it
- Inspector section for the step: see whether the selected markers move, and make a run straight again or keep a marker where it is for that step
- Library cards show how many steps an animated board has
- Example boards in `examples/`: Barça 5–0 Real Madrid (Liga F, 19 November 2023) with both starting XIs, a rondo drill and an animated third-man run
- Striped kits: give a team (in board settings) or a single player (in the inspector) a second colour for vertical stripes, like Barcelona's
- Goals and mannequins can face any angle: drag the round handle in front of them (Shift snaps to 15°), type an angle, or use the turn buttons

### Changed

- The README describes the current features, with screenshots and an animated example
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
