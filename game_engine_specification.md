# Little Level Lab — Current Product Specification

This specification documents the behavior implemented in the current source.
For module responsibilities, runtime flow, persistence details, and extension
guidelines, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 1. Product purpose

Little Level Lab is a browser-based 2D platformer editor and game runtime for
beginners and children. Creators place objects on a tile-based canvas, configure
sprites and event sounds, and play their level or campaign immediately.

The application is client-side JavaScript using ES modules, Vite, and Phaser 3
Arcade Physics. There is no backend, account system, cloud save, or multiplayer
support.

## 2. Running and supported environment

- Node.js 18 or newer and npm.
- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server (port 3000 by default).
- `npm run build` creates the production build; `npm run preview` serves it.
- The application requires a modern browser with Canvas, local file APIs, and
  Web Audio support for synthesized sounds. Uploaded audio playback depends on
  browser codec support.

## 3. Editor and level creation

### Layout and painting

- The editor has a toolbox sidebar, toolbar, and scrollable board.
- The board is drawn with Canvas and deliberately avoids prominent cell grid
  lines.
- Choose a tool and click or drag on the board to paint. The eraser removes
  cells. There is a single player start position.
- Undo and redo support placement, removal, resizing, and clear-grid commands;
  the command history is limited to 100 operations.
- The tile size is 32 pixels. Levels may be 8–256 columns wide and 8–40 rows
  high. Empty cells are allowed.

### Toolbox content

The selectable tools are:

- **Player**: the game start position.
- **Terrain**: Ground, Brick, Mystery Box, Pipe.
- **Movement/puzzles**: Spring, Moving platform, One-way platform, Switch,
  Door, Checkpoint.
- **Enemies**: Goomba, Koopa, Bat.
- **Items**: Coin, Super mushroom, Star power, Extra life, Fire flower.
- **Goal**: Flag.
- **Editor utility**: Eraser.

Each tile has a built-in fallback preview. Creators can upload replacement
images. Player and enemy tools provide action-specific sprite upload dialogs.

### Demo campaign

- Startup loads **Sunny Hills** (96 × 18) into the editor and makes **Cave
  Crossing** (72 × 18) available in the campaign selector.
- **Load demos** restores both built-in levels.
- The demos include original bundled SVG art, hazards, collectibles, and a
  playable route. Cave Crossing demonstrates springs, one-way and moving
  platforms, a Fire Flower, checkpoint, and a switch/door passage.
- Creators can add levels up to a total of 50, remove levels (at least one is
  retained), rename levels through the campaign workflow, and switch between
  them.
- Campaign changes remain in memory until explicitly downloaded. Individual
  levels and full campaigns can be exported/imported as JSON.

### Rewards and custom assets

- The Mystery Box reward is selected per level and applies to all its boxes.
  Supported rewards are Mushroom, Star, Extra Life, and Fire Flower.
- The chosen reward is previewed on the board and saved with the level.
- Supported character actions are Player: idle/walk/run/jump; Goomba, Koopa,
  and Bat: idle/walk. Each action can have its own sprite sheet and frame
  dimensions/frame rate.
- Uploaded images and their metadata are included in exported level JSON.

## 4. Gameplay specification

### Controls

- Move: **A/D** or **Left/Right arrows**.
- Jump: **W**, **Up arrow**, or **Space**.
- Run: hold **Shift**.
- Fire: **X** or **J** while the player has Fire power.
- Touch controls provide left, right, and jump buttons and can be repositioned
  by dragging their handle.
- Escape, the close button, or clicking outside the game window closes play
  mode.

### Player movement

- The player starts with three lives.
- Jump input is buffered for 120 ms and coyote time lasts 120 ms.
- Releasing jump while rising reduces the remaining jump height; holding jump
  increases height.
- Wall sliding while pressing into a wall caps downward speed at 120 px/s.
- Wall jumps launch away from the contacted wall and briefly override opposing
  directional input.
- Base horizontal speed is 180 px/s, running speed is 290 px/s, and the grown
  player moves at 220 px/s (unless running).

### World objects and interactions

| Object | Behavior |
|---|---|
| Ground, Brick, Pipe | Solid collision surfaces; Brick breaks when hit from below. |
| Mystery Box | Hit from below once to release the selected reward, which emerges and moves right. |
| Spring | Landing launches the player upward at 640 px/s. |
| Moving platform | Moves horizontally 64 pixels either side of its placement at 56 px/s; supports and carries the player. |
| One-way platform | Player can jump through from below and land on top. |
| Switch | Touching it activates it and opens every closed Door in that level. |
| Door | Solid until a Switch is activated. |
| Checkpoint | The last touched checkpoint is the respawn point. Falling there costs one life; if lives remain, the player respawns after a short animation with temporary powers cleared. |
| Goomba, Koopa | Ground patrol enemies; Koopa is faster than Goomba. |
| Bat | Flying enemy moving through the air. |
| Coin | Collects for one point. |
| Mushroom | Grows the player, increasing movement speed and jump height; a hit removes the growth before costing a life. |
| Star | Grants eight seconds of invincibility and defeats enemies on contact. |
| Extra Life | Adds one life. |
| Fire Flower | Grants Fire power. X/J shoots a directional projectile with a cooldown; it defeats ground/flying enemies and is removed by obstacles or timeout. |
| Flag | Ends the level as a win when touched. |

Without a checkpoint, falling below the level ends the run. Losing all lives also
ends the run. Game-over provides a replay action; winning advances to the next
campaign level when one exists, otherwise the campaign can be replayed.

### Feedback and audio

- Built-in retro tones are synthesized for gameplay events. A configured
  uploaded sound overrides the built-in sound for that event.
- The sound editor supports independent upload, preview, enable/disable, volume,
  and removal for jump, stomp, player hit, coin, power-up, brick break, mystery
  box, win, lose, spring, switch, checkpoint, and fireball events.
- Audio uploads must be valid audio files of 10 MB or less. Audio and settings
  are stored inline in the exported level.
- Particle bursts accompany selected interactions; selected major events also
  shake the camera.

## 5. Save data and validation

- An individual level is a JSON world snapshot containing dimensions, tile
  matrix, active tool, sprite metadata/data URLs, sound metadata/data URLs, and
  mystery-box reward.
- A campaign is JSON with format `little-level-lab-campaign`, version `1`, and
  a `levels` array of `{name, snapshot}`. Campaigns contain 1–50 levels.
- Import validation checks world dimensions (8–256 columns and 8–40 rows),
  matrix dimensions, tile IDs, mystery-box reward IDs, and sound metadata.
- Older world files may omit audio settings or reward selection and use defaults.
- Best scores are saved per campaign index and level name in browser
  `localStorage`; they are not included in exported files and do not sync across
  browsers/devices.
- Saves are explicit downloads; there is no automatic cloud or campaign save.

## 6. Non-functional requirements

- Keep editing and gameplay usable on common laptop screens; game rendering
  scales to fit its modal.
- Keep tile boundaries visually unobtrusive.
- Keep editor components decoupled through `EventBus`; keep gameplay rules in
  Phaser scene behavior and entity construction in `EntityFactory`.
- Validate imported data and uploaded media; surface failures through editor
  status messages and console diagnostics.
- Preserve compatibility with older level JSON that lacks newer optional
  fields.

## 7. Verification

The supported automated verification command is `npm run build`. The package
does not currently define dedicated unit, lint, or browser-test scripts.
Gameplay mechanics should be manually exercised in play mode, including
campaign transitions and import/export.

## 8. Current scope boundaries

- No server, user accounts, cloud storage, multiplayer, or collaborative editing.
- No configurable moving-platform direction/range/speed UI; current platforms
  move horizontally with built-in bounds and speed.
- Switches currently open all doors in a level; individual switch-door links
  are not configurable.
- Checkpoints store a respawn position for the current run. They do not preserve
  defeated enemies, collected objects, or puzzle state on respawn.
- Best-score records are browser-local and identified by campaign position and
  level name.
