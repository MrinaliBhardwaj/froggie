# Decisions — Lotus Pond

A running log of significant direction calls, so a future session (or a rebuild)
inherits them. Newest at the bottom.

## Tech & architecture

- **Vite + TypeScript + HTML5 Canvas 2D**, not Next.js. This is a real-time
  canvas game, not a webpage; React/SSR would fight a 60fps loop. Vite gives
  instant HMR for iterating on pixel art. Zero runtime dependencies.
- **Low internal resolution, nearest-neighbour upscale.** Everything renders
  into a small backing store (~chunky "virtual pixels", internal height ≈ 232px)
  and the browser scales it to fill the window. This is what makes the pixels
  crisp and keeps fill-rate tiny on slow hardware. See `engine/Renderer.ts`.
- **Modular systems, no monolith.** Layout mirrors a small game:
  - `engine/` — Game loop, Renderer, Camera, Clock, Input, Random, Layer, World.
  - `anim/` — reusable math, easing, noise, oscillator helpers. Animations
    compose these instead of hand-rolling `Math.sin` everywhere.
  - `render/` — Sprite compiler (char-grid → baked canvas), palette/colour,
    pixel primitives, offscreen-cache base class.
  - `world/` — Scene composition + one file per environment element.
  - `config/theme.ts` — the single palette.
  - `ui/` — cursor (and, later, the glass HUD).
- **World = shared blackboard.** Every element reads context (time, size, input)
  and services (rng, camera) and progression state from one `World` object. The
  frog, bugs and particles in later phases become `SceneElement`s dropped into
  the `stage` layer — the pipeline doesn't change.

## Visual direction

- **Pixel art only**, authored by hand — either as character-grid sprites
  (`Sprite.from`) or procedural pixel drawing. No SVG, no emoji, no 3D-illustration
  look.
- **One limited night palette** in `config/theme.ts`: deep navy → purple → teal,
  warm lantern orange, firefly yellow, soft pink highlights. Ghibli-ish dusk.
- **Parallax diorama, not a flat picture.** Ten depth layers from a pinned sky to
  foreground foliage. A gentle noise-driven camera drift + a subtle lean toward
  the cursor separate the layers so it reads as a lit box (FEZ-ish).
- **Gradients are interpolated per pixel-row**, not hard-snapped — smooth dusk
  sky while still chunky at display size. (Reverted an early hard-banded look; the
  stripes read as an artifact.)
- **Always alive, never on a timer.** Idle motion everywhere: star twinkle, reed
  sway (noise-gusted), water shimmer, wobbling moon/lantern reflections, lantern
  flicker, drifting petals, ambient ripples — all on independent, non-repeating
  phases.

## The frog (Phase 2)

- **Procedural, not sprite frames.** The frog is drawn from a ~13-number pose
  (`FrogPose`) every frame rather than a spritesheet. A rich idle vocabulary
  (blink, look, croak, stretch, yawn, scratch, wave, sleep) is far cheaper to get
  smooth and non-repeating from continuous values than from hand-drawn frames,
  and it still snaps to the pixel grid so it reads as pixel art.
- **Behaviour = its own AI, decoupled from drawing.** `Frog.ts` holds all state
  and a weighted behaviour scheduler; `FrogPose.ts` only knows how to paint a
  pose. Behaviours relax back to a rest pose via `damp`, so they blend instead of
  snapping. One-shot scripted actions use a reusable `anim/Tween.ts`.
- **It rides the hero pad.** The frog reads `LilyPads.heroPad()` and bobs with it,
  rather than hard-coding a position — so it stays seated if the pad layout
  changes. Falls back to a layout-derived spot on the first frame before pads
  build.
- **Alive at rest.** Always-on breathing + throat, pointer-tracking pupils, random
  single/double blinks, and dozing off after ~24s idle (woken by a poke) — the
  frog is never a static idle loop.

## Scope guardrails

- Built in the brief's **5 phases**, stopping after each for review. Phase 1 is
  engine + environment only — **the frog is intentionally not here yet** (Phase 2).
  The hero lily pad (centre, low) is staged for it.
- No score/timer/failure, ever. Progression = the pond visibly flourishing
  (`World.progress.lushness`, already wired into flower bloom; grown in Phase 5).
