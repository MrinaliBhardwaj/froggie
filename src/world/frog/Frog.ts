// The mascot. It rides the hero lily pad, watches the pointer, and idles through
// a little vocabulary of behaviours — blink, look around, croak, stretch, yawn,
// scratch, wave — chosen on gentle random timers. Left alone it dozes off; a
// poke wakes it with a startled croak. All state lives here; drawing is handled
// by `drawFrog`, so this file is pure behaviour (the frog's "AI system").
//
// After-eating reactions wait for bugs (Phase 3); the hooks it exposes
// (`poke`, `hitTest`) are what later phases and the Scene route interaction to.

import type { SceneElement } from "../../engine/types";
import type { World } from "../../engine/World";
import type { PondLayout } from "../PondLayout";
import type { Random } from "../../engine/Random";
import type { LilyPads } from "../environment/LilyPads";
import type { Pad } from "../environment/LilyPads";
import { bob, osc01 } from "../../anim/oscillate";
import { clamp, clamp01, lerp, smoothstep, damp } from "../../anim/math";
import { linear } from "../../anim/easing";
import { Tween } from "../../anim/Tween";
import { restPose, drawFrog, type FrogPose } from "./FrogPose";

type Behaviour = "lookAround" | "croak" | "stretch" | "yawn" | "scratch" | "wave";

// Relative odds of each idle behaviour when the timer fires.
const WEIGHTS: Record<Behaviour, number> = {
  lookAround: 3,
  croak: 1.4,
  scratch: 1.2,
  stretch: 1,
  yawn: 0.8,
  wave: 0.5,
};

const DURATION: Record<Behaviour, number> = {
  lookAround: 1.8,
  croak: 1.4,
  scratch: 1.6,
  stretch: 2.2,
  yawn: 2.6,
  wave: 1.8,
};

const REST_SMILE = 0.3;
const SLEEP_AFTER = 24; // seconds of no pointer movement → doze off

const hump = (k: number): number => Math.sin(Math.PI * clamp01(k));

export class Frog implements SceneElement {
  private readonly pose: FrogPose = restPose();

  // Anchor (stage-space) refreshed each frame; hitTest reads last frame's.
  private ax = 0;
  private ay = 0;
  private bw = 12;

  // Behaviour scheduler.
  private behaviour: Behaviour | null = null;
  private readonly clock = new Tween();
  private nextIn: number;

  // Blinking runs on its own timer so it can punctuate any behaviour.
  private readonly blinkClock = new Tween();
  private blinkIn: number;
  private blinkVal = 0;
  private doubleBlink = false;

  // Gaze + attention.
  private lookX = 0;
  private lookY = -0.05;
  private glanceX = 0;
  private glanceY = 0;
  private overrideGaze = false;
  private cursorNear = false;

  // Sleep / idle tracking.
  private asleep = false;
  private idle = 0;
  private lastPx = 0;
  private lastPy = 0;

  constructor(
    private readonly layout: PondLayout,
    private readonly rng: Random,
    private readonly lily: LilyPads
  ) {
    this.nextIn = rng.range(1.5, 3);
    this.blinkIn = rng.range(2, 5);
    // Seed a fallback anchor so a first-frame poke has something to test.
    const { w, h, waterlineY } = layout;
    this.ax = Math.round(w * 0.46);
    this.ay = Math.round(waterlineY + (h - waterlineY) * 0.72);
  }

  // ── Interaction hooks (Scene routes pointer events here) ────────────────

  /** Is the stage-space point on the frog? */
  hitTest(sx: number, sy: number): boolean {
    const dx = sx - this.ax;
    const dy = sy - (this.ay - this.bw * 0.7);
    const rx = this.bw * 1.35;
    const ry = this.bw * 1.15;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  /** A tap on the frog: wake, startle, and croak. */
  poke(): void {
    this.wake();
    this.pose.lid = 0;
    this.pose.blink = 0;
    this.start("croak");
    this.pose.bounce = this.bw * 0.4; // an immediate little jump
  }

  // ── Simulation ──────────────────────────────────────────────────────────

  update(world: World): void {
    const { dt, t, input, camera } = world;

    const a = this.computeAnchor(t);
    this.ax = a.x;
    this.ay = a.y;
    this.bw = a.scale;

    // Pointer in stage space (this layer's parallax is 1.0).
    const curX = input.x + camera.x;
    const curY = input.y + camera.y;
    const moved = Math.hypot(input.x - this.lastPx, input.y - this.lastPy);
    this.lastPx = input.x;
    this.lastPy = input.y;
    if (input.present && moved > 0.5) {
      this.idle = 0;
      if (this.asleep) this.wake();
    } else {
      this.idle += dt;
    }

    // Where to look: an active glance wins, else the pointer if it's close,
    // else a slow idle wander.
    const dx = curX - this.ax;
    const dy = curY - (this.ay - this.bw);
    this.cursorNear = input.present && Math.hypot(dx, dy) < this.bw * 9;
    if (this.overrideGaze) {
      this.lookX = this.glanceX;
      this.lookY = this.glanceY;
    } else if (this.cursorNear) {
      this.lookX = clamp(dx / (this.bw * 6), -1, 1);
      this.lookY = clamp(dy / (this.bw * 6), -0.7, 0.7);
    } else {
      this.lookX = Math.sin(t * 0.4) * 0.15;
      this.lookY = -0.05 + Math.sin(t * 0.27 + 1) * 0.1;
    }

    // Drift to sleep after a long undisturbed spell.
    if (!this.asleep && !this.behaviour && this.idle > SLEEP_AFTER) {
      this.asleep = true;
    }

    // Run / schedule behaviour.
    this.relax(dt);
    if (this.behaviour) {
      const k = this.clock.update(dt);
      this.apply(this.behaviour, k, t);
      if (this.clock.done) this.end();
    } else if (!this.asleep) {
      this.nextIn -= dt;
      if (this.nextIn <= 0) this.pick();
    }

    // Always-on breathing, folded on top of whatever the behaviour set.
    const breath = osc01(t, this.asleep ? 5.5 : 3.4);
    this.pose.squashY *= 1 - 0.03 * breath;
    this.pose.throat = Math.max(this.pose.throat, (this.asleep ? 0.16 : 0.12) + 0.08 * breath);

    // Blink (skipped while asleep — the lids are already shut).
    this.updateBlink(dt);
    if (!this.asleep) this.pose.blink = Math.max(this.pose.blink, this.blinkVal);
    else this.pose.lid = damp(this.pose.lid, 1, 0.0002, dt);

    // Ease the pupils to the gaze target; a nearby pointer lifts a small smile.
    this.pose.eyeX = damp(this.pose.eyeX, this.lookX, 0.0009, dt);
    this.pose.eyeY = damp(this.pose.eyeY, this.lookY, 0.0009, dt);
    if (this.cursorNear && !this.asleep) this.pose.smile = Math.max(this.pose.smile, 0.5);
  }

  /** Relax every channel a behaviour might have pushed back toward rest. */
  private relax(dt: number): void {
    const p = this.pose;
    p.smile = damp(p.smile, REST_SMILE, 0.002, dt);
    p.lean = damp(p.lean, 0, 0.002, dt);
    p.armL = damp(p.armL, 0, 0.003, dt);
    p.armR = damp(p.armR, 0, 0.003, dt);
    p.armWave = damp(p.armWave, 0, 0.001, dt);
    p.mouth = damp(p.mouth, 0, 0.001, dt);
    p.throat = damp(p.throat, 0, 0.004, dt);
    p.squashY = damp(p.squashY, 1, 0.002, dt);
    p.bounce = damp(p.bounce, 0, 0.001, dt);
    if (!this.asleep) p.lid = damp(p.lid, 0, 0.002, dt);
    p.blink = 0; // reapplied from the blink clock after behaviours run
  }

  private pick(): void {
    // Waving is only worth it when there's someone to wave at.
    let total = 0;
    const keys = Object.keys(WEIGHTS) as Behaviour[];
    for (const k of keys) total += k === "wave" && !this.cursorNear ? 0 : WEIGHTS[k];
    let r = this.rng.next() * total;
    let chosen: Behaviour = "lookAround";
    for (const k of keys) {
      const w = k === "wave" && !this.cursorNear ? 0 : WEIGHTS[k];
      if ((r -= w) <= 0) {
        chosen = k;
        break;
      }
    }
    this.start(chosen);
  }

  private start(b: Behaviour): void {
    this.behaviour = b;
    this.clock.start(DURATION[b], linear);
    if (b === "lookAround") {
      this.glanceX = this.rng.range(-1, 1);
      this.glanceY = this.rng.range(-0.5, 0.5);
      this.overrideGaze = true;
    }
  }

  private end(): void {
    this.behaviour = null;
    this.overrideGaze = false;
    this.nextIn = this.rng.range(2.4, 5.5);
  }

  private wake(): void {
    this.asleep = false;
    this.idle = 0;
  }

  /** Shape the pose for one behaviour from its linear progress `k`. */
  private apply(b: Behaviour, k: number, t: number): void {
    const p = this.pose;
    switch (b) {
      case "lookAround":
        p.lean = this.glanceX * 0.25 * hump(k);
        break;

      case "croak": {
        // Two throat pulses with a matching mouth flap and a small hop.
        const pulse = 0.55 * hump(clamp01(k / 0.5)) + 0.55 * hump(clamp01((k - 0.4) / 0.6));
        p.throat = 0.25 + 0.75 * Math.min(1, pulse);
        p.mouth = 0.18 * Math.min(1, pulse);
        p.bounce = this.bw * 0.12 * Math.min(1, pulse);
        p.smile = 0.5;
        break;
      }

      case "yawn": {
        const o = hump(k);
        p.mouth = smoothstep(0, 1, o);
        p.lid = 0.25 + 0.7 * o; // eyes squeeze shut at the peak
        p.lean = -0.18 * o;
        p.smile = 0.2;
        break;
      }

      case "stretch": {
        let sq = 1;
        let bnc = 0;
        let arm = 0;
        let lid = 0;
        if (k < 0.28) {
          const u = smoothstep(0, 1, k / 0.28);
          sq = lerp(1, 0.82, u); // crouch / anticipate
          arm = 0.2 * u;
          lid = 0.3 * u;
        } else if (k < 0.6) {
          const u = smoothstep(0, 1, (k - 0.28) / 0.32);
          sq = lerp(0.82, 1.15, u); // reach up
          bnc = Math.sin(Math.PI * u) * this.bw * 0.14;
          arm = lerp(0.2, 1, u);
          lid = lerp(0.3, 0.6, u);
        } else {
          const u = smoothstep(0, 1, (k - 0.6) / 0.4);
          sq = lerp(1.15, 1, u); // settle
          arm = lerp(1, 0, u);
          lid = lerp(0.6, 0, u);
        }
        p.squashY = sq;
        p.bounce = bnc;
        p.armL = arm;
        p.armR = arm;
        p.lid = Math.max(p.lid, lid);
        break;
      }

      case "scratch": {
        const r = hump(k);
        p.armR = smoothstep(0, 1, r) + (r > 0.3 ? Math.sin(t * 34) * 0.08 : 0);
        p.lean = 0.14 * r;
        p.lid = Math.max(p.lid, 0.2 * r);
        break;
      }

      case "wave": {
        const r = smoothstep(0, 1, hump(k));
        p.armR = r;
        p.armWave = Math.sin(t * 9) * 0.9 * r;
        p.smile = 0.6;
        break;
      }
    }
  }

  private updateBlink(dt: number): void {
    if (this.asleep) {
      this.blinkVal = 0;
      return;
    }
    if (!this.blinkClock.active && (this.blinkIn -= dt) <= 0) {
      this.blinkClock.start(0.16, linear);
      this.blinkIn = this.rng.range(2.4, 5.6);
      this.doubleBlink = this.rng.chance(0.22);
    }
    if (this.blinkClock.active) {
      const k = this.blinkClock.update(dt);
      this.blinkVal = Math.sin(Math.PI * k);
      if (this.blinkClock.done && this.doubleBlink) {
        this.doubleBlink = false;
        this.blinkClock.start(0.16, linear);
      }
    } else {
      this.blinkVal = 0;
    }
  }

  // ── Placement ────────────────────────────────────────────────────────────

  /** Sit on the hero pad (riding its bob); fall back to layout if not built. */
  private computeAnchor(t: number): { x: number; y: number; scale: number } {
    const pad: Pad | undefined = this.lily.heroPad();
    if (pad) {
      const dy = bob(t, pad.period, 1.1, pad.phase);
      return {
        x: pad.x,
        y: Math.round(pad.y + dy - pad.ry * 0.2),
        scale: clamp(pad.rx * 0.6, 9, 20),
      };
    }
    const { w, h, waterlineY } = this.layout;
    return {
      x: Math.round(w * 0.46),
      y: Math.round(waterlineY + (h - waterlineY) * 0.72),
      scale: 14,
    };
  }

  render(world: World): void {
    const a = this.computeAnchor(world.t);
    drawFrog(world.ctx, a.x, a.y, a.scale, this.pose);
  }
}
