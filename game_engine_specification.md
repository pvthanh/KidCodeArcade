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
- GitHub Actions builds use `/KidCodeArcade/` as the Vite base path. The
  included Pages workflow publishes `dist` after pushes to `main`; GitHub
  repository Pages settings must use **GitHub Actions** as the source.
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
- **＋ Level** opens a dialog to name the level and choose its insertion
  position in the campaign. The new level starts with a completely empty
  board, with the Player tool selected so its start point can be placed.
- On touch devices, use **Move board** to switch from painting to drag-to-pan
  navigation. Turn it off to resume painting. The board also has a larger,
  higher-contrast scrollbar where the browser displays scrollbars.
- Undo and redo support placement, removal, resizing, and clear-grid commands;
  the command history is limited to 100 operations.
- The tile size is 32 pixels. Levels may be 8–256 columns wide and 8–40 rows
  high. Empty cells are allowed.

### Toolbox content

The toolbox reduces scrolling by organizing tools into collapsible groups.
Start & Goal, Terrain, Platforms & Mechanics, and Collectibles & Power-ups
each provide a selector to choose one item and reveal its image/property
controls. Creepy and Boss remain in their own separate groups with their
existing character selectors and configuration controls. Only one group is
expanded at a time; choosing a tool automatically opens its group. The Eraser
is a separate, always-visible editor tool near Undo and Redo.

- **Start & Goal**: Player, Checkpoint, Flag.
- **Terrain**: Ground, Brick, Pipe.
- **Platforms & Mechanics**: Spring, Moving platform, One-way platform,
  Mystery Box, Switch, Door.
- **Creepy**: Goomba, Koopa, Bat, or custom creatures.
- **Boss**: built-in or custom bosses.
- **Collectibles & Power-ups**: Coin, Super mushroom, Star power, Extra life,
  Fire flower.
- **Editor utility**: Eraser.

Each tile has a built-in fallback preview. The Player tool offers the original
Storybook Hero and ten built-in characters: Pudgy Dino Pirate, Bubble Robot,
Mushroom Explorer, Cactus Cowboy, Unicorn Cat, Ninja Hamster, Sloth Racer,
Viking Penguin, Pizza Slice Knight, and Bee Astronaut. Each has idle, walk,
run, and jump artwork. The Player and Creepy tools have an explicit **Motion**
button for action-specific sprite upload dialogs; selecting either tool does
not open the dialog. A custom motion image overrides that action while other
actions continue using the selected character's built-in art. Character choice
and animation metadata are saved with each level and campaign. Static-object
tools provide selectable visual variants without changing the object's
physics or gameplay behavior.

- A **World theme** selector offers Sunny Storybook, Peach Sunset, Golden
  Desert, Frosty Peaks, Candy Kingdom, Emerald Forest, Volcano, Ocean
  Adventure, Outer Space, and Moonlit Manor. Themes change the editor and
  runtime sky, scenery, and terrain tint without changing tile collision or
  character behavior. The selected theme is saved with each level and its
  campaign.

- Select **Creepy** to choose Goomba, Koopa, Bat, or a custom creature. The
  selected creature is painted as its own type. Configure ground/flying
  movement, speed (20–180 px/s), and health (1–5 hits). **＋ Add** uploads a
  custom PNG, JPEG, or WebP creature image (up to 5 MB and 4096 × 4096 pixels);
  up to 12 custom creatures and 20 MB of creature images are supported per
  level. Use **Motion** to upload idle and movement sprite sheets for the
  selected creature. Creature images, motion, and settings are saved with the
  level and campaign.

- Select **Boss** to place a boss, then choose a built-in character (Slime
  King, Robo Crab, or Sky Dragon) or press **＋ Add** beside the character list
  to upload a custom boss image and name. Custom images are PNG, JPEG, or WebP,
  up to 5 MB and 4096 × 4096 pixels; a level supports up to 12 custom boss
  types and 20 MB total custom boss image data. Configure movement (patrol,
  chase, or leap), special ability (fireballs, ground-pound shockwaves, or
  both), health (3–10 hits), and speed (40–120 px/s). The selected character,
  its image, size (32–128 px; default 48 px), and boss settings are saved with
  the level and included in campaign exports. Boss settings apply to every
  Boss placed in the level.

- Ground includes Classic and Ice appearances; Brick includes Classic and
  Mossy. Other static-object tools start with Classic and support custom images.
- Choose an appearance before painting to use it for newly placed tiles.
  **Apply all** changes every matching object in the current level and supports
  undo/redo.
- Custom images are PNG, JPEG, or WebP, up to 5 MB and 4096 × 4096 pixels.
  Images scale to the 32-pixel tile cell. A tile type supports up to 12
  appearances; custom image data is limited to 20 MB per level.
- Appearance IDs are stored per cell, while image data and labels live in the
  level's variant catalog. Level and campaign exports include both, so uploaded
  appearances survive export/import. Saves are explicit downloads; there is no
  automatic browser or cloud save.

### Demo campaign

- Startup loads **Sunny Hills** (96 × 18) into the editor and makes **Cave
  Crossing** (72 × 18) and **Toolbox Adventure** (112 × 18) available in the
  campaign selector.
- **Load demos** restores all three built-in levels.
- The demos include original bundled SVG art, hazards, collectibles, and a
  playable route. Cave Crossing demonstrates springs, one-way and moving
  platforms, a Fire Flower, checkpoint, and a switch/door passage. Toolbox
  Adventure includes every toolbox item, including a boss, and a short in-game
  hint; try the Mystery Box, Springs, power-ups, Switches, Doors, and boss
  fight while crossing the level.
- Creators can add levels up to a total of 50, remove levels (at least one is
  retained), name and position new levels when adding them, and switch between
  them.
- Campaign changes remain in memory until explicitly downloaded. Individual
  levels and full campaigns can be exported/imported as JSON.

### Rewards and custom assets

- The Mystery Box reward is selected per level and applies to all its boxes.
  Supported rewards are Mushroom, Star, Extra Life, and Fire Flower.
- The chosen reward is previewed on the board and saved with the level.
- Supported character actions are Player: idle/walk/run/jump; built-in and
  custom Creepy types: idle/walk. Each action can have its own sprite sheet and
  frame dimensions/frame rate.
- The Player can use the Storybook Hero or any of ten built-in original
  characters. Selecting a built-in character updates its base sprite and
  default action sheets without replacing uploaded Player motion sheets.
- Uploaded images and their metadata are included in exported level JSON.
- The default built-in art uses an original sunny storybook theme. Player,
  Creepy, and Boss characters use detailed vector artwork drawn in a 128 × 128
  viewBox and smoothly rendered to 32 × 32 animation frames (48 × 48 for
  built-in Boss art). In play mode, the Player and Creepy sprites are displayed
  at 48 × 48 pixels (150% of a tile), while their collision bodies retain their
  previous dimensions. Bosses retain their configurable display size. Custom
  character uploads use the same display sizing. Coin and Mystery Box artwork
  is drawn from 128 × 128 vector sources and displayed at the standard 32 × 32
  tile size.

## 4. Gameplay specification

### Controls

- Move: **A/D** or **Left/Right arrows**.
- Jump: **W**, **Up arrow**, or **Space**.
- Run: hold **Shift**.
- Fire: **X** or **J** while the player has Fire power.
- Optional touch controls provide left, right, and jump buttons. They are
  hidden by default; use **Show touch controls** in the game header to enable
  them. When shown, drag the control panel's handle to reposition it.
- Escape, the close button, or clicking outside the game window closes play
  mode.

### Player movement

- The player starts with three lives.
- Score, lives, mushroom growth, Fire Flower power, and any remaining Star
  duration carry forward when advancing to the next campaign level. Replaying a
  failed level restores the progress the player had when that level began;
  replaying the campaign starts a fresh run.
- Play mode uses a 1.35× camera zoom and crisp pixel-art rendering to make
  characters and objects easier to see. This changes only the view: tile
  dimensions and gameplay collision sizes are unchanged. Score, best score,
  lives, and power information stay visible in a fixed-size HUD.
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
| Moving platform | Moves horizontally 64 pixels either side of its placement at 56 px/s; carries the player from above and ignores side/underside contact to prevent snagging. |
| One-way platform | Player can jump through from below and land on top. |
| Switch | Touching it activates it and opens every closed Door in that level. |
| Door | Solid until a Switch is activated. |
| Checkpoint | The last touched checkpoint is the respawn point. Falling there costs one life; if lives remain, the player respawns after a short animation with temporary powers cleared. |
| Creepy | Goomba, Koopa, and Bat are built-in creatures; custom creatures can be added. Each creature can patrol or fly, has configurable speed and 1–5 health, and can use uploaded idle/movement sheets. Stomps and Fire Flower projectiles damage it; Star power defeats it on contact. |
| Boss | Choose Slime King, Robo Crab, Sky Dragon, or a custom uploaded character; configure patrol/chase/leap movement, fireballs/ground-pound/both, 3–10 health, 40–120 px/s speed, and 32–128 px size (default 48 px). Boss fireballs travel at 320 px/s for up to 4.5 seconds; attacks can target the player up to 850 px away. Stomps and Fire Flower projectiles damage the boss; Star power deals extra damage. Boss attacks damage the player. The Goal is locked until all placed bosses are defeated. |
| Coin | Collects for one point. |
| Mushroom | Every mushroom adds another 25% to the player's size, with no growth cap. A hit removes one growth step before costing a life. |
| Star | Grants eight seconds of invincibility and defeats enemies on contact. |
| Extra Life | Adds one life. |
| Fire Flower | Grants Fire power. X/J shoots a directional projectile with a cooldown; it defeats ground/flying enemies and is removed by obstacles or timeout. |
| Flag | Ends the level as a win when touched. |

Without a checkpoint, falling below the level ends the run. Losing all lives also
ends the run. Game-over provides a replay action; winning advances to the next
campaign level when one exists, otherwise the campaign can be replayed.

### Feedback and audio

- A playful synthesized background melody loops during play by default at 25%
  volume. Users can upload looping background music in the Sounds dialog,
  preview it, enable or disable it, adjust its volume, or remove it to restore
  the synthesized default. Custom music stops when the game closes.
- Built-in retro tones are synthesized for gameplay events. A configured
  uploaded sound overrides the built-in sound for that event.
- The sound editor supports independent upload, preview, enable/disable, volume,
  and removal for jump, stomp, player hit, coin, power-up, brick break, mystery
  box, win, lose, spring, switch, checkpoint, and fireball events.
- Audio uploads must be valid audio files of 10 MB or less. Audio and settings
  including background music are stored inline in the exported level and
  campaign.
- Particle bursts accompany selected interactions; selected major events also
  shake the camera.

## 5. Save data and validation

- An individual level is a JSON world snapshot containing dimensions, tile
  matrix, per-cell tile appearance IDs, visual-variant catalog/data URLs,
  active tool, sprite metadata/data URLs, sound metadata/data URLs, and
  mystery-box reward, boss type/behavior/health/speed/size settings, uploaded
  custom boss images and names, creature configuration, and custom creature
  images and motion metadata.
- A campaign is JSON with format `little-level-lab-campaign`, version `1`, and
  a `levels` array of `{name, snapshot}`. Campaigns contain 1–50 levels.
- Import validation checks world dimensions (8–256 columns and 8–40 rows),
  matrix dimensions, tile IDs, visual-variant IDs and image limits,
  mystery-box reward IDs, boss configuration and custom boss image validation,
  creature settings/custom images, and sound metadata. Older level files without
  boss size or custom creature data continue to load with default settings.
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
- GitHub Pages is static hosting only; publishing the site does not provide
  private visitor access or a backend.
- No configurable moving-platform direction/range/speed UI; current platforms
  move horizontally with built-in bounds and speed.
- Switches currently open all doors in a level; individual switch-door links
  are not configurable.
- Checkpoints store a respawn position for the current run. They do not preserve
  defeated enemies, collected objects, or puzzle state on respawn.
- Best-score records are browser-local and identified by campaign position and
  level name.
