import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUTSCENES } from '../src/story/cutscenes.js';
import { LEVELS } from '../src/levels/index.js';
import { ACTOR_MODELS } from '../src/game/cutscene.js';

// Every cutscene a level plays must find its stage in that level: a spot for
// each actor, every mark the beats walk to and every insert close-up.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (id) => readFileSync(path.join(ROOT, 'src/levels', `${id}.js`), 'utf8');
const played = (id) => [...src(id).matchAll(/playCutscene\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);

function needs(cs) {
  const marks = new Set();
  const inserts = new Set();
  for (const b of cs.beats) {
    for (const a of b.act ?? []) {
      const [, verb, arg] = a.split(':');
      if ((verb === 'walk' || verb === 'run') && arg) marks.add(arg);
    }
    if (b.shot?.startsWith('insert:')) inserts.add(b.shot.slice(7));
  }
  return { marks, inserts };
}

describe('cutscenes', () => {
  it('every actor has a model', () => {
    for (const cs of Object.values(CUTSCENES)) for (const a of cs.actors) expect(ACTOR_MODELS[a], a).toBeTruthy();
  });

  for (const id of Object.keys(LEVELS)) {
    for (const csId of played(id)) {
      it(`${id} stages ${csId}`, () => {
        const cs = CUTSCENES[csId];
        expect(cs, `unknown cutscene ${csId}`).toBeTruthy();
        const stage = LEVELS[id].stages?.[cs.scene];
        expect(stage, `level ${id} has no stage '${cs.scene}'`).toBeTruthy();
        for (const a of cs.actors) expect(stage.actors?.[a], `actor ${a}`).toBeTruthy();
        const { marks, inserts } = needs(cs);
        for (const m of marks) expect(stage.marks?.[m], `mark ${m}`).toBeTruthy();
        for (const p of inserts) expect(stage.props?.[p], `insert ${p}`).toBeTruthy();
      });
    }
  }
});
