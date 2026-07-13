// Entry point. Grab the canvas, start the game, and fade the boot label out once
// the first frame has painted.

import { Game } from "./engine/Game";

const canvas = document.getElementById("stage") as HTMLCanvasElement | null;
const boot = document.getElementById("boot");

if (!canvas) {
  throw new Error("#stage canvas not found");
}

const game = new Game(canvas, () => {
  boot?.classList.add("hidden");
  window.setTimeout(() => boot?.remove(), 1000);
});

game.start();
