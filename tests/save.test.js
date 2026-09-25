import { describe, it, expect, beforeEach } from 'vitest';
import { SaveStore } from '../src/game/save.js';

// Minimal localStorage stand-in for node.
beforeEach(() => {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
});

const good = { chapter: 'ferry', health: 80, inv: { ammo: { tranq: 5, pistol: 0 }, keycards: [1], items: [] } };

describe('SaveStore', () => {
  it('round-trips a valid save', () => {
    const s = new SaveStore();
    s.store(good);
    expect(new SaveStore().load()).toEqual(good);
  });

  it('rejects unknown chapters, bad inventories and junk JSON', () => {
    const s = new SaveStore();
    localStorage.setItem('cyborg.save.v1', JSON.stringify({ ...good, chapter: 'gone' }));
    expect(s.load()).toBeNull();
    localStorage.setItem('cyborg.save.v1', JSON.stringify({ ...good, inv: { ...good.inv, keycards: 3 } }));
    expect(s.load()).toBeNull();
    localStorage.setItem('cyborg.save.v1', '{not json');
    expect(s.load()).toBeNull();
  });
});
