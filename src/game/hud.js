import { drawText, wrapText, textWidth } from '../engine/bitmapFont.js';
import { PHASE } from './alarm.js';
import { WEAPONS } from './actions.js';
import { voice } from '../engine/voice.js';

// In-game HUD on the overlay canvas, MGS2-inspired: LIV/KÄRNA bars,
// radar with enemy view cones (jammed during alerts), alert phase readout,
// weapon/item boxes, subtitles, prompts and messages.

export const HUD_SCALE = 2;

export const COL = {
  text: '#d6dccf', dim: '#7f8a84', warn: '#e0b050', bad: '#e04030', good: '#70d0a0',
  teal: '#60e0d0', panel: 'rgba(6,10,12,0.72)', radarBg: 'rgba(4,14,12,0.78)', radarLine: '#2a6a5a',
};

export class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.messages = [];
    this.subtitle = null;
    this.subQueue = [];
    this.prompt = '';
    this.objective = '';
    this.objectiveT = 0;
    this.hitMarker = 0;
    this.title = null;
    this.radarCache = null;
    this.thought = null;
  }

  /** A private thought read with "lyssna in". */
  showThought(text, time = 5) { this.thought = { text, time, max: time }; }

  // Layout works in 240-line logical pixels; the canvas is HUD_SCALE× that.
  get w() { return this.canvas.width / HUD_SCALE; }
  get h() { return this.canvas.height / HUD_SCALE; }

  clear() {
    this.g.setTransform(1, 0, 0, 1, 0, 0);
    this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.g.setTransform(HUD_SCALE, 0, 0, HUD_SCALE, 0, 0);
    this.g.imageSmoothingEnabled = true;
  }

  message(text, color = COL.text, time = 3.5) {
    this.messages.push({ text, color, time });
    if (this.messages.length > 3) this.messages.shift();
  }

  setObjective(text) {
    if (!text || text === this.objective) return;
    this.objective = text;
    this.objectiveT = 5;
  }

  showTitle(title, subtitle, time = 5) { this.title = { title, subtitle, time, max: time }; }

  /** Queue spoken/inner lines as subtitles. Resolves when shown. */
  say(lines, onDone) {
    // Voiced lines stay up for the clip plus a beat; others by text length.
    const timeFor = (l) => (voice.has(l.voiceId) ? Math.max(1.2, voice.duration(l.voiceId) + 0.45) : Math.max(2.2, l.text.length * 0.065));
    this.subQueue.push(...lines.map((l) => ({ ...l, time: timeFor(l) })));
    if (onDone) this.subQueue.push({ callback: onDone });
    if (!this.subtitle) this.nextSub();
  }

  nextSub() {
    this.subtitle = this.subQueue.shift() ?? null;
    if (this.subtitle?.callback) { const cb = this.subtitle.callback; this.subtitle = null; cb(); this.nextSub(); return; }
    // Voiced subtitles stay up until the clip has really ended (loading can delay it).
    const s = this.subtitle;
    if (s?.voiceId && voice.has(s.voiceId)) {
      s.time += 3;
      voice.play(s.voiceId, { onEnd: () => { if (this.subtitle === s) s.time = Math.min(s.time, 0.45); } });
    }
  }

  update(dt) {
    for (const m of this.messages) m.time -= dt;
    this.messages = this.messages.filter((m) => m.time > 0);
    this.objectiveT = Math.max(0, this.objectiveT - dt);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    if (this.title) { this.title.time -= dt; if (this.title.time <= 0) this.title = null; }
    if (this.thought) { this.thought.time -= dt; if (this.thought.time <= 0) this.thought = null; }
    if (this.caption) { this.caption.time -= dt; if (this.caption.time <= 0) this.caption = null; }
    if (this.subtitle) {
      this.subtitle.time -= dt;
      if (this.subtitle.time <= 0) this.nextSub();
    }
  }

  draw(game) {
    const g = this.g;
    if (game.cutscene?.playing) { this.drawCaption(); this.drawSubtitle(true); return; }
    if (game.inPlay && game.mode === 'mission') {
      this.drawBars(game);
      this.drawRadar(game);
      this.drawEquip(game);
      this.drawAlert(game);
    } else if (game.inPlay && !game.cinematic) {
      this.drawBars(game, true);
      this.drawRadar(game);
    }
    if (game.scanning) this.drawScan(game);
    if (game.cam.fp > 0.5) this.drawCrosshair();
    this.drawThought();
    if (game.boss && !game.boss.dead && game.bossActive) this.drawBoss(game.boss);
    this.drawMessages();
    if (this.prompt) {
      const w = textWidth(this.prompt) + 10;
      g.fillStyle = COL.panel;
      g.fillRect(Math.round(this.w / 2 - w / 2), Math.round(this.h * 0.64) - 2, w, 12);
      drawText(g, this.prompt, this.w / 2, this.h * 0.64, COL.text, { align: 'center' });
    }
    this.drawSubtitle();
    if (this.objective && (this.objectiveT > 0 || game.input.isDown('Tab'))) {
      // Keep clear of the minimap in the top-right corner.
      const lines = wrapText(this.objective, Math.round(this.w * 0.56));
      drawText(g, 'UPPDRAG', this.w / 2, 34, COL.warn, { align: 'center' });
      lines.forEach((l, i) => drawText(g, l, this.w / 2, 44 + i * 10, COL.text, { align: 'center' }));
    }
    if (this.title) {
      const t = this.title;
      g.globalAlpha = Math.max(0, Math.min(1, t.time, (t.max - t.time) * 1.5));
      drawText(g, t.title, this.w / 2, this.h * 0.32, '#e8e4d8', { align: 'center', scale: 2 });
      drawText(g, t.subtitle ?? '', this.w / 2, this.h * 0.32 + 22, COL.dim, { align: 'center' });
      g.globalAlpha = 1;
    }
  }

  bar(x, y, w, h, frac, color) {
    const g = this.g;
    g.fillStyle = '#000';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#1a2422';
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
  }

  drawBars(game, minimal = false) {
    const p = game.player;
    const g = this.g;
    drawText(g, 'LIV', 8, 8, COL.dim);
    this.bar(28, 9, 70, 5, p.health / p.maxHealth, p.health < 30 ? COL.bad : '#5ab090');
    if (minimal) return;
    drawText(g, 'KÄRNA', 8, 18, COL.dim);
    this.bar(40, 19, 58, 3, p.energy / 100, game.thermal ? '#e08040' : '#50b8e0');
    if (game.thermal) drawText(g, 'TERMO', 8, 27, '#e08040');
  }

  drawAlert(game) {
    const a = game.alarm;
    if (a.phase === PHASE.NORMAL) return;
    const g = this.g;
    const x = this.w - 76, y = 80;
    const label = a.phase === PHASE.ALERT ? 'LARM' : a.phase === PHASE.EVASION ? 'UNDANFLYKT' : 'FÖRSIKTIGHET';
    const col = a.phase === PHASE.ALERT ? COL.bad : COL.warn;
    if (a.phase !== PHASE.ALERT || Math.sin(game.time * 10) > -0.3) drawText(g, label, x + 34, y, col, { align: 'center' });
    if (a.phase !== PHASE.ALERT) {
      const t = Math.max(0, a.timer);
      drawText(g, `${String(Math.floor(t)).padStart(2, '0')}.${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`, x + 34, y + 10, col, { align: 'center' });
    }
  }

  drawRadar(game) {
    const g = this.g;
    const size = 64;
    const x0 = this.w - size - 6, y0 = 6;
    g.fillStyle = COL.radarBg;
    g.fillRect(x0, y0, size, size);
    g.strokeStyle = COL.radarLine;
    g.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    if (game.alarm.jammed) {
      for (let i = 0; i < 90; i++) {
        g.fillStyle = Math.random() < 0.5 ? '#1c3c34' : '#0a1a16';
        g.fillRect(x0 + Math.floor(Math.random() * size), y0 + Math.floor(Math.random() * size), 2, 1);
      }
      drawText(g, 'STÖRNING', x0 + size / 2, y0 + size / 2 - 4, COL.bad, { align: 'center' });
      return;
    }
    const grid = game.world.grid;
    const p = game.player.pos;
    const scale = 1.5; // pixels per metre
    const yaw = game.cam.yaw;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    // Map a world point to radar pixels, rotated so "up" = away from the camera.
    const map = (wx, wz) => {
      const dx = wx - p.x, dz = wz - p.z;
      const rx = dx * cs - dz * sn;
      const rz = dx * sn + dz * cs;
      return [x0 + size / 2 + rx * scale, y0 + size / 2 + rz * scale];
    };
    const r = Math.ceil(size / 2 / scale) + 2;
    g.fillStyle = '#2f6a5c';
    for (let z = Math.floor(p.z) - r; z <= Math.floor(p.z) + r; z++) {
      for (let x = Math.floor(p.x) - r; x <= Math.floor(p.x) + r; x++) {
        if (!grid.inBounds(x, z)) continue;
        const c = grid.get(x, z);
        const solid = !c || c.water;
        if (!solid) continue;
        const [sx, sy] = map(x + 0.5, z + 0.5);
        if (sx < x0 || sy < y0 || sx >= x0 + size - 1 || sy >= y0 + size - 1) continue;
        g.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
      }
    }
    // Enemies + cones
    const cone = (pos, yaw2, len, half, color) => {
      const [ax, ay] = map(pos.x, pos.z);
      g.fillStyle = color;
      for (let i = -3; i <= 3; i++) {
        const a = yaw2 + (half * i) / 3;
        for (let s = 2; s < len * scale; s += 2) {
          const [bx, by] = map(pos.x + Math.sin(a) * s / scale, pos.z + Math.cos(a) * s / scale);
          if (bx < x0 || by < y0 || bx >= x0 + size - 1 || by >= y0 + size - 1) continue;
          g.fillRect(Math.floor(bx), Math.floor(by), 1, 1);
        }
      }
      if (ax >= x0 && ay >= y0 && ax < x0 + size - 2 && ay < y0 + size - 2) {
        g.fillStyle = '#f04830';
        g.fillRect(Math.floor(ax) - 1, Math.floor(ay) - 1, 3, 3);
      }
    };
    // Patrol routes of guards read with "lyssna in".
    for (const guard of game.guards) {
      if (!guard.active || !(guard.scannedT > 0) || !guard.path) continue;
      g.fillStyle = 'rgba(120,240,255,0.7)';
      const pts = guard.path;
      for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
        for (let s = 0; s <= 1; s += 0.08) {
          const [sx, sy] = map(ax + (bx - ax) * s, az + (bz - az) * s);
          if (sx < x0 || sy < y0 || sx >= x0 + size - 1 || sy >= y0 + size - 1) continue;
          g.fillRect(sx, sy, 1, 1);
        }
      }
    }
    for (const guard of game.guards) if (guard.active) cone(guard.pos, guard.yaw, 9, 0.55, guard.state === 'suspicious' || guard.state === 'tracks' ? 'rgba(240,210,80,0.6)' : 'rgba(150,220,255,0.45)');
    for (const b of game.sys?.bombs?.list ?? []) {
      if (b.frozen || Math.sin(game.time * 6) < 0) continue;
      const [bx, by] = map(b.def.x, b.def.z);
      if (bx < x0 || by < y0 || bx >= x0 + size - 2 || by >= y0 + size - 2) continue;
      g.fillStyle = '#ff4020';
      g.fillRect(bx - 1.5, by - 1.5, 3, 3);
    }
    for (const cam of game.cameras) if (cam.active) cone(cam.pos, cam.yaw, 6, 0.42, 'rgba(150,220,255,0.35)');
    for (const d of game.drones) {
      if (!d.active) continue;
      const [ax, ay] = map(d.pos.x, d.pos.z);
      g.strokeStyle = 'rgba(150,220,255,0.45)';
      g.beginPath();
      g.arc(ax, ay, 4.2 * scale, 0, Math.PI * 2);
      g.stroke();
    }
    for (const n of game.npcs) {
      if (n.hidden || !n.def.radar) continue;
      const [ax, ay] = map(n.pos.x, n.pos.z);
      g.fillStyle = '#f0d040';
      g.fillRect(Math.floor(ax) - 1, Math.floor(ay) - 1, 3, 3);
    }
    // Player arrow
    g.fillStyle = '#ffffff';
    g.fillRect(x0 + size / 2 - 1, y0 + size / 2 - 1, 3, 3);
  }

  drawEquip(game) {
    const g = this.g;
    const inv = game.inv;
    const w = WEAPONS[inv.weapon];
    const x = this.w - 96, y = this.h - 28;
    g.fillStyle = COL.panel;
    g.fillRect(x, y, 90, 22);
    drawText(g, w.name, x + 45, y + 3, COL.text, { align: 'center' });
    drawText(g, String(inv.ammo[w.ammoKey]), x + 45, y + 12, inv.ammo[w.ammoKey] ? COL.teal : COL.bad, { align: 'center' });
    g.fillStyle = COL.panel;
    g.fillRect(6, this.h - 28, 80, 22);
    drawText(g, 'REPARATION', 46, this.h - 25, COL.dim, { align: 'center' });
    drawText(g, `x${inv.repair}`, 46, this.h - 16, COL.text, { align: 'center' });
    if (inv.keycards.size) drawText(g, `KORT ${[...inv.keycards].sort().join(' ')}`, 92, this.h - 16, COL.warn);
    // Carried gadgets and the tower's charges.
    const tags = [];
    if (inv.items.has('box')) tags.push(game.player.boxed ? 'KARTONG [B] PÅ' : 'KARTONG [B]');
    if (inv.items.has('spray')) tags.push('FRYSSPRAY');
    tags.forEach((t, i) => drawText(g, t, 92, this.h - 26 - i * 10, game.player.boxed && i === 0 ? COL.warn : COL.dim));
    const bombs = game.sys?.bombs;
    if (bombs?.list.length) {
      const left = bombs.remaining;
      drawText(g, left ? `LADDNINGAR KVAR: ${left}` : 'ALLA LADDNINGAR FRUSNA', this.w / 2, this.h - 16, left ? COL.bad : COL.good, { align: 'center' });
    }
  }

  drawScan(game) {
    const g = this.g;
    const t = game.time;
    // Cold sweep line and corner brackets: the core is listening.
    const y = (t * 70) % this.h;
    g.fillStyle = 'rgba(90,230,255,0.10)';
    g.fillRect(0, y, this.w, 2);
    g.strokeStyle = 'rgba(120,240,255,0.55)';
    g.lineWidth = 0.5;
    const m = 14, l = 18;
    for (const [x, yy, dx, dy] of [[m, m, 1, 1], [this.w - m, m, -1, 1], [m, this.h - m, 1, -1], [this.w - m, this.h - m, -1, -1]]) {
      g.beginPath();
      g.moveTo(x, yy + dy * l); g.lineTo(x, yy); g.lineTo(x + dx * l, yy);
      g.stroke();
    }
    drawText(g, 'LYSSNAR IN', this.w / 2, 26, '#8ff0ff', { align: 'center' });
  }

  drawThought() {
    const th = this.thought;
    if (!th) return;
    const g = this.g;
    const lines = wrapText(`“${th.text}”`, Math.round(this.w * 0.6));
    const y0 = Math.round(this.h * 0.2);
    g.globalAlpha = Math.max(0, Math.min(1, th.time, (th.max - th.time) * 3));
    g.fillStyle = 'rgba(2,20,26,0.7)';
    g.fillRect(this.w / 2 - this.w * 0.32, y0 - 12, this.w * 0.64, lines.length * 10 + 16);
    drawText(g, 'TANKE', this.w / 2, y0 - 9, '#6fd8e8', { align: 'center' });
    lines.forEach((l, i) => drawText(g, l, this.w / 2, y0 + 2 + i * 10, '#d8f8ff', { align: 'center' }));
    g.globalAlpha = 1;
  }

  drawCrosshair() {
    const g = this.g;
    const cx = Math.floor(this.w / 2), cy = Math.floor(this.h / 2);
    g.fillStyle = this.hitMarker > 0 ? '#ff5040' : 'rgba(200,255,230,0.8)';
    g.fillRect(cx - 5, cy, 3, 1);
    g.fillRect(cx + 3, cy, 3, 1);
    g.fillRect(cx, cy - 5, 1, 3);
    g.fillRect(cx, cy + 3, 1, 3);
  }

  drawBoss(boss) {
    const w = Math.min(160, this.w - 180);
    const x = Math.round(this.w / 2 - w / 2);
    drawText(this.g, boss.name, this.w / 2, this.h - 36, COL.bad, { align: 'center' });
    this.bar(x, this.h - 26, w, 4, boss.hp / boss.maxHp, '#c04030');
  }

  drawMessages() {
    let y = this.objectiveT > 0 ? 70 : 40;
    for (const m of this.messages) {
      this.g.globalAlpha = Math.min(1, m.time);
      drawText(this.g, m.text, 8, y, m.color);
      this.g.globalAlpha = 1;
      y += 10;
    }
  }

  /** Place/time caption in the upper letterbox bar, typed out. */
  drawCaption() {
    const c = this.caption;
    if (!c) return;
    const shown = c.text.slice(0, Math.floor((c.max - c.time) * 28));
    this.g.globalAlpha = Math.min(1, c.time);
    drawText(this.g, shown, 14, 10, '#c8d8d0');
    this.g.globalAlpha = 1;
  }

  drawSubtitle(cinema = false) {
    const s = this.subtitle;
    if (!s) return;
    const g = this.g;
    if (cinema) {
      // Inside the lower letterbox bar, film style.
      // Inner monologue: no name, cool blue, like the narration boxes.
      const name = s.inner ? '' : (SPEAKERS[s.who] ?? s.who ?? '').toUpperCase();
      const lines = wrapText(s.text, this.w - 80);
      const y0 = this.h - 22 - (lines.length - 1) * 10;
      if (name) drawText(g, name, this.w / 2, y0 - 11, '#9ab0a8', { align: 'center' });
      lines.forEach((l, i) => drawText(g, l, this.w / 2, y0 + i * 10, s.inner ? '#b8d0ff' : '#f0ead8', { align: 'center' }));
      return;
    }
    const inner = s.who === 'henrik';
    const name = inner ? '' : `${(SPEAKERS[s.who] ?? s.who ?? '').toUpperCase()}: `;
    const lines = wrapText(name + s.text, this.w - 60);
    const y0 = this.h - 48 - (lines.length - 1) * 10;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(20, y0 - 3, this.w - 40, lines.length * 10 + 5);
    lines.forEach((l, i) => drawText(g, l, this.w / 2, y0 + i * 10, inner ? '#b8d0ff' : '#f0ead8', { align: 'center' }));
  }
}

export const SPEAKERS = {
  henrik: 'Henrik', atta: 'Åtta', kall: 'Kall', astrom: 'Åström', sara: 'Sara', linnea: 'Linnea', maja: 'Maja', elsa: 'Elsa',
  vargen: 'Vargen', reader: 'Minnesläsaren', glitch: 'K?LL', news: 'Nyheterna', choir: 'Kören', civilian: 'Röst', hostage: 'Gisslan', guard: 'Vakt', guard1: 'Vakt', guard2: 'Vakt', police1: 'Polis',
  hostage1: 'Gisslan', hostage2: 'Gisslan', hostage3: 'Gisslan', radio: 'Radio', copy: 'Kopian',
};
