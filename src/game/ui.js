import { drawText, wrapText, textWidth } from '../engine/bitmapFont.js';
import { getTexture, loadTexture } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { voice } from '../engine/voice.js';
import { COL, SPEAKERS } from './hud.js';

// Full-screen UI states on the HUD canvas: title, pause, settings, controls,
// radio (codec) calls, choices, mission failed, loading, credits.

// Radio portraits for the sequel cast (texture names differ from speaker ids).
export const PORTRAIT_TEX = {
  henrik: 'portrait_henrik2', atta: 'portrait_atta', kall: 'portrait_kall', astrom: 'portrait_astrom2', sara: 'portrait_sara2',
  linnea: 'portrait_linnea', reader: 'portrait_reader', glitch: 'portrait_glitch', maja: 'portrait_maja', elsa: 'portrait_elsa',
};

// Radio frequencies per contact (the codec menu and the call screen).
export const FREQ = { kall: '140.85', linnea: '140.96', astrom: '141.12', sara: '141.52', glitch: '1?0.8?', henrik: '140.15' };

export class UI {
  constructor(game) {
    this.game = game;
    this.screen = null;
    this.sel = 0;
    this.typeT = 0;
    this.blip = 0;
    for (const t of Object.values(PORTRAIT_TEX)) loadTexture(t);
    loadTexture('logo_cyborg2');
  }

  get g() { return this.game.hud.g; }
  get w() { return this.game.hud.w; }
  get h() { return this.game.hud.h; }

  open(screen) { this.screen = screen; this.sel = 0; this.typeT = 0; }
  close() { this.screen = null; }

  pressed() {
    const i = this.game.input;
    return i.anyPressed('Enter', 'Space', 'KeyE') || i.mousePressed[0];
  }

  navigate(items, top, lineH = 13) {
    const inp = this.game.input;
    if (inp.anyPressed('ArrowDown', 'KeyS')) { this.sel = (this.sel + 1) % items.length; audio.play('ui_move', { volume: 0.5 }); }
    if (inp.anyPressed('ArrowUp', 'KeyW')) { this.sel = (this.sel - 1 + items.length) % items.length; audio.play('ui_move', { volume: 0.5 }); }
    if (!inp.locked) {
      const my = (inp.mouseY / window.innerHeight) * this.h;
      const i = Math.floor((my - top + 2) / lineH);
      const moved = inp.mouseX !== this.lmx || inp.mouseY !== this.lmy;
      this.lmx = inp.mouseX; this.lmy = inp.mouseY;
      if (i >= 0 && i < items.length && (moved || inp.mousePressed[0])) this.sel = i;
      if (i >= 0 && i < items.length && inp.mousePressed[0]) return true;
    }
    return inp.anyPressed('Enter', 'Space', 'KeyE');
  }

  update(dt) {
    const s = this.screen;
    if (s) this[`update_${s.type}`]?.(dt, s);
  }

  draw() {
    const s = this.screen;
    if (s) this[`draw_${s.type}`]?.(s);
  }

  menu(items, top, back) {
    if (this.navigate(items, top)) { audio.play('ui_select', { volume: 0.6 }); items[this.sel].action(); return; }
    if (back && this.game.input.wasPressed('Escape')) back();
  }

  drawItems(items, top) {
    const g = this.g;
    items.forEach((it, i) => {
      const y = top + i * 13;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (i === this.sel) {
        const w = textWidth(label) + 16;
        g.fillStyle = 'rgba(40,110,100,0.55)';
        g.fillRect(Math.round(this.w / 2 - w / 2), y - 2, w, 11);
      }
      drawText(g, label, this.w / 2, y, i === this.sel ? '#f0fff8' : COL.text, { align: 'center' });
    });
  }

  // ---- title ----------------------------------------------------------------

  titleItems() {
    const game = this.game;
    const items = [];
    if (game.save.exists()) items.push({ label: 'FORTSÄTT', action: () => game.continueGame() });
    items.push({ label: 'NYTT SPEL', action: () => game.newGame() });
    if (game.progress.unlocked > 0) items.push({ label: 'VÄLJ KAPITEL', action: () => this.open({ type: 'chapters' }) });
    items.push({ label: 'INSTÄLLNINGAR', action: () => this.open({ type: 'settings', back: 'title' }) });
    items.push({ label: 'KONTROLLER', action: () => this.open({ type: 'controls', back: 'title' }) });
    return items;
  }

  update_title() { this.menu(this.titleItems(), this.h * 0.6); }

  draw_title() {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, this.w, this.h);
    const logo = getTexture('logo_cyborg2')?.image;
    if (logo && logo.width > 16) {
      // The HUD canvas is 2x, so the logo keeps its full resolution.
      const w = Math.min(this.w - 40, 300);
      const h = (w * logo.height) / logo.width;
      g.drawImage(logo, Math.round(this.w / 2 - w / 2), Math.round(this.h * 0.12), w, h);
    } else {
      drawText(g, 'CYBÖRG II', this.w / 2, this.h * 0.2, '#e8e4d8', { align: 'center', scale: 4 });
    }
    drawText(g, 'GÖTEBORG, DECEMBER 2047', this.w / 2, this.h * 0.47, COL.dim, { align: 'center' });
    this.drawItems(this.titleItems(), this.h * 0.6);
  }

  chapterItems() {
    const game = this.game;
    const items = game.chapterList().filter((c, i) => i <= game.progress.unlocked).map((c) => ({
      label: c.title, action: () => game.startChapter(c.id),
    }));
    items.push({ label: 'TILLBAKA', action: () => this.open({ type: 'title' }) });
    return items;
  }

  update_chapters() { this.menu(this.chapterItems(), this.h * 0.25, () => this.open({ type: 'title' })); }
  draw_chapters() {
    this.g.fillStyle = 'rgba(0,0,0,0.8)';
    this.g.fillRect(0, 0, this.w, this.h);
    drawText(this.g, 'KAPITEL', this.w / 2, this.h * 0.12, '#e8e4d8', { align: 'center', scale: 2 });
    this.drawItems(this.chapterItems(), this.h * 0.25);
  }

  // ---- pause / settings / controls ---------------------------------------------

  pauseItems() {
    const game = this.game;
    return [
      { label: 'FORTSÄTT', action: () => game.resume() },
      { label: 'BÖRJA OM FRÅN KONTROLLPUNKT', action: () => game.continueGame() },
      { label: 'INSTÄLLNINGAR', action: () => this.open({ type: 'settings', back: 'pause' }) },
      { label: 'KONTROLLER', action: () => this.open({ type: 'controls', back: 'pause' }) },
      { label: 'AVSLUTA TILL MENYN', action: () => game.toTitle() },
    ];
  }

  update_pause() { this.menu(this.pauseItems(), this.h * 0.42, () => this.game.resume()); }
  draw_pause() {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, 'PAUS', this.w / 2, this.h * 0.22, '#e8e4d8', { align: 'center', scale: 2 });
    drawText(g, this.game.chapterTitle ?? '', this.w / 2, this.h * 0.22 + 22, COL.dim, { align: 'center' });
    this.drawItems(this.pauseItems(), this.h * 0.42);
    if (this.game.hud.objective) {
      wrapText(`UPPDRAG: ${this.game.hud.objective}`, this.w - 40).forEach((l, i) => drawText(g, l, this.w / 2, this.h - 30 + i * 10, COL.warn, { align: 'center' }));
    }
  }

  settingsItems(s) {
    const game = this.game;
    const st = game.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const step = (k, d, lo, hi) => { st[k] = Math.round(Math.min(hi, Math.max(lo, st[k] + d)) * 100) / 100; game.applySettings(); };
    const flip = (k) => () => { st[k] = !st[k]; game.applySettings(); };
    const onoff = (v) => (v ? 'PÅ' : 'AV');
    return [
      { label: () => `SVÅRIGHETSGRAD  < ${['LÄTT', 'NORMAL', 'SVÅR'][st.difficulty]} >`, adjust: (d) => { st.difficulty = (st.difficulty + d + 3) % 3; game.applySettings(); } },
      { label: () => `MUSKÄNSLIGHET  < ${st.sensitivity.toFixed(1)} >`, adjust: (d) => step('sensitivity', d * 0.1, 0.2, 3) },
      { label: () => `LJUSSTYRKA  < ${pct(st.brightness)} >`, adjust: (d) => step('brightness', d * 0.1, 0, 1) },
      { label: () => `VOLYM  < ${pct(st.volume)} >`, adjust: (d) => step('volume', d * 0.1, 0, 1) },
      { label: () => `MUSIK  < ${pct(st.music)} >`, adjust: (d) => step('music', d * 0.1, 0, 1) },
      { label: () => `RÖSTER  < ${pct(st.voice)} >`, adjust: (d) => step('voice', d * 0.1, 0, 1) },
      { label: () => `SYNKONER  < ${onoff(st.cones)} >`, adjust: flip('cones') },
      { label: () => `UPPLÖSNING  < ${st.resolution}p >`, adjust: (d) => { const r = [448, 576, 720]; st.resolution = r[(r.indexOf(st.resolution) + (d < 0 ? 2 : 1)) % 3] ?? 448; game.applySettings(); } },
      { label: () => `BLOOM  < ${onoff(st.bloom)} >`, adjust: flip('bloom') },
      { label: () => `FILMKORN  < ${onoff(st.grain)} >`, adjust: flip('grain') },
      { label: () => `RÖRELSEOSKÄRPA  < ${onoff(st.motion)} >`, adjust: flip('motion') },
      { label: () => `INVERTERA Y  < ${onoff(st.invertY)} >`, adjust: flip('invertY') },
      { label: 'TILLBAKA', action: () => { game.saveSettings(); this.open({ type: s.back }); } },
    ].map((it) => ({ ...it, action: it.action ?? (() => it.adjust(1)) }));
  }

  update_settings(dt, s) {
    const items = this.settingsItems(s);
    const inp = this.game.input;
    const it = items[this.sel];
    if (it.adjust && inp.anyPressed('ArrowLeft', 'KeyA')) { it.adjust(-1); audio.play('ui_move', { volume: 0.5 }); }
    if (it.adjust && inp.anyPressed('ArrowRight', 'KeyD')) { it.adjust(1); audio.play('ui_move', { volume: 0.5 }); }
    this.menu(items, this.h * 0.18, () => { this.game.saveSettings(); this.open({ type: s.back }); });
  }

  draw_settings(s) {
    this.g.fillStyle = 'rgba(0,0,0,0.85)';
    this.g.fillRect(0, 0, this.w, this.h);
    drawText(this.g, 'INSTÄLLNINGAR', this.w / 2, 12, '#e8e4d8', { align: 'center', scale: 2 });
    this.drawItems(this.settingsItems(s), this.h * 0.18);
  }

  update_controls(dt, s) {
    if (this.pressed() || this.game.input.wasPressed('Escape')) this.open({ type: s.back });
  }

  draw_controls() {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.88)';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, 'KONTROLLER', this.w / 2, 12, '#e8e4d8', { align: 'center', scale: 2 });
    const rows = [
      ['W A S D / PILAR', 'Gå (relativt kameran)'], ['MUS', 'Vrid kameran'], ['SHIFT', 'Spring (hörs)'], ['C', 'Huka / smyg'],
      ['E', 'Kvävgrepp / bär kropp / skaka / använd'], ['HÅLL E', 'Frys laddning med sprayen'],
      ['HÖGER MUSKNAPP', 'Sikta (bakifrån: håll upp vakten)'], ['VÄNSTERKLICK', 'Skjut'],
      ['1 / 2', 'Paralysator / tjänstevapen'], ['Q', 'EMP-puls'], ['T', 'Termosyn'], ['HÅLL R', 'Lyssna in'],
      ['B', 'Kartongen på / av'], ['F', 'Knacka i vägg eller skåp'], ['V', 'Radio'],
      ['H', 'Reparationspaket'], ['TAB', 'Visa uppdrag'], ['ESC', 'Paus'],
    ];
    rows.forEach(([k, v], i) => {
      drawText(g, k, this.w / 2 - 8, 34 + i * 11, COL.warn, { align: 'right' });
      drawText(g, v, this.w / 2 + 8, 34 + i * 11, COL.text);
    });
  }

  // ---- radio (codec) --------------------------------------------------------------

  update_radio(dt, s) {
    const line = s.lines[s.index];
    if (s.spoken !== s.index) {
      // New line: start its voice and pace the typewriter to the clip.
      s.spoken = s.index;
      s.voiced = voice.play(line.voiceId, { radio: true });
      s.typeRate = s.voiced ? Math.max(20, line.text.length / Math.max(0.5, voice.duration(line.voiceId) * 0.85)) : 50;
    }
    const prev = Math.floor(this.typeT);
    this.typeT += dt * s.typeRate;
    if (!s.voiced && Math.floor(this.typeT) > prev && prev < line.text.length && prev % 3 === 0) {
      audio.play('ui_move', { volume: 0.12, rate: line.who === 'henrik' ? 0.7 : line.who === 'copy' ? 1.4 : 1.05 });
    }
    if (!this.pressed()) return;
    if (this.typeT < line.text.length) { this.typeT = line.text.length; return; }
    s.index += 1;
    this.typeT = 0;
    if (s.index >= s.lines.length) {
      voice.stop();
      audio.play('codec_close', { volume: 0.7 });
      this.close();
      s.onDone?.();
    }
  }

  draw_radio(s) {
    const g = this.g;
    const line = s.lines[s.index];
    g.fillStyle = 'rgba(0,6,4,0.94)';
    g.fillRect(0, 0, this.w, this.h);
    for (let y = 0; y < this.h; y += 2) { g.fillStyle = 'rgba(0,40,30,0.25)'; g.fillRect(0, y, this.w, 1); }
    const me = this.game.player.model === 'atta' ? 'atta' : 'henrik';
    const caller = s.caller ?? s.lines.find((l) => l.who !== me)?.who ?? 'kall';
    const glitch = line.who === 'glitch';
    const pw = 84;
    const top = 26;
    const leftX = Math.round(this.w * 0.2 - pw / 2);
    const rightX = Math.round(this.w * 0.8 - pw / 2);
    this.portrait(me, leftX, top, pw, line.who === me);
    this.portrait(glitch ? 'glitch' : caller, rightX + (glitch ? (Math.random() - 0.5) * 4 : 0), top, pw, line.who !== me);
    drawText(g, 'RADIO', this.w / 2, top + 20, COL.teal, { align: 'center' });
    drawText(g, glitch ? FREQ.glitch : s.freq ?? FREQ[caller] ?? '140.85', this.w / 2, top + 34, glitch ? '#ff8080' : '#8fffe0', { align: 'center', scale: 2 });
    if (glitch) {
      // The voice on Kall's frequency is breaking up.
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(${150 + Math.random() * 100},40,60,0.35)`;
        g.fillRect(Math.random() * this.w, Math.random() * this.h, 20 + Math.random() * 90, 2 + Math.random() * 5);
      }
    }
    const name = (SPEAKERS[line.who] ?? line.who).toUpperCase();
    const bx = 24, by = top + pw + 16, bw = this.w - 48;
    g.strokeStyle = '#2a7a66';
    g.strokeRect(bx + 0.5, by + 0.5, bw, this.h - by - 12);
    drawText(g, name, bx + 8, by + 6, COL.teal);
    const shown = line.text.slice(0, Math.floor(this.typeT));
    const text = glitch ? [...shown].map((c) => (c !== ' ' && Math.random() < 0.04 ? '#' : c)).join('') : shown;
    wrapText(text, bw - 16).slice(0, 5).forEach((l, i) => drawText(g, l, bx + 8 + (glitch && Math.random() < 0.1 ? 2 : 0), by + 18 + i * 10, glitch ? '#ffd0d0' : '#d8f4ea'));
    if (this.typeT >= line.text.length && Math.sin(this.game.time * 6) > 0) drawText(g, '>', bx + bw - 12, this.h - 24, COL.teal);
  }

  portrait(who, x, y, size, active) {
    const g = this.g;
    const img = getTexture(PORTRAIT_TEX[who] ?? `portrait_${who}`)?.image;
    g.fillStyle = '#021410';
    g.fillRect(x - 2, y - 2, size + 4, size + 4);
    if (img && img.width > 8) {
      g.globalAlpha = active ? 1 : 0.35;
      g.drawImage(img, x, y, size, size);
      g.globalAlpha = 1;
    } else {
      drawText(g, (SPEAKERS[who] ?? who).toUpperCase(), x + size / 2, y + size / 2 - 4, COL.teal, { align: 'center' });
    }
    g.strokeStyle = active ? '#60e0c0' : '#1c4c40';
    g.strokeRect(x - 1.5, y - 1.5, size + 3, size + 3);
  }

  // ---- choice ------------------------------------------------------------------------

  update_choice(dt, s) {
    const items = s.options.map((o) => ({ label: o.label, action: () => { this.close(); o.action(); } }));
    this.menu(items, this.h * 0.55);
  }

  draw_choice(s) {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, this.h * 0.4, this.w, this.h * 0.4);
    wrapText(s.prompt, this.w - 60).forEach((l, i) => drawText(g, l, this.w / 2, this.h * 0.44 + i * 10, COL.warn, { align: 'center' }));
    this.drawItems(s.options.map((o) => ({ label: o.label })), this.h * 0.55);
  }

  // ---- mission failed / loading / credits ------------------------------------------

  update_dead(dt, s) {
    s.t = (s.t ?? 0) + dt;
    if (s.t > 1.5 && this.pressed()) this.game.continueGame();
  }

  draw_dead(s) {
    const g = this.g;
    const t = s.t ?? 0;
    g.fillStyle = `rgba(0,0,0,${Math.min(0.85, t)})`;
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, s.title ?? 'UPPDRAGET MISSLYCKADES', this.w / 2, this.h * 0.36, '#d04030', { align: 'center', scale: 2 });
    wrapText(s.quote ?? '', this.w - 80).forEach((l, i) => drawText(g, l, this.w / 2, this.h * 0.36 + 30 + i * 10, COL.dim, { align: 'center' }));
    if (t > 1.5) drawText(g, 'Tryck ENTER för att försöka igen', this.w / 2, this.h * 0.75, COL.text, { align: 'center' });
  }

  draw_loading(s) {
    const g = this.g;
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, s.title ?? '', this.w / 2, this.h * 0.4, '#e8e4d8', { align: 'center', scale: 2 });
    drawText(g, `LADDAR${'.'.repeat(1 + (Math.floor(this.game.time * 3) % 3))}`, this.w / 2, this.h * 0.4 + 26, COL.dim, { align: 'center' });
    if (s.tip) wrapText(s.tip, this.w - 80).forEach((l, i) => drawText(g, l, this.w / 2, this.h * 0.72 + i * 10, COL.dim, { align: 'center' }));
  }

  update_credits(dt, s) {
    s.t = (s.t ?? 0) + dt;
    if (s.t > 6 && (this.pressed() || this.game.input.wasPressed('Escape'))) this.game.toTitle();
  }

  draw_credits(s) {
    const g = this.g;
    const t = s.t ?? 0;
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.w, this.h);
    const lines = s.lines;
    const y0 = this.h - t * 16;
    lines.forEach((l, i) => {
      const y = y0 + i * 14;
      if (y < -10 || y > this.h + 10) return;
      drawText(g, l, this.w / 2, y, i === 0 ? '#e8e4d8' : l.startsWith('  ') ? COL.dim : COL.text, { align: 'center', scale: i === 0 ? 2 : 1 });
    });
    if (t > 6) drawText(g, 'ENTER', this.w - 30, this.h - 12, COL.dim, { align: 'center' });
  }
}
