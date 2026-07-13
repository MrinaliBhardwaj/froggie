// Top-level orchestrator. Wires the renderer, clock, input and world together,
// owns the requestAnimationFrame loop, and delegates all content to the Scene.
// Deliberately thin — game logic lives in systems and scene elements, not here.

import { Clock } from "./Clock";
import { Input } from "./Input";
import { Renderer } from "./Renderer";
import { World } from "./World";
import { Scene } from "../world/Scene";
import { C } from "../config/theme";

export class Game {
  private readonly renderer: Renderer;
  private readonly clock = new Clock();
  private readonly input: Input;
  private readonly world: World;
  private readonly scene: Scene;

  private running = false;
  private booted = false;
  private readonly onFirstFrame?: () => void;

  constructor(canvas: HTMLCanvasElement, onFirstFrame?: () => void) {
    this.renderer = new Renderer(canvas, { targetHeight: 232 });
    this.input = new Input(canvas);
    this.world = new World(this.input);
    this.onFirstFrame = onFirstFrame;

    this.syncViewport(this.renderer.width, this.renderer.height);
    this.scene = new Scene(this.world);
    this.renderer.onResize((w, h) => {
      this.syncViewport(w, h);
      this.scene.relayout(this.world);
    });

    // Pause the loop when the tab is hidden — no point simulating an unseen
    // pond, and it keeps the delta clamp honest on return.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else this.start();
    });
  }

  private syncViewport(w: number, h: number): void {
    this.world.width = w;
    this.world.height = h;
    this.input.setViewport(this.renderer.pixelSize, w, h);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.tick(performance.now()); // reset delta baseline
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.clock.tick(now);

    const world = this.world;
    world.t = this.clock.elapsed;
    world.dt = this.clock.delta;
    world.ctx = this.renderer.ctx;

    world.camera.update(world.t, world.dt, this.input);
    this.scene.update(world);

    this.renderer.clear(C.skyDeep);
    this.scene.render(world);

    if (!this.booted) {
      this.booted = true;
      this.onFirstFrame?.();
    }

    requestAnimationFrame(this.frame);
  };
}
