import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART, COMICS } from '../src/story/comics.js';
import { SHOTS, SCENE_DEFAULT } from '../src/story/art.js';
import { RADIO } from '../src/story/radio.js';
import { LINES, BARKS, OBJECTIVES, GAME_OVER, TIPS } from '../src/story/lines.js';
import { LEVELS } from '../src/levels/index.js';
import { hasGlyph } from '../src/engine/bitmapFont.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const levelSrc = readdirSync(path.join(ROOT, 'src/levels'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(path.join(ROOT, 'src/levels', f), 'utf8'))
  .join('\n');

const keysUsed = (fn) => [...levelSrc.matchAll(new RegExp(`\\.${fn}\\('([a-z0-9_]+)'`, 'g'))].map((m) => m[1]);

function allText() {
  const out = [];
  const add = (t) => { if (typeof t === 'string') out.push(t); };
  for (const list of [...Object.values(LINES), ...Object.values(RADIO)]) for (const l of list) add(l.text);
  for (const b of Object.values(BARKS)) for (const list of Object.values(b)) for (const t of [].concat(list)) add(t);
  for (const o of Object.values(OBJECTIVES)) for (const t of [].concat(o)) add(t);
  for (const t of Object.values(GAME_OVER)) for (const s of [].concat(t)) add(s);
  for (const t of TIPS) add(t);
  for (const pages of Object.values(COMICS)) {
    for (const p of pages) {
      for (const pan of p.panels) {
        add(pan.narration); add(pan.sfx);
        for (const s of pan.speech ?? []) add(s.text);
      }
    }
  }
  return out;
}

describe('story data', () => {
  it('every line a level says exists', () => {
    for (const k of keysUsed('say')) expect(LINES[k], k).toBeTruthy();
  });

  it('every radio call a level makes exists', () => {
    for (const k of keysUsed('radio')) expect(RADIO[k], k).toBeTruthy();
  });

  it('every comic panel art is defined and staged', () => {
    for (const [id, pages] of Object.entries(COMICS)) {
      for (const p of pages) {
        for (const pan of p.panels) {
          if (pan.art.startsWith('portrait:') || pan.art === 'black') continue;
          const art = ART[pan.art];
          expect(art, `${id}: ${pan.art}`).toBeTruthy();
          expect(SHOTS[pan.art] ?? SCENE_DEFAULT[art.scene], `${id}: ${pan.art} staging`).toBeTruthy();
        }
      }
    }
  });

  it('every level with a seenKey has its game-over line', () => {
    for (const def of Object.values(LEVELS)) {
      if (def.seenKey) expect(GAME_OVER[def.seenKey] ?? LINES[def.seenKey], def.seenKey).toBeTruthy();
    }
  });

  it('all story text renders with the bitmap font', () => {
    const missing = new Set();
    // {n} placeholders are filled in at runtime.
    for (const t of allText()) for (const ch of t.replaceAll('{n}', '1')) if (ch !== ' ' && !hasGlyph(ch)) missing.add(ch);
    expect([...missing]).toEqual([]);
  });
});

describe('comic layout', () => {
  it('fits every page within at most 5 rows', async () => {
    const { gridPlace } = await import('../src/game/comic.js');
    for (const [id, pages] of Object.entries(COMICS)) {
      pages.forEach((p, i) => {
        let rows = 3;
        while (gridPlace(p.panels, rows).some((c) => !c.fits) && rows < 8) rows++;
        expect(rows, `${id} page ${i + 1}`).toBeLessThanOrEqual(5);
      });
    }
  });
});
