# CYBÖRG II — level authoring guide

A level is one JS module in `src/levels/<id>.js` (default export). Chapters and their order live in
`src/levels/index.js` (already set up: home, ferry, sim2, frihamnen, haga, tower, roof, river, church).
Read `docs/DESIGN.md` (story), `docs/ASSETS.md` (texture/model/audio names) and the script data in
`src/story/` (cutscenes.js, radio.js, lines.js, comics.js) first. Use only assets that exist in
`public/assets/` (check with `ls`); missing ones fall back to a checker/box so don't rely on them.

## Coordinates

- The world is a grid of 1 m cells, x → east, z → south. `size: [w, d]` in cells.
- Three.js conventions: a model's front faces +Z; `rot` (yaw, radians) rotates about Y, so facing
  direction is `(sin rot, cos rot)`. `rot: 0` faces +Z (south), `Math.PI` faces north (−Z).
- The camera is an MGS-style chase camera behind/above the player; walls between camera and
  player dissolve (cutaway). Keep playable spaces readable from above: corridors ≥ 3 m, rooms ≥ 6 m.

## Level definition

```js
export default {
  id: 'ferry', title: 'FÄRJAN', subtitle: 'Kattegatt, natten före lucia',
  player: 'henrik2',            // or 'atta'
  mode: 'mission',              // 'mission' (weapons/stealth HUD) or 'family' (no weapons; family watch)
  size: [70, 90],
  spawn: { x: 35, z: 84, yaw: 0 }, camYaw: 0,
  loadout: { tranq: 12, pistol: 0, repair: 1, items: ['box'] },   // items: 'box', 'spray'
  guardModel: 'sons_guard', guardWeapon: 'rifle2', barks: 'sons',  // BARKS set in lines.js
  seenKey: 'fe_seen',           // family levels: GAME_OVER key when seen
  // Look (PS2 renderer):
  ambient: [r,g,b], sky: [r,g,b], ground: [r,g,b], fogColor: [r,g,b], fog: [near, far],
  ambientLight: 0.3,            // stealth light level of unlit areas (0..1), not visual
  snow: 0.8,                    // procedural snow on upward surfaces (0..1)
  snowfall: true, blizzard: 0.6, wind: [0.6, 0.2], snowGround: true, snowFill: 75,
  grade: { lift: [0,0,0.02], gamma: [1,1,1], gain: [1,1,1.05], saturation: 0.85 },
  bloom: 0.35, exposure: 1.25, frost: 0.2, grain: 0.02,
  music: 'music_sneak2', ambience: 'amb_blizzard', ambienceVolume: 0.6,
  sounds: [{ name: 'ship_horn', x, y, z, volume, ref, max }],   // positional loops
  codec: ['kall', 'linnea', 'astrom'], codecKey: 'ferry',       // CODEC contacts (V key)
  saveContact: 'astrom',        // whose call saves the game (default 'linnea'; Henrik's levels: 'astrom')
  glitch: 0,                    // roof: world wireframe glitch level 0..1
  build(g) { … },               // CityGrid geometry (below)
  entities: [ … ],
  stages: { … },                // cutscene stages (below)
  script: { … },
};
```

## Geometry: `build(g)` with CityGrid

- `g.open(x0, z0, x1, z1, { ft, et, floor, floorScale, indoor })` — walkable floor cells
  (inclusive rect). `ft` floor texture, `et` edge/riser texture, `floor` height (m) for raised
  areas (steps ≤ 0.45 m are walkable; use ramps of small steps for stairs), `indoor: true` = no snow
  or rain drawn over it.
- `g.water(x0, z0, x1, z1)` — water/ice cells (not walkable). Use `{ ft: 'ice_river', floor: -0.1 }`
  with `g.open` for walkable ice instead.
- `g.block(x0, z0, x1, z1, { h, wt, rt, wu, wv, lower, lowerH })` — solid building/wall of height
  `h` with wall texture `wt`, roof `rt`, UV repeats `wu`/`wv` per 4 m, optional ground-floor band
  `lower` of height `lowerH`. Everything not opened is solid by default — carve the level out.
- Floors with snow textures (`snow_*`) leave footprints that guards follow.

## Entities

- `prop` `{ model, x, z, y?, rot?, scale?, tint?, cut?, collide?: false, shrink?, snow?: false, shootable?: false }`
  Props get a collision box from their bounds (shrink to tighten). Lamp props with a light part
  (`streetlight`, `streetlight2`, `lamp_post`, `advent_star`) can be shot out.
- `decal` `{ tex, x, y, z, w, h, rot?, rx?, lit?, double?, cut? }` — posters, signs (rx: -π/2 lays it flat).
- `box` `{ tex, x0, x1, z0, z1, y0, y1, uvScale?, cut? }` — solid textured box (cover, counters, crates).
- `light` `{ x, y, z, color, range, intensity, flicker?, strobe? }` — up to 16 lights are active
  (nearest to the camera); keep ≤ 20 per level.
- `guard` `{ id?, x, z, rot, path?, wait?, shield?, group?, thought?, model?, barks? }` — `path`
  names a `path` entity; `group` for radio check-ins; `thought` overrides the scanned thought.
- `path` `{ id, points: [[x, z, pause?], …] }`
- `camera` `{ x, y, z, rot, sweep?, id? }`, `drone` `{ x, y, z, path }`
- `boss` `{ kind: 'vargen' | 'reader' | 'jatte' | 'walker', x, z, rot, spots: [[x,z],…], cx, cz, r, scale, name }`
  The level script starts it: `g.boss = b; g.bossActive = true;` and handles `bossDown`.
- `npc` `{ id, model, name, x, z, rot, pose?, watch?: { every, range, duration }, radar?, scout?, thought?, holo?, y? }`
  `watch` makes a family member glance back (seen ⇒ fail with `seenKey`); `scout`/`thought` make
  the NPC readable with "lyssna in" (R).
- `pickup` `{ kind: 'tranq'|'pistol'|'repair'|'battery'|'keycard'|'item', x, z, y?, level?, item?, label? }`
  (`item: 'box'` or `'spray'` adds the gadget).
- `door` `{ x, z, rot, level?, locked?, id? }` (3 m sliding door; keycard level 0–3).
- `trigger` `{ id, rect: [x0, z0, x1, z1], checkpoint?, hide?, repeat? }` — `hide: true` makes a
  body-hiding zone; `checkpoint` names a marker to save at.
- `use` `{ id, x, z, label, r?, when?: (g) => bool }` — E-interaction handled in `script.use`.
- `marker` `{ id, x, z, yaw }` — checkpoints; `reinforce` is where backup squads enter.
- `locker` `{ x, z, rot }` — hide inside (E), stash bodies, knock (F). `rot` faces the door.
- `bomb` `{ id, x, y, z, rot }` — C4 charge to freeze with the spray (hold E).

## Cutscene stages

Every cutscene in `src/story/cutscenes.js` names a `scene`. The level whose chapter plays that
cutscene must provide the stage under `stages[scene]`:

```js
stages: {
  ferry_deck: {
    actors: { henrik: { x: 35, z: 70, rot: Math.PI }, sara: { x: 35, z: 60, rot: 0, pose: 'idle' } },
    marks: { mark_a: [35, 64], mark_b: [30, 58] },
    props: { bomb: [35, 1.2, 60] },              // insert:<prop> close-ups
    establish: { pos: [20, 14, 90], look: [35, 2, 60], fov: 50 },
  },
},
```

Give every actor named in the cutscene's `actors` a spot, and every `mark_*` / `insert:*` the
cutscene uses. The director frames shots from actor positions and facing (close-ups are taken in
front of the face), so face actors towards each other when they talk. Stages may sit anywhere in
the level (e.g. an area the player reaches later).

## Script API (`script` object, `this` = the script)

Hooks: `onStart(g, restore)`, `update(g, dt)`, `trigger(g, id, t)`, `use(g, u)`, `pickup(g, def)`,
`bossDown(g, boss)`, `bossPhase(g, boss, phase)`, `bombFrozen(g, id, remaining)`,
`onScan(g, target)`, `onGlance(g, npc)`, `readerDodge(g, count)`, `onLeave(g)`.

Game API (`g`):
- `g.playCutscene(id)` → Promise; `g.radio(id, onDone)`; `g.say(linesKey, onDone)`
- `g.setObjective(i)` (index into `OBJECTIVES[levelId]`), `g.hud.showTitle(t, sub)`, `g.hud.message(text, color, secs)`
- `g.checkpoint(markerId)`, `g.completeChapter()`, `g.fail(kind)`, `g.later(secs, fn)`
- `g.flags` (persisted in saves), `g.npc(id)`, `g.guard(id)`, `g.marker(id)`, `g.door(id)`
- `g.bosses`, `g.boss`, `g.bossActive`, `g.alarm` (`reset()`, `spotted(pos)`, `raiseCaution(pos)`)
- `g.choose(prompt, [{ label, action }])`, `g.cinematic = { pos, look } | null`
- `g.sys.glitch.level = 0..1`, `g.glitchPulse(amount, secs)`, `g.sys.bombs.remaining`
- `g.audio.play(name, opts)`, `g.audio.playMusic(name, fade)`
- `g.inv` (`items` Set, `ammo`), `g.player` (`pos`, `health`), `g.stats.kills`
- NPC: `npc.walk([[x,z],…], speed)` → Promise, `npc.pose`, `npc.lookAt = vec3`, `npc.talking = secs`, `npc.setHidden(bool)`

Conventions: open each chapter with its intro cutscene in `onStart` (skip on `restore`), then the
first radio call and objective. Guard lines, radio keys, LINES keys and cutscene ids must exist in
`src/story/` — never invent new text in level files except short `hud.message` hints.

## Testing

`npm run dev` serves the game at `http://localhost:5175/`. `?chapter=<id>` starts a chapter
(no comic), `&nocs=1` skips cutscenes. `window.__game` is the game, `__tp(x, z)` teleports,
`__step(frames)` advances. `npm test` runs the unit tests (level reachability: every
use/pickup/trigger must be walkable from spawn; every cutscene a level plays must be staged).
