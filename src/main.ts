// Entry point. Grab the canvas, start the game, and fade the boot label out once
// the first frame has painted.

import { Game } from "./engine/Game";
import { Panel } from "./ui/Panel";

const canvas = document.getElementById("stage") as HTMLCanvasElement | null;
const boot = document.getElementById("boot");

if (!canvas) {
  throw new Error("#stage canvas not found");
}

const panel = new Panel();

const game = new Game(
  canvas,
  () => {
    boot?.classList.add("hidden");
    window.setTimeout(() => boot?.remove(), 1000);
    panel.reveal();
  },
  (bugsFixed) => panel.setBugs(bugsFixed)
);

game.start();
