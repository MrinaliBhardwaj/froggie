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
import { TAU } from "../../anim/math";
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
}

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

  private build(): void {
    const { w, h, waterlineY } = this.layout;
    const waterH = h - waterlineY;
    this.pads.length = 0;

    // Hero pad: large, low, slightly left of centre.
    this.pads.push({
      x: Math.round(w * 0.46),
      y: Math.round(waterlineY + waterH * 0.72),
      rx: Math.round(Math.min(w * 0.09, 22)),
      ry: 0,
      period: this.rng.range(4.5, 6),
      phase: this.rng.next(),
      slit: this.rng.range(-0.5, 0.5),
      hero: true,
    });

    for (let i = 0; i < this.count; i++) {
      const depth = this.rng.next(); // 0 far → 1 near
      const y = waterlineY + waterH * (0.12 + depth * 0.8);
      const rx = (5 + depth * 12) * this.rng.range(0.8, 1.2);
      this.pads.push({
        x: Math.round(this.rng.range(w * 0.08, w * 0.92)),
        y: Math.round(y),
        rx: Math.round(rx),
        ry: 0,
        period: this.rng.range(3.5, 6.5),
        phase: this.rng.next(),
        slit: this.rng.range(0, TAU),
        hero: false,
      });
    }
    for (const p of this.pads) p.ry = Math.max(2, Math.round(p.rx * 0.42));
    this.pads.sort((a, b) => a.y - b.y); // paint far→near
  }

  render(world: World): void {
    if (this.pads.length === 0) this.build();
    const { ctx, t } = world;
    for (const p of this.pads) {
      const dy = bob(t, p.period, 1.1, p.phase);
      const cx = p.x;
      const cy = Math.round(p.y + dy);

      // Wake: a faint disturbance ring where the pad meets the water.
      const wakeA = 0.1 + 0.06 * Math.sin((t / p.period) * TAU + p.phase * TAU);
      ring(ctx, cx, cy + 1, p.rx + 1, withAlpha(C.waterHi2, Math.max(0, wakeA)));

      // Rim (slightly larger dark disc) then the pad body and top light.
      fillEllipse(ctx, cx, cy, p.rx + 1, p.ry + 1, C.padRim);
      fillEllipse(ctx, cx, cy, p.rx, p.ry, C.padBase);
      fillEllipse(ctx, cx - Math.round(p.rx * 0.18), cy - 1, Math.round(p.rx * 0.72), Math.round(p.ry * 0.6), C.padLit);

      this.drawSlit(ctx, cx, cy, p);
    }
  }

  private drawSlit(ctx: CanvasRenderingContext2D, cx: number, cy: number, p: Pad): void {
    // Dark wedge from the rim toward the centre — the lily pad's signature notch.
    const dx = Math.cos(p.slit);
    const dy = Math.sin(p.slit) * 0.42;
    ctx.fillStyle = C.padDark;
    for (let i = 0; i < p.rx; i++) {
      const x = cx + dx * i;
      const y = cy + dy * i;
      const wdt = Math.max(1, Math.round((1 - i / p.rx) * 2));
      ctx.fillRect(Math.round(x) - (wdt >> 1), Math.round(y), wdt, 1);
    }
  }
}
