// A field of stars that breathe. Positions are seeded once (kept above the
// horizon); each frame every star twinkles on its own slow phase, and a rare few
// are bright enough to earn a tiny cross of light.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import { osc01 } from "../../anim/oscillate";
import { px } from "../../render/pixels";
import { withAlpha } from "../../render/color";
import { C } from "../../config/theme";

interface Star {
  x: number; // fraction of width
  y: number; // fraction of horizon height
  period: number;
  phase: number;
  base: number; // baseline brightness
  bright: boolean;
}

export class Stars implements SceneElement {
  private stars: Star[] = [];

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random
  ) {
    this.build();
  }

  private build(): void {
    const count = 90;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: this.rng.next(),
        y: this.rng.range(0.02, 0.82), // only in the sky band
        period: this.rng.range(2.2, 6.5),
        phase: this.rng.next(),
        base: this.rng.range(0.25, 0.7),
        bright: this.rng.chance(0.14),
      });
    }
  }

  relayout(): void {
    // Positions are fractional, so nothing to rebuild — but reseeding would go here.
  }

  render(world: World): void {
    const { ctx, t } = world;
    const { w, waterlineY } = this.layout;
    const skyH = waterlineY;

    for (const s of this.stars) {
      const x = Math.round(s.x * w);
      const y = Math.round(s.y * skyH);
      const tw = s.base + (1 - s.base) * osc01(t, s.period, s.phase);
      const color = s.bright ? C.starBright : C.star;
      px(ctx, x, y, withAlpha(color, tw));

      if (s.bright && tw > 0.72) {
        const a = (tw - 0.72) / 0.28;
        const arm = withAlpha(C.starBright, a * 0.5);
        px(ctx, x - 1, y, arm);
        px(ctx, x + 1, y, arm);
        px(ctx, x, y - 1, arm);
        px(ctx, x, y + 1, arm);
      }
    }
  }
}
