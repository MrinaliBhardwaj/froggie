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

**Phase 2 — Pixel-art assets & frog animations.** The mascot frog on the hero
lily pad (centre-low). Idle behaviours matter most: blink, look around, watch,
scratch, croak, stretch, yawn, sleep, wave, sit. After-eating reactions come once
bugs exist. Build reusable animation state helpers; keep frog AI in its own system.

Then: Phase 3 bugs + interactions · Phase 4 water/particles/lighting/ambience ·
Phase 5 progression, hidden interactions, polish.

## Handy pointers

- Palette: `src/config/theme.ts` — the one place to re-tune colour.
- Add a creature: implement `SceneElement`, drop it into the `stage` layer in
  `src/world/Scene.ts`. Read time/input/rng from the `World` passed in.
- Animation helpers: `src/anim/` (easing, oscillate, noise).
- Sprites: author as a char grid + palette via `Sprite.from` (see `Lantern.ts`).
- Disturb the water from anywhere: `Water.spawnRipple(x, y, strength)`.
