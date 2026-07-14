// Lily pads drifting on the surface. Each is a flattened disc with a radial slit,
// a rim, and a top highlight; it bobs gently and pushes a faint wake into the
// water. One large "hero" pad sits low and centre — that's where the frog will
// settle in the next phase.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { fillEllipse, ring } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { bob } from "../../anim/oscillate";
import { TAU, lerp } from "../../anim/math";
import { C } from "../../config/theme";

export interface Pad {
  x: number;
  y: number;
  rx: number;
  ry: number;
  period: number;
  phase: number;
  slit: number; // angle of the notch
  hero: boolean;
  /** Lushness at which this pad appears (0 = always). */
  threshold: number;
  /** Eased 0→1 reveal scale — pops in when its threshold is crossed. */
  grow: number;
}

// Pads present from the start (besides the hero); the rest unfurl as the pond
// flourishes (more bugs caught → more lushness → more pads).
const STARTER_PADS = 4;

export class LilyPads implements SceneElement {
  readonly pads: Pad[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly count = 6
  ) {}

  relayout(): void {
    this.pads.length = 0;
  }

  /** The big centre-low pad the frog sits on. Undefined until first built. */
  heroPad(): Pad | undefined {
    return this.pads.find((p) => p.hero);
  }

  private build(lushness: number): void {
    const { w, h, waterlineY } = this.layout;
    const waterH = h - waterlineY;
    this.pads.length = 0;

    // Hero pad: large, low, slightly left of centre — always present.
    this.pads.push({
      x: Math.round(w * 0.46),
      y: Math.round(waterlineY + waterH * 0.72),
      rx: Math.round(Math.min(w * 0.12, 30)),
      ry: 0,
      period: this.rng.range(4.5, 6),
      phase: this.rng.next(),
      slit: this.rng.range(-0.5, 0.5),
      hero: true,
      threshold: 0,
      grow: 1,
    });

    const ramp = Math.max(1, this.count - STARTER_PADS - 1);
    for (let i = 0; i < this.count; i++) {
      const depth = this.rng.next(); // 0 far → 1 near
      const y = waterlineY + waterH * (0.12 + depth * 0.8);
      const rx = (7 + depth * 17) * this.rng.range(0.8, 1.2);
      // Starters are here from the off; the rest reveal across rising lushness.
      const threshold = i < STARTER_PADS ? 0 : lerp(0.36, 1, (i - STARTER_PADS) / ramp);
      this.pads.push({
        x: Math.round(this.rng.range(w * 0.08, w * 0.92)),
        y: Math.round(y),
        rx: Math.round(rx),
        ry: 0,
        period: this.rng.range(3.5, 6.5),
        phase: this.rng.next(),
        slit: this.rng.range(0, TAU),
        hero: false,
        threshold,
        grow: lushness >= threshold ? 1 : 0,
      });
    }
    for (const p of this.pads) p.ry = Math.max(2, Math.round(p.rx * 0.42));
    this.pads.sort((a, b) => a.y - b.y); // paint far→near
  }

  render(world: World): void {
    const lush = world.progress.lushness;
    if (this.pads.length === 0) this.build(lush);
    const { ctx, t, dt } = world;

    for (const p of this.pads) {
      // Ease the reveal toward its target (1 once lushness clears the threshold).
      const target = lush >= p.threshold ? 1 : 0;
      p.grow += (target - p.grow) * Math.min(1, dt * 3.5);
      if (p.grow < 0.02) continue;

      const rx = Math.max(1, Math.round(p.rx * p.grow));
      const ry = Math.max(1, Math.round(p.ry * p.grow));
      const dy = bob(t, p.period, 1.1, p.phase);
      const cx = p.x;
      const cy = Math.round(p.y + dy);

      // Wake: a faint disturbance ring where the pad meets the water.
      const wakeA = 0.1 + 0.06 * Math.sin((t / p.period) * TAU + p.phase * TAU);
      ring(ctx, cx, cy + 1, rx + 1, withAlpha(C.waterHi2, Math.max(0, wakeA)));

      // Rim (slightly larger dark disc) then the pad body and top light.
      fillEllipse(ctx, cx, cy, rx + 1, ry + 1, C.padRim);
      fillEllipse(ctx, cx, cy, rx, ry, C.padBase);
      fillEllipse(ctx, cx - Math.round(rx * 0.18), cy - 1, Math.round(rx * 0.72), Math.round(ry * 0.6), C.padLit);

      this.drawSlit(ctx, cx, cy, p, rx);
    }
  }

  private drawSlit(ctx: CanvasRenderingContext2D, cx: number, cy: number, p: Pad, rx: number): void {
    // Dark wedge from the rim toward the centre — the lily pad's signature notch.
    const dx = Math.cos(p.slit);
    const dy = Math.sin(p.slit) * 0.42;
    ctx.fillStyle = C.padDark;
    for (let i = 0; i < rx; i++) {
      const x = cx + dx * i;
      const y = cy + dy * i;
      const wdt = Math.max(1, Math.round((1 - i / rx) * 2));
      ctx.fillRect(Math.round(x) - (wdt >> 1), Math.round(y), wdt, 1);
    }
  }
}
