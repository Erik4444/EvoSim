# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based evolutionary simulation: agents with neural-network brains navigate a toroidal canvas, eat food, reproduce, and evolve. Pure vanilla JavaScript (ES modules), no build step, no dependencies, no tests. UI strings are in German.

## Running

- **Local dev**: serve the repo root with any static HTTP server (ES module imports require `http://`, not `file://`). Examples: `python3 -m http.server 8032` or `npx serve .`, then open the printed URL.
- **Docker**: `docker compose up --build` → http://localhost:8032. Image is nginx:alpine serving `index.html` + `src/` with a `/health` endpoint; nginx config is in `nginx.conf`.
- **No build, no lint, no tests** — edits to `src/*.js` take effect on page reload.

## Architecture

Entry point is `index.html`, which loads `src/ui.js` as a module. From there the dependency graph fans out:

```
ui.js → simulation.js, render.js, graph.js, state.js, genome.js, config.js
simulation.js → agent.js, state.js, canvas.js
agent.js → genome.js, neural.js, state.js, config.js, utils.js
genome.js → state.js, config.js, utils.js
```

Key architectural points that span multiple files:

- **`state.js` is the single mutable source of truth.** Every module imports the same `state` object and reads/writes it directly — agents, foods, running flag, speed, and `state.params` (the runtime-tunable subset of `config.js`). There is no event bus, no store, no dependency injection.
- **`config.js` vs `state.params`.** `config.js` holds all constants. A subset (food spawn, hazard, sensor range, repro threshold, food value, cluster params) is copied into `state.params` at startup and is what the UI parameter panel mutates at runtime. Constants *not* in `state.params` are compile-time only — changing them in the panel is not possible; you'd need to promote them into `state.params` and the panel in `ui.js`.
- **Tick loop lives in `ui.js` (`tick()`)**, driven by `requestAnimationFrame`. Each frame runs `state.ticksPerFrame` simulation steps, each of which: adaptive food spawn → `agent.update()` for every agent (reverse iter, splice on death) → auto-restart `initSimulation(120, 300)` if population hits zero. Rendering + HUD + graph update happen once per frame, not once per tick.
- **`Agent.update()` is the per-tick hot path**: sense (`computeSensors`, toroidal wrap) → `brain.forward()` → rotate/move → eat (O(foods) linear scan) → `plasticUpdate()` → maybe reproduce → stochastic hazard. Sensor range, repro threshold, food value, and hazard all read from `state.params` so UI sliders affect behavior live.
- **Genome vs. learned weights (non-Lamarckian).** `neural.js` keeps a separate `learnedIH/HO` buffer for Hebbian in-life learning. `plasticUpdate()` only writes to that buffer; the genome is never modified by experience. Children inherit only `genome.mutate()` — learned weights die with the parent. Do not "simplify" by folding learned weights into the genome; it's an explicit design decision.
- **Species/groups are derived from the shape gene.** `genome.shape` (index into `SHAPES`) defines group identity; `getGroupName()` lazily assigns names from `GROUP_NAME_POOL` keyed by shape index, and the assignment lives in `state.groupNames`. Color is derived from `shape + colorGene` via `genomeToColor()`.
- **Hidden layer uses the gen-coded activation** (`tanh`/`relu`/`sigmoid`), but the output layer is **always `tanh`** because outputs must stay in `[-1, 1]` for turn/thrust. Don't change the output activation.
- **Input size is derived, not configured.** `INPUT_SIZE = SENSOR_DIRECTIONS * 4 + 2` (nearFood, farFood, nearAgent, farAgent per sector, plus energy + noise). If you change `SENSOR_DIRECTIONS`, all existing genomes become incompatible — this only matters across reloads since there's no persistence, but any code that assumes a specific `INPUT_SIZE` must be updated.
- **World is a torus.** `utils.wrapPosition` and the sensor code both wrap around canvas edges via half-width/half-height shortest-path math. Any new spatial logic must handle wrap.
- **Canvas sizing.** `canvas.js` sizes the canvas to `window.innerWidth/Height` once at load. There is no resize handler — resizing the browser mid-run does not reflow the simulation.

## UI layer (`ui.js`)

Single file (~400 lines) handles: HUD, parameter panel (built from a config array of slider groups), speed buttons, help overlay, pause toggle, hover/click tooltips, and the main loop. All DOM elements are grabbed by id from `index.html`. Parameter panel sliders write directly to `state.params[key]` on `input`; no validation beyond the slider's own min/max/step.

## Deployment

Dockerfile copies `index.html` + `src/` into nginx:alpine. `nginx.conf` sets SPA fallback (`try_files`), forces `application/javascript` Content-Type on `.js` (required for `type="module"`), and exposes `/health`. Deployment target is Coolify — there is deliberately no `HEALTHCHECK` in the Dockerfile (Coolify runs its own); don't re-add one.
