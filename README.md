# Little Level Lab

A browser-based platformer level editor built with Vite and Phaser.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)

To check that they are installed, open a terminal and run:

```sh
node --version
npm --version
```

## Run the editor

1. Open a terminal in VS Code: **Terminal → New Terminal**.
2. Change to the project folder:

   ```sh
   cd "/Users/japv/Documents/Project/PlayGround/game-engine-platformer"
   ```

   If your project is in a different location, use that folder's path instead.

3. Install the project dependencies. You only need to do this the first time, or after dependencies change:

   ```sh
   npm install
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open **http://localhost:3000/** in your browser. Vite may open it automatically.

Keep the terminal running while you use the editor. To stop the server, focus the terminal and press **Ctrl+C** (on macOS, **Control+C**).

## Use the editor

- The first showcase level is loaded when the page opens. Choose **Load demos** to restore all ten built-in levels.
- Play the ten-level showcase campaign, from **Pebble Path** to **Rainbow Crown Finale**, to try the supported terrain, platforms, collectibles, original enemy and boss designs, switches, doors, checkpoints, and power-ups. Each level gives you a different jumping, timing, or puzzle challenge.
- Use the **Campaign** selector to switch levels while editing. **＋ Level** adds a blank level; **− Level** removes the selected one. After editing each stage, use **Save campaign** to download the whole set, or **Open campaign** to load it later. The existing **Save/Open** buttons still handle one level at a time.
- Connect pipe travel between campaign areas with the **🔗 Pipe link** control. Every pipe placed in that level leads to the chosen destination; choose an empty arrival tile there and link a pipe back for a return trip. In play, press **↓/S** while standing on a connected pipe, or **↑** beside one. The showcase links Golden Dune Dash and Meadow Machineworks.
- Choose a toolbox item, then click or drag on the board to place it.
- Choose **Mystery Box** and set its **Box reward** in the toolbox before placing boxes. The small badge on each box shows its reward. In Play mode, jump into an unused box from below to release the item; it moves right and can be collected.
- Place **Super mushroom**, **Star power**, or **Extra life** directly on the board too. A mushroom makes the player bigger, faster, and able to jump higher; a star grants eight seconds of invincibility; an extra life adds a life. A big player shrinks instead of losing a life when hit.
- Add different enemies from the toolbox: **Goomba** patrols on the ground, **Koopa** is a faster armored ground patrol, and **Bat** flies through the air. Jump on any enemy to defeat it. Select an enemy or the **Player**, then choose **Motion** to upload separate idle and movement images.
- Add **Spring**, **Moving platform**, and **One-way platform** from the toolbox to build more varied jumps. Springs launch the player high when landed on; moving platforms travel side to side and can carry the player; one-way platforms can be jumped through from below and landed on from above. **Cave Switchback** and the later showcase stages include all three.
- Place a **Switch** and any number of **Doors** to create a simple puzzle. Touching a switch opens every closed door in that level; doors are solid until activated. **Cave Switchback**, **Meadow Machineworks**, and **Emerald Forest Maze** include switch-and-door challenges.
- Place a **Fire flower** to grant the player a fire power-up. Press **X** or **J** to shoot fireballs at ground and flying enemies; shots disappear when they hit an enemy or platform. Fire flowers can also be selected as Mystery Box rewards.
- Place a **Checkpoint** flag to save a respawn point for the current run. Falling after reaching it costs a life and returns the player there; the player returns to normal size and loses temporary powers. Best scores are saved per campaign level in this browser and shown in the play HUD.
- Choose **♫ Sounds** to upload and configure event sounds. Built-in retro tones play automatically; an uploaded sound overrides its matching tone and has its own preview, enable switch, and volume. Sounds can be configured for jumps, coins, enemies, switches, checkpoints, and more, and settings are included when you save a level.
- Collecting coins or power-ups, defeating enemies, activating switches/checkpoints, and other key actions now show small particle bursts; major events also use brief camera shake.
- Choose **Play level** to try the level. Use **A/D** or the arrow keys to move; use **W**, **↑**, or **Space** to jump. Hold **Shift** to run.
- On a connected pipe, press **↓/S** from its top or **↑** while beside it to travel between linked campaign areas. Touch players can show the touch controls and use the down-arrow pipe button.
- Jumps have a short input buffer and edge grace period, so a jump pressed just before landing or just after leaving a ledge is still accepted.
- After a loss, choose **Replay level** to retry from the start of that level. Reaching a goal shows **Next level** during the campaign; completing the full campaign triggers an extended fireworks celebration and a trophy screen.
- During play, the player has three lives. Enemy hits cost a life; falling below the level or losing all lives ends the run.
- Use **Save** to download a level file and **Open** to load one.

## Production build (optional)

To make a production build:

```sh
npm run build
```

To serve that build locally:

```sh
npm run preview
```

Open the local URL printed by Vite. The preview server is separate from the development server.

## Host on GitHub Pages

This repository includes a GitHub Actions workflow that builds and deploys the
site when changes are pushed to `main`. Vite is configured to use the
`/KidCodeArcade/` project-site path in GitHub Actions builds.

1. Push the repository's `main` branch to GitHub.
2. On GitHub, open **Settings → Pages** for the repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
   The deployed site URL will appear in the workflow run or under
   **Settings → Pages**. For this repository, it should be
   `https://pvthanh.github.io/KidCodeArcade/`.
5. Future pushes to `main` deploy automatically; the workflow can also be run
   manually from **Actions**.

GitHub Pages publishes a public website. A private repository can be a Pages
source only when the account/organization plan supports Pages for private
repositories. On accounts without that support, make the repository public or
use a hosting provider that supports private Git sources. Even if source code
is in a private repository, a publicly deployed site is visible to anyone with
its URL. The game has no server; levels and uploads remain in the visitor's
browser or downloaded files.

## Install as an app

The production site is a Progressive Web App (PWA). After deploying it to an
HTTPS host (GitHub Pages already uses HTTPS), you can install it from a phone:

- **Android:** Open the site in Chrome, then use **Install app** or **Add to
  Home screen** from the browser menu.
- **iPhone or iPad:** Open the site in Safari, tap **Share**, then choose **Add
  to Home Screen**. iOS does not show the Android-style install prompt.

The installed app requests landscape orientation. If iOS does not rotate the
app automatically, a rotate-device notice asks you to turn the device sideways.
The app shell and built-in game assets are cached after the first successful
online visit, so the editor can reopen offline. Internet access is still needed
for the first visit and for future site updates. Export levels and campaigns
with **Save** or **Save campaign** to keep backups; installing the app does not
sync projects between devices.

## Troubleshooting

- **`npm: command not found` or `node: command not found`:** Install Node.js, reopen the terminal, then check the version commands above.
- **`vite: command not found`:** Run `npm install` from the project folder.
- **Port 3000 is already in use:** Vite may print a different local URL; open the URL shown in the terminal.
- **The page does not load:** Make sure `npm run dev` is still running and check that the terminal has not reported an error.
