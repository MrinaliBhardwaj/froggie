// Composes the whole diorama: it builds the parallax layer stack, populates each
// layer with environment pieces, and routes per-frame input (a click on the
// water sends out a ripple). Adding the frog, bugs and particles in later phases
// means dropping new elements into the `stage` layer — nothing here needs to
// change. Draw order is back-to-front by layer.

import { Layer } from "../engine/Layer";
import type { World } from "../engine/World";
import { makePondLayout, computePondLayout, type PondLayout } from "./PondLayout";

import { Sky } from "./environment/Sky";
import { Stars } from "./environment/Stars";
import { Moon } from "./environment/Moon";
import { Mountains } from "./environment/Mountains";
import { Bamboo } from "./environment/Bamboo";
import { Water } from "./environment/Water";
import { Reeds } from "./environment/Reeds";
import { LilyPads } from "./environment/LilyPads";
import { Flowers } from "./environment/Flowers";
import { Lantern } from "./environment/Lantern";
import { Foreground } from "./environment/Foreground";
import { Vignette } from "./environment/Vignette";
import { Frog, type Effects } from "./frog/Frog";
import { Bugs } from "./bugs/Bugs";
import { Fireflies } from "./fx/Fireflies";
import { Particles } from "./fx/Particles";
import { Cursor } from "../ui/Cursor";

const WATER_PARALLAX = 0.5;

interface MaybeRelayout {
  relayout?: () => void;
}

export class Scene {
  private readonly layers: Layer[] = [];
  private readonly layout: PondLayout = makePondLayout();
  private readonly water: Water;
  private readonly frog: Frog;
  private readonly bugs: Bugs;
  private readonly particles: Particles;

  constructor(world: World) {
    computePondLayout(this.layout, world.width, world.height);
    const rng = world.rng;

    const mk = (name: string, parallax: number): Layer => {
      const l = new Layer(name, parallax);
      this.layers.push(l);
      return l;
    };

    // Back to front. Distant layers barely move; the foreground swings widest.
    const sky = mk("sky", 0);
    const celestial = mk("celestial", 0.05);
    const mountains = mk("mountains", 0.12);
    const grove = mk("grove", 0.22);
    const farReeds = mk("farReeds", 0.4);
    const water = mk("water", WATER_PARALLAX);
    const props = mk("props", 0.7);
    const fireflies = mk("fireflies", 0.85);
    const stage = mk("stage", 1.0);
    const bugsLayer = mk("bugs", 1.0);
    const fxLayer = mk("fx", 1.0);
    const foreground = mk("foreground", 1.7);
    const overlay = mk("overlay", 0);

    sky.add(new Sky(this.layout));
    celestial.add(new Stars(this.layout, rng));
    celestial.add(new Moon(this.layout));
    mountains.add(new Mountains(this.layout, rng));
    grove.add(new Bamboo(this.layout, rng));

    // Dim reeds standing along the far bank.
    farReeds.add(
      new Reeds(this.layout, rng, {
        band: [0.04, 0.96],
        count: 16,
        heightFrac: [0.16, 0.4],
        amp: 2.2,
        lit: false,
        cattailChance: 0.22,
      })
    );

    this.water = water.add(new Water(this.layout, rng));

    props.add(new Lantern(this.layout));

    // Fireflies drift in the mid-depth, behind the frog; more of them light up as
    // the pond flourishes.
    fireflies.add(new Fireflies(this.layout, rng));

    // Catch flourishes (sparkles + hearts) live in front of the frog and bugs.
    this.particles = fxLayer.add(new Particles(rng));

    // The frog sends its catch flourishes here; the Scene routes them to the
    // particle pool and the water, so the frog knows nothing about either.
    const fx: Effects = {
      sparkle: (x, y, n) => this.particles.sparkle(x, y, n),
      heart: (x, y) => this.particles.heart(x, y),
      ripple: (x, y, s) => this.water.spawnRipple(x, y, s),
    };

    // The stage: everything resting on the near water. Bugs fly just above it in
    // their own layer; the frog reaches into it to catch them.
    const lily = stage.add(new LilyPads(this.layout, rng, 7));
    stage.add(new Flowers(this.layout, rng, 5));
    this.bugs = bugsLayer.add(new Bugs(this.layout, rng));
    this.frog = stage.add(new Frog(this.layout, rng, lily, this.bugs, fx));
    stage.add(
      new Reeds(this.layout, rng, {
        band: [0.0, 0.13],
        count: 5,
        heightFrac: [0.5, 0.9],
        amp: 3.4,
        lit: true,
        cattailChance: 0.6,
      })
    );
    stage.add(
      new Reeds(this.layout, rng, {
        band: [0.87, 1.0],
        count: 5,
        heightFrac: [0.5, 0.9],
        amp: 3.4,
        lit: true,
        cattailChance: 0.6,
      })
    );

    foreground.add(new Foreground(this.layout, rng));

    overlay.add(new Vignette());
    overlay.add(new Cursor());
  }

  /** Recompute layout and let size-dependent elements rebuild. */
  relayout(world: World): void {
    computePondLayout(this.layout, world.width, world.height);
    for (const layer of this.layers) {
      for (const item of layer.items) {
        (item as MaybeRelayout).relayout?.();
      }
    }
  }

  update(world: World): void {
    // Route taps: on a bug → the frog catches it; on the frog → poke it; on the
    // water → send out a ripple.
    for (const c of world.input.takeClicks()) {
      const sx = c.x + world.camera.x; // stage/bug space (parallax 1.0)
      const sy = c.y + world.camera.y;
      const bug = this.bugs.pick(sx, sy);
      if (bug) {
        this.frog.catch(bug);
        continue;
      }
      if (this.frog.hitTest(sx, sy)) {
        this.frog.poke();
        continue;
      }
      const wx = c.x + world.camera.x * WATER_PARALLAX;
      const wy = c.y + world.camera.y * WATER_PARALLAX;
      if (wy > this.layout.waterlineY) this.water.spawnRipple(wx, wy, 0.85);
    }

    for (const layer of this.layers) layer.update(world);
  }

  render(world: World): void {
    for (const layer of this.layers) layer.render(world);
  }
}
