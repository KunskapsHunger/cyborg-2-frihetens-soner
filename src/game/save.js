// Checkpoint save, chapter progress and settings in localStorage (guarded).

import { CHAPTERS } from '../levels/index.js';

const SAVE_KEY = 'cyborg2.save.v1';
const PROGRESS_KEY = 'cyborg2.progress.v1';
const SETTINGS_KEY = 'cyborg2.settings.v1';

export const DEFAULT_SETTINGS = {
  sensitivity: 1, volume: 0.9, music: 0.6, voice: 1, brightness: 0.5,
  difficulty: 1, resolution: 448, bloom: true, grain: true, motion: true, invertY: false, cones: true,
};

function read(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

const validSave = (s) => !!s && typeof s.chapter === 'string' && CHAPTERS.some((c) => c.id === s.chapter)
  && typeof s.health === 'number' && !!s.inv && typeof s.inv.ammo === 'object' && s.inv.ammo !== null
  && Array.isArray(s.inv.keycards ?? []) && Array.isArray(s.inv.items ?? []);

export class SaveStore {
  constructor() { this.memory = null; }
  exists() { return !!this.load(); }
  load() { const s = read(SAVE_KEY) ?? this.memory; return validSave(s) ? s : null; }
  store(data) { this.memory = data; write(SAVE_KEY, data); }
  clear() { this.memory = null; try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
  loadProgress() { return { unlocked: 0, ...(read(PROGRESS_KEY) ?? {}) }; }
  storeProgress(p) { write(PROGRESS_KEY, p); }
  loadSettings() { return { ...DEFAULT_SETTINGS, ...(read(SETTINGS_KEY) ?? {}) }; }
  storeSettings(s) { write(SETTINGS_KEY, s); }
}
