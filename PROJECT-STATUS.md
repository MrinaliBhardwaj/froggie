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

**Phase 5 — Progression, hidden interactions, warmth & audio — ✅ complete. The
game is done.** The pond now rewards attention. A golden `Warmth` wash grows with
`lushness` (the colour-richness half of progression, alongside the fireflies).
Hidden interactions: double-click the frog → a big croak; click the lantern → it
flares; tap the water 3× quickly → a fish jumps and splashes; leave it idle → it
dozes with floating "z"s; linger ~5 min → a shooting star; and every so often a
butterfly flutters in, perches on the frog's snout, and crosses its eyes.
**Audio** is fully synthesised (no assets): a looping ambient bed — water, night
wind, crickets, distant frogs, lantern hum — plus event sounds (splash, croak,
gulp, lantern chime). It boots on the first click; press **m** to mute. Code:
`src/audio/Ambience.ts`, `src/world/critters/`, `src/world/fx/Warmth.ts`, frog
hooks, and the shooting star in `Stars`. Production build: **~58 KB (20 KB
gzipped)**.

**Phase 4 — Water, particles, lighting & ambience — ✅ complete.** Catches now
feel alive: a warm sparkle puff where the tongue snaps a bug, a heart that floats
up on the gulp, and a ripple under the pad. Fireflies drift over the pond as soft
additive glows, and *how many are lit scales with `lushness`* — so the air fills
with light as you play (3 → 16). All budgets are capped (≤90 particles, 16
fireflies) and everything is cheap alpha/transform work, so it stays smooth on
weak hardware. Code: `src/world/fx/` (`Particles.ts`, `Fireflies.ts`); the frog
fires an `Effects` interface the Scene routes to the pool + water (frog stays
decoupled).

**Phase 3 — Bugs & catching — ✅ complete.** A calm population (up to 5) of
programmer-bugs drifts over the pond, each flying its own way: null-pointer
mosquito (erratic darts), memory-leak dragonfly (long glides), merge-conflict
beetle (sudden reversals), syntax beetle (steady with error-stutters), 404 moth
(flutters toward the lantern, blinking in/out), infinite-loop beetle (endless
circles). Click one → the frog aims, shoots its tongue, drags the bug in on the
tip, and gulps — bumping `progress.lushness` (which blooms the lotuses) and
`bugsResolved`. Idle, the frog watches the nearest bug. Code: `src/world/bugs/`
(`Bug.ts` = entity+movement+art, `Bugs.ts` = swarm/spawner); the frog gained a
tongue (`FrogPose`) and a catch state machine (`Frog.ts`, aim→shoot→retract→gulp).

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

**All five phases are complete — the game is finished.** Remaining work is
optional refinement, at your direction:
- Art/feel tuning (frog proportions, bug readability, palette warmth curve).
- More hidden interactions or bug kinds if you want them.
- A tiny mute/volume affordance on screen (currently mute is the "m" key).
- Deploy (it's a static Vite build — `npm run build` → `dist/`).

## Handy pointers

- Palette: `src/config/theme.ts` — the one place to re-tune colour.
- Add a creature: implement `SceneElement`, drop it into the `stage` layer in
  `src/world/Scene.ts`. Read time/input/rng from the `World` passed in.
- Animation helpers: `src/anim/` (easing, oscillate, noise).
- Sprites: author as a char grid + palette via `Sprite.from` (see `Lantern.ts`).
- Disturb the water from anywhere: `Water.spawnRipple(x, y, strength)`.
