// A paper lantern hung from an unseen branch. It sways on its string, its warm
// glow breathes with a candle flicker, and it's the pond's second light source
// after the moon. `brightness` is left adjustable so a later hidden interaction
// (clicking it) can dim or lift the whole scene's warmth.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import { Sprite } from "../../render/Sprite";
import { withAlpha } from "../../render/color";
import { flicker, sway } from "../../anim/oscillate";
import { damp } from "../../anim/math";
import { C } from "../../config/theme";

const LANTERN_ROWS = [
  "     fff     ",
  "    fpppf    ",
  "   fpLLLpf   ",
  "  fpLLLLLpf  ",
  " fpLLLLLLLpf ",
  " pLLLLwLLLLp ",
  " pLLLwwwLLLp ",
  " pLLLLwLLLLp ",
  " fpLLLLLLLpf ",
  "  fpLLLLLpf  ",
  "   fpLLLpf   ",
  "    fpppf    ",
  "     fff     ",
  "      f      ",
  "      w      ",
];

// Bulb centre within the sprite grid.
const CX = 6;
const CY = 6;

export class Lantern implements SceneElement {
  private readonly sprite: Sprite;
  brightness = 1;
  private pulse = 0; // fades after a click, flaring the glow

  constructor(private readonly layout: PondLayout) {
    this.sprite = Sprite.from(LANTERN_ROWS, {
      f: C.lanternFrame,
      p: C.lanternPaperDeep,
      L: C.lanternPaper,
      w: C.lanternPaperLit,
      " ": null,
    });
  }

  /** A click: flare the flame, then let it settle back. */
  brighten(): void {
    this.pulse = 1;
  }

  /** Is a point (in this layer's space) on the lantern bulb? */
  hitTest(x: number, y: number): boolean {
    return Math.hypot(x - this.layout.lantern.x, y - this.layout.lantern.y) <= 10;
  }

  update(world: World): void {
    this.pulse = damp(this.pulse, 0, 0.04, world.dt);
  }

  render(world: World): void {
    const { ctx, t } = world;
    const ax = this.layout.lantern.x;
    const ay = this.layout.lantern.y;

    const swing = sway(t, 5.2, 1.8, 3.1);
    const bx = ax + swing;
    const flick = flicker(t, 1.3, 0.78) * (this.brightness + this.pulse * 0.9);

    // String up to the (off-screen) branch, leaning with the swing.
    ctx.strokeStyle = C.lanternString;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax + 0.5, 0);
    ctx.lineTo(bx + 0.5, ay - CY);
    ctx.stroke();

    // Warm glow, additive so it pools into the night without washing out.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const r = (this.layout.h * 0.11 + 6) * (0.9 + 0.1 * flick);
    const glow = ctx.createRadialGradient(bx, ay, 1, bx, ay, r);
    glow.addColorStop(0, withAlpha(C.lanternGlow, 0.5 * flick));
    glow.addColorStop(0.4, withAlpha(C.lanternGlow, 0.18 * flick));
    glow.addColorStop(1, withAlpha(C.lanternGlow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(bx - r, ay - r, r * 2, r * 2);
    ctx.restore();

    // The lantern body.
    this.sprite.draw(ctx, Math.round(bx) - CX, Math.round(ay) - CY);

    // A tiny hot core that pulses with the flame.
    ctx.fillStyle = withAlpha(C.lanternPaperLit, 0.5 + 0.5 * flick);
    ctx.fillRect(Math.round(bx), Math.round(ay), 1, 1);
  }
}
