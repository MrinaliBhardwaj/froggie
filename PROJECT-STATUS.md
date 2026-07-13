# Lotus Pond — Project Status

> Read this first. A tiny hand-crafted pixel-art frog diorama. Relaxing,
> nostalgic, no score/timer/failure. Built like a small game in 5 phases.

## Run it

```bash
npm install      # once
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build (currently ~9 KB gzipped JS)
```

## Where we are

**Phase 2 — The frog — ✅ complete.** A hand-drawn pixel frog sits on the hero
lily pad, riding its bob. It's drawn procedurally from a pose (not sprite frames)
so it animates continuously: slow breathing + throat, random single/double
blinks, pupils that track the pointer when it's near, and an idle behaviour
scheduler that cycles blink · look-around · croak · stretch · yawn · scratch ·
wave on gentle random timers. Leave it alone ~24s and it dozes off; click it to
wake it with a startled croak. Waving only triggers when the pointer's nearby.
Code: `src/world/frog/` (`Frog.ts` = AI, `FrogPose.ts` = pose + `drawFrog`),
plus a reusable `src/anim/Tween.ts`. After-eating reactions wait for bugs.

**Phase 1 — Engine, camera, scene composition, environment — ✅ complete.**

A full-window, layered night pond that is already alive when untouched:

- Low-res canvas engine with nearest-neighbour upscale; fixed-ish game loop,
  clamped delta, pauses when the tab is hidden.
- 10-layer parallax scene with a gentle drifting/cursor-leaning camera.
- Environment: dusk sky, twinkling stars, moon (halo + maria + water reflection),
  hazy layered mountains, bamboo grove, cattail reeds (wind-gusted sway), lily
  pads (bob + wake), lotus blooms, a swinging paper lantern (flickering glow +
  reflection), out-of-focus foreground foliage, drifting petals, vignette.
- Gorgeous water: cached depth gradient, drifting shimmer glints, wobbling
  moon/lantern reflections, and a ripple pool. **Clicking the water makes ripples.**
- Soft custom firefly cursor.

Architecture is modular and documented in `DECISIONS.md`.

## Next up

**Phase 3 — Bugs & interactions.** Clickable bugs flying/animating around the
pond, each with its own movement (Null Pointer mosquito, Memory Leak dragonfly,
Merge Conflict beetle, Syntax Beetle, 404 moth, Infinite Loop beetle). Click a
bug → the frog tracks it, tongue-snaps, and eats it; the pond's `lushness` ticks
up. Bugs are `SceneElement`s dropped into the `stage` layer next to the frog. The
frog already exposes the hooks needed (`poke`, gaze); add an "eat/target" path
and the after-eat reactions (satisfied blink, lick, little hop).

Then: Phase 4 water/particles/lighting/ambience · Phase 5 progression, hidden
interactions, polish.

## Handy pointers

- Palette: `src/config/theme.ts` — the one place to re-tune colour.
- Add a creature: implement `SceneElement`, drop it into the `stage` layer in
  `src/world/Scene.ts`. Read time/input/rng from the `World` passed in.
- Animation helpers: `src/anim/` (easing, oscillate, noise).
- Sprites: author as a char grid + palette via `Sprite.from` (see `Lantern.ts`).
- Disturb the water from anywhere: `Water.spawnRipple(x, y, strength)`.
