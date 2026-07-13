// The frog is drawn procedurally from a small bag of pose numbers rather than a
// stack of sprite frames — that's what lets one little body blink, look around,
// puff its throat, yawn, stretch and wave from continuous values. `drawFrog`
// reads a pose and paints it; the AI in `Frog.ts` is the only thing that writes
// one. Everything snaps to the virtual-pixel grid so it stays crisp pixel art.

import { fillEllipse, fillRect, px } from "../../render/pixels";
import { withAlpha, mix } from "../../render/color";
import { clamp01, lerp } from "../../anim/math";
import { C } from "../../config/theme";

export interface FrogPose {
  /** Upper eyelid sweep from a quick blink, 0 open → 1 shut. */
  blink: number;
  /** Sustained sleepy droop of the lids, 0 open → 1 shut. */
  lid: number;
  /** Pupil offset, each roughly [-1,1]. */
  eyeX: number;
  eyeY: number;
  /** Mouth gape for yawns/croaks, 0 closed → 1 wide. */
  mouth: number;
  /** Mouth curve, -1 frown → 0 flat → 1 grin. */
  smile: number;
  /** Throat pouch inflation, 0 slack → 1 full puff. */
  throat: number;
  /** Whole-body tilt, [-1,1]. */
  lean: number;
  /** Vertical squash/stretch of the body, 1 = neutral. */
  squashY: number;
  /** Arm raise per side, 0 resting → 1 up by the head. */
  armL: number;
  armR: number;
  /** Sideways swing of a raised right hand (for waving). */
  armWave: number;
  /** Body lift in virtual pixels (croak hop / stretch), + = up. */
  bounce: number;
}

export const restPose = (): FrogPose => ({
  blink: 0,
  lid: 0,
  eyeX: 0,
  eyeY: -0.05,
  mouth: 0,
  smile: 0.3,
  throat: 0.12,
  lean: 0,
  squashY: 1,
  armL: 0,
  armR: 0,
  armWave: 0,
  bounce: 0,
});

// Pre-mixed tints so the hot path never parses hex.
const EYE_BASE = mix(C.frogEyeHi, C.frogBody, 0.24); // pale, not stark white
const SHADOW = "#0a1512";

/** A short, thick limb segment from shoulder to hand. */
const limb = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  thick: number
): void => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  const h = thick / 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    fillRect(ctx, x0 + (x1 - x0) * t - h, y0 + (y1 - y0) * t - h, thick, thick, color);
  }
};

/**
 * Paint the frog. `(cx, cy)` is where it meets the pad (bottom-centre of the
 * body); `bw` is the body half-width the rest of the anatomy scales from.
 */
export function drawFrog(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bw: number,
  p: FrogPose
): void {
  const bh = bw * 0.8;
  const sq = p.squashY;
  const bodyW = bw * (1 + (1 - sq) * 0.5); // widen as it squashes (volume-ish)
  const bodyH = bh * sq;
  const seatY = cy;
  const bodyCx = cx + p.lean * bw * 0.12;
  const bodyCy = seatY - bodyH * 0.82 - p.bounce;

  // ── Contact shadow on the pad ──────────────────────────────────────────
  fillEllipse(ctx, cx, seatY + 1, bodyW * 1.05 * (1 - p.bounce * 0.03), bh * 0.3, withAlpha(SHADOW, 0.32));

  // ── Back haunches, tucked behind the body ──────────────────────────────
  for (const side of [-1, 1]) {
    fillEllipse(ctx, bodyCx + side * bodyW * 0.84, bodyCy + bodyH * 0.42, bodyW * 0.4, bodyH * 0.5, C.frogBodyShade);
  }

  // ── Front feet peeking out at the waterline ────────────────────────────
  for (const side of [-1, 1]) {
    const fx = cx + side * bw * 0.58;
    const fy = seatY - 2;
    fillEllipse(ctx, fx, fy, bw * 0.3, bw * 0.15, C.frogBodyShade);
    fillEllipse(ctx, fx, fy - 1, bw * 0.24, bw * 0.11, C.frogBody);
    px(ctx, Math.round(fx - bw * 0.16), Math.round(fy), C.frogBodyShade);
    px(ctx, Math.round(fx + bw * 0.16), Math.round(fy), C.frogBodyShade);
  }

  // ── Body, belly, top light ─────────────────────────────────────────────
  fillEllipse(ctx, bodyCx, bodyCy, bodyW, bodyH, C.frogBody);
  fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.34, bodyW * 0.6, bodyH * 0.5, C.frogBelly);
  fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.5, bodyW * 0.5, bodyH * 0.28, C.frogBellyShade);
  fillEllipse(ctx, bodyCx - bodyW * 0.16, bodyCy - bodyH * 0.34, bodyW * 0.5, bodyH * 0.34, C.frogBodyLit);

  // ── Throat pouch ───────────────────────────────────────────────────────
  if (p.throat > 0.04) {
    const th = p.throat;
    fillEllipse(ctx, bodyCx, bodyCy + bodyH * 0.6, bodyW * 0.34 * (0.7 + th * 0.6), bodyH * 0.3 * (0.5 + th), C.frogBelly);
  }

  // ── Face geometry ──────────────────────────────────────────────────────
  const eyeSpread = bodyW * 0.5;
  const eyeY = bodyCy - bodyH * 0.48;
  const eyeR = bw * 0.34;
  const my = bodyCy + bodyH * 0.2; // mouth centre

  // Cheeks (soft blush).
  for (const side of [-1, 1]) {
    fillEllipse(ctx, bodyCx + side * bodyW * 0.5, my - 1, bw * 0.16, bw * 0.1, withAlpha(C.frogCheek, 0.5));
  }

  // Nostrils.
  px(ctx, Math.round(bodyCx - bw * 0.14), Math.round(eyeY + eyeR * 1.15), C.frogBodyShade);
  px(ctx, Math.round(bodyCx + bw * 0.14), Math.round(eyeY + eyeR * 1.15), C.frogBodyShade);

  // Mouth.
  if (p.mouth > 0.06) {
    const openH = p.mouth * bodyH * 0.5;
    const mw = bodyW * 0.6;
    fillRect(ctx, bodyCx - mw * 0.7, my - openH * 0.2, mw * 1.4, 1, C.frogMouth);
    fillEllipse(ctx, bodyCx, my + openH * 0.4, mw * 0.66, openH, C.frogMouth);
    fillEllipse(ctx, bodyCx, my + openH * 0.7, mw * 0.4, openH * 0.5, withAlpha(C.frogCheek, 0.85));
  } else {
    const mw = bodyW * 0.6;
    const amp = bw * 0.2 * p.smile;
    ctx.fillStyle = C.frogMouth;
    for (let x = -mw; x <= mw; x++) {
      const r = x / mw;
      const yy = my + amp * (1 - r * r);
      ctx.fillRect(Math.round(bodyCx + x), Math.round(yy), 1, 1);
    }
  }

  // Eyes (mound → pale ball → pupil → glint → lid).
  const lidClose = clamp01(Math.max(p.blink, p.lid));
  for (const side of [-1, 1]) {
    const ex = bodyCx + side * eyeSpread;
    fillEllipse(ctx, ex, eyeY, eyeR * 1.15, eyeR * 1.15, C.frogBody);
    fillEllipse(ctx, ex - eyeR * 0.2, eyeY - eyeR * 0.28, eyeR * 0.66, eyeR * 0.56, C.frogBodyLit);
    fillEllipse(ctx, ex, eyeY, eyeR, eyeR, EYE_BASE);

    const ppx = ex + p.eyeX * eyeR * 0.42;
    const ppy = eyeY + p.eyeY * eyeR * 0.42;
    const pr = eyeR * 0.6;
    fillEllipse(ctx, ppx, ppy, pr, pr * 1.05, C.frogEye);
    fillRect(ctx, ppx - pr * 0.5, ppy - pr * 0.55, Math.max(1, eyeR * 0.3), Math.max(1, eyeR * 0.3), C.frogEyeHi);

    if (lidClose > 0.02) {
      const lidY = eyeY - eyeR + 2 * eyeR * lidClose; // bottom edge of the lid
      fillEllipse(ctx, ex, lidY - eyeR, eyeR * 1.2, eyeR, C.frogBody);
      fillRect(ctx, ex - eyeR, lidY, eyeR * 2, 1, C.frogBodyShade);
    }
  }

  // ── Arms / hands last, so a raised hand reads in front of the face ─────
  for (const side of [-1, 1]) {
    const raise = side > 0 ? p.armR : p.armL;
    const wave = side > 0 ? p.armWave : 0;
    const shx = bodyCx + side * bodyW * 0.66;
    const shy = bodyCy + bodyH * 0.2;
    const restHx = cx + side * bw * 0.42;
    const restHy = seatY - bh * 0.12;
    const upHx = shx + side * bw * 0.05 + wave * bw * 0.6;
    const upHy = shy - bh * 1.15;
    const hx = lerp(restHx, upHx, raise);
    const hy = lerp(restHy, upHy, raise);
    if (raise > 0.12) limb(ctx, shx, shy, hx, hy, C.frogBodyShade, 2);
    fillEllipse(ctx, hx, hy, bw * 0.2, bw * 0.18, C.frogBody);
    fillEllipse(ctx, hx - 1, hy - 1, bw * 0.12, bw * 0.1, C.frogBodyLit);
  }
}
