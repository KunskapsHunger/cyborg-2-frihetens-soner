import { drawText } from '../engine/bitmapFont.js';
import { audio } from '../engine/audio.js';
import { CODEC } from '../story/radio.js';
import { codecVoiceId } from '../engine/voiceIds.js';
import { COL, SPEAKERS } from './hud.js';
import { FREQ } from './ui.js';

// Player-initiated radio (V): pick a contact and hear what they have to say
// about this place. Each contact has 1–3 calls per level that play in turn
// (the last one repeats). Linnea's calls end with a save.

const CONTACT_ORDER = ['kall', 'linnea', 'astrom'];

/** Calls for a level and contact, normalised to a list of calls. */
export function codecCalls(level, contact) {
  const v = CODEC?.[level]?.[contact];
  if (!v?.length) return [];
  return v[0]?.who ? [v] : v;
}

/** Contacts reachable on this level (the level may restrict or reorder). */
export function codecContacts(game) {
  const lv = game.level;
  const list = lv?.codec ?? CONTACT_ORDER;
  return list.filter((c) => codecCalls(lv.codecKey ?? lv.id, c).length);
}

/** Open the contact list (V). */
export function openCodecMenu(game) {
  const contacts = codecContacts(game);
  if (!contacts.length) { game.hud.message('Ingen svarar på radion.', COL.dim, 2); return; }
  game.input.exitLock();
  audio.play('codec_open', { volume: 0.6 });
  game.ui.open({ type: 'codec_menu', contacts });
}

/** Play the next call from a contact. */
export function codecCall(game, contact) {
  const key = game.level.codecKey ?? game.level.id;
  const calls = codecCalls(key, contact);
  game.codecCount ??= {};
  const n = game.codecCount[`${key}:${contact}`] ?? 0;
  const index = Math.min(n, calls.length - 1);
  game.codecCount[`${key}:${contact}`] = n + 1;
  const lines = calls[index].map((l, i) => ({ ...l, voiceId: codecVoiceId(key, contact, index, i) }));
  audio.play('codec_ring2', { volume: 0.8 });
  game.ui.open({
    type: 'radio', lines, index: 0, caller: contact, freq: FREQ[contact],
    onDone: () => {
      game.input.requestLock();
      // Linnea saves (Åström on Henrik's chapters, see level.saveContact).
      if (contact === (game.level.saveContact ?? 'linnea')) {
        game.checkpoint();
        game.stats.saves += 1;
        game.hud.message('SPARAT', COL.good, 2);
      }
    },
  });
}

export const codecScreens = {
  update_codec_menu(dt, s) {
    const items = s.contacts.map((c) => ({ label: `${FREQ[c]}  ${(SPEAKERS[c] ?? c).toUpperCase()}`, action: () => { this.close(); codecCall(this.game, c); } }));
    this.menu(items, this.h * 0.52, () => { this.close(); this.game.input.requestLock(); });
  },

  draw_codec_menu(s) {
    const g = this.g;
    g.fillStyle = 'rgba(0,6,4,0.92)';
    g.fillRect(0, 0, this.w, this.h);
    for (let y = 0; y < this.h; y += 2) { g.fillStyle = 'rgba(0,40,30,0.25)'; g.fillRect(0, y, this.w, 1); }
    drawText(g, 'RADIO', this.w / 2, 24, COL.teal, { align: 'center', scale: 2 });
    const pw = 56;
    s.contacts.forEach((c, i) => {
      const x = Math.round(this.w / 2 + (i - (s.contacts.length - 1) / 2) * (pw + 18) - pw / 2);
      this.portrait(c, x, 56, pw, i === this.sel);
    });
    this.drawItems(s.contacts.map((c) => ({ label: `${FREQ[c]}  ${(SPEAKERS[c] ?? c).toUpperCase()}` })), this.h * 0.52);
    drawText(g, 'Esc: lägg på', this.w / 2, this.h - 16, COL.dim, { align: 'center' });
  },
};

