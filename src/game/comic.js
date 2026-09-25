import { drawText, wrapText } from '../engine/bitmapFont.js';
import { getTexture, loadTexture } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { voice } from '../engine/voice.js';
import { comicVoiceId } from '../engine/voiceIds.js';
import { COMICS } from '../story/comics.js';
import { Stager } from './stager.js';
import { SPEAKERS } from './hud.js';

// Graphic-novel cutscenes (Max Payne style): pages of panels laid out on a
// 6×3 grid, each panel a still rendered from the engine by the Stager, with
// yellow narration boxes and white speech bubbles. Panels are revealed one
// at a time; Enter/click advances, Esc skips the whole sequence. Voiced
// panels are read aloud and the next panel follows when the voice ends.

const COLS = 6, ROWS = 3;
const SCALE = 2;
const SPAN = { full: [6, 3], wide: [6, 1], half: [3, 1], third: [2, 1], tall: [3, 2] };

/**
 * Pack panels in reading order on a COLS × rows grid (first free slot).
 * @returns {Array<{panel, c, r, sw, sh, fits}>}
 */
export function gridPlace(panels, rows = ROWS) {
  const used = Array.from({ length: rows }, () => new Array(COLS).fill(false));
  return panels.map((panel) => {
    const [sw, sh] = SPAN[panel.size] ?? SPAN.half;
    for (let r = 0; r + sh <= rows; r++) {
      for (let c = 0; c + sw <= COLS; c++) {
        let free = true;
        for (let y = r; y < r + sh && free; y++) for (let x = c; x < c + sw; x++) if (used[y][x]) free = false;
        if (!free) continue;
        for (let y = r; y < r + sh; y++) for (let x = c; x < c + sw; x++) used[y][x] = true;
        return { panel, c, r, sw, sh, fits: true };
      }
    }
    return { panel, c: 0, r: 0, sw: COLS, sh: rows, fits: false };
  });
}
const AUTO_GAP = 0.7; // seconds between a panel's last voice line and the next panel

/** Voice ids for one panel: narration first, then the speech bubbles. */
function panelVoiceIds(page, k) {
  const pan = page.panels[k];
  const id = (part) => comicVoiceId(page.src.comic, page.src.page, k, part);
  return [...(pan.narration ? [id('n')] : []), ...(pan.speech ?? []).map((_, j) => id(`s${j}`))];
}

export class ComicPlayer {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.active = false;
    this.autoT = null;
    this.stager = new Stager(game);
    loadTexture('comic_halftone');
    loadTexture('comic_paper');
  }

  resize() {
    const aspect = window.innerWidth / window.innerHeight;
    // Logical page is 480 lines; the canvas is twice that for crisp PS2-era text.
    this.canvas.height = 480 * SCALE;
    this.canvas.width = Math.round(480 * SCALE * aspect);
    if (this.active) this.draw();
  }

  /** Play a comic sequence; resolves when finished or skipped. */
  play(id, { lethal = false, music = 'music_comic2' } = {}) {
    const tag = (comic) => (COMICS[comic] ?? []).map((page, i) => ({ ...page, src: { comic, page: i } }));
    let pages = tag(id);
    if (id === 'ending' && lethal && COMICS.ending_lethal) pages = [...pages.slice(0, -1), ...tag('ending_lethal')];
    if (!pages.length) return Promise.resolve();
    this.pages = pages;
    this.pageIndex = 0;
    this.active = true;
    this.canvas.style.display = 'block';
    this.game.input.exitLock();
    audio.playMusic(music, 1.5);
    this.resize();
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.openPage(0);
    });
  }

  stop() {
    if (!this.active) return;
    voice.stop();
    this.active = false;
    this.canvas.style.display = 'none';
    this.resolve?.();
    this.resolve = null;
  }

  async openPage(i) {
    voice.stop();
    this.pageIndex = i;
    this.autoT = null;
    this.layout = this.computeLayout(this.pages[i]);
    voice.preload(this.pages[i].panels.flatMap((_, k) => panelVoiceIds(this.pages[i], k)));
    this.shown = 0;
    this.loading = true;
    this.draw();
    const token = (this.token = (this.token ?? 0) + 1);
    for (const cell of this.layout) {
      cell.image = await this.stager.render(cell.panel.art, Math.max(64, Math.round(cell.w * 1.5)), Math.max(48, Math.round(cell.h * 1.5)));
      if (token !== this.token) return;
    }
    this.loading = false;
    this.reveal();
  }

  reveal() {
    this.shown += 1;
    this.revealT = 0;
    this.autoT = null;
    audio.play('panel_hit', { volume: 0.5 });
    this.speak(panelVoiceIds(this.pages[this.pageIndex], this.shown - 1));
    this.draw();
  }

  /** Read a panel's lines in order; when done, arm the auto-advance timer. */
  speak(ids) {
    const [first, ...rest] = ids;
    if (!first) return;
    const done = () => { if (rest.length) this.speak(rest); else this.autoT = AUTO_GAP; };
    if (!voice.play(first, { onEnd: done })) this.speak(rest);
  }

  update(dt) {
    const inp = this.game.input;
    this.revealT = (this.revealT ?? 0) + dt;
    if (inp.wasPressed('Escape')) { this.finish(); return; }
    if (this.loading) { this.draw(); return; }
    const pressed = inp.anyPressed('Enter', 'Space', 'KeyE') || inp.mousePressed[0];
    // After a voiced panel the next one on the page follows by itself.
    if (this.autoT !== null) this.autoT -= dt;
    const auto = this.autoT !== null && this.autoT <= 0 && this.shown < this.layout.length;
    const next = pressed || auto;
    if (next && this.revealT > 0.25) {
      if (this.shown < this.layout.length) this.reveal();
      else if (this.pageIndex + 1 < this.pages.length) {
        audio.play('page_turn', { volume: 0.7 });
        this.openPage(this.pageIndex + 1);
      } else this.finish();
    }
    this.draw();
  }

  finish() {
    audio.play('page_turn', { volume: 0.5 });
    this.stop();
  }

  computeLayout(page) {
    const W = this.canvas.width / SCALE, H = this.canvas.height / SCALE;
    const margin = 18, gut = 8;
    // Crowded pages get extra rows instead of dropping panels.
    let rows = ROWS;
    let grid = gridPlace(page.panels, rows);
    while (grid.some((c) => !c.fits) && rows < 8) grid = gridPlace(page.panels, ++rows);
    const cw = (W - margin * 2 - gut * (COLS - 1)) / COLS;
    const ch = (H - margin * 2 - gut * (rows - 1)) / rows;
    const cells = grid.map(({ panel, c, r, sw, sh }) => ({
      panel, x: margin + c * (cw + gut), y: margin + r * (ch + gut), w: sw * cw + (sw - 1) * gut, h: sh * ch + (sh - 1) * gut,
    }));
    // Stretch the rows used to fill the page height when rows are unused.
    const maxBottom = Math.max(...cells.map((c) => c.y + c.h));
    const spare = H - margin - maxBottom;
    if (spare > ch * 0.5) {
      const k = (H - margin * 2) / (maxBottom - margin);
      for (const c of cells) { c.y = margin + (c.y - margin) * k; c.h *= k; }
    }
    return cells;
  }

  draw() {
    const g = this.g;
    const W = this.canvas.width / SCALE, H = this.canvas.height / SCALE;
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    g.imageSmoothingEnabled = true;
    const paper = getTexture('comic_paper')?.image;
    if (paper && paper.width > 8) {
      g.fillStyle = g.createPattern(paper, 'repeat');
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(10,12,14,0.78)';
      g.fillRect(0, 0, W, H);
    } else {
      g.fillStyle = '#121416';
      g.fillRect(0, 0, W, H);
    }
    if (!this.layout) return;
    this.layout.forEach((cell, i) => { if (i < this.shown) this.drawPanel(cell, i === this.shown - 1); });
    if (this.loading) drawText(g, '...', W / 2, H / 2, '#8a948e', { align: 'center', scale: 2 });
    else if (Math.sin(this.game.time * 5) > 0) drawText(g, this.shown < this.layout.length ? '>' : this.pageIndex + 1 < this.pages.length ? '>>' : 'SLUT', W - 30, H - 14, '#c8c0a0', { align: 'center' });
    drawText(g, `${this.pageIndex + 1}/${this.pages.length}`, 22, H - 14, '#5a605c');
  }

  drawPanel(cell, fresh) {
    const g = this.g;
    const { x, y, w, h, panel } = cell;
    const a = fresh ? Math.min(1, this.revealT * 5) : 1;
    g.globalAlpha = a;
    g.fillStyle = '#000';
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    if (cell.image) g.drawImage(cell.image, x, y, w, h);
    const tone = getTexture('comic_halftone')?.image;
    if (tone && tone.width > 8) {
      g.globalAlpha = a * 0.22;
      g.fillStyle = g.createPattern(tone, 'repeat');
      g.fillRect(x, y, w, h);
      g.globalAlpha = a;
    }
    g.strokeStyle = '#e8e2d0';
    g.lineWidth = 1;
    g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    if (panel.narration) this.narration(panel.narration, x + 6, y + 6, Math.min(w - 12, 300));
    if (panel.speech?.length) {
      let by = y + h - 8;
      const list = [...panel.speech].reverse();
      list.forEach((s, i) => { by = this.bubble(s, x + w - 8 - (i % 2) * 40, by, Math.min(w - 20, 260), i % 2 === 0) - 6; });
    }
    if (panel.sfx) drawText(g, panel.sfx, x + w / 2, y + h / 2 - 8, '#f0d060', { align: 'center', scale: 3 });
    g.globalAlpha = 1;
  }

  narration(text, x, y, maxW) {
    const g = this.g;
    const lines = wrapText(text, maxW - 10);
    const w = Math.max(...lines.map((l) => l.length)) * 6 + 10;
    const h = lines.length * 10 + 8;
    g.fillStyle = '#000';
    g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = '#e8d890';
    g.fillRect(x, y, w, h);
    lines.forEach((l, i) => drawText(g, l, x + 5, y + 5 + i * 10, '#1a1508', { shadow: null }));
  }

  // Speech bubble anchored at its bottom-right corner; returns its top y.
  bubble(s, right, bottom, maxW, tailLeft) {
    const g = this.g;
    const name = (SPEAKERS[s.who] ?? s.who ?? '').toUpperCase();
    const lines = wrapText(s.text, maxW - 12);
    const w = Math.max(name.length, ...lines.map((l) => l.length)) * 6 + 12;
    const h = lines.length * 10 + 18;
    const x = right - w, y = bottom - h;
    g.fillStyle = '#000';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = s.who === 'copy' ? '#dff6ff' : '#f6f4ee';
    g.fillRect(x, y, w, h);
    const tx = tailLeft ? x + 10 : x + w - 16;
    g.beginPath();
    g.moveTo(tx, y + h);
    g.lineTo(tx + 6, y + h + 7);
    g.lineTo(tx + 10, y + h);
    g.fill();
    drawText(g, name, x + 6, y + 4, s.who === 'kall' ? '#304050' : '#6a3a20', { shadow: null });
    lines.forEach((l, i) => drawText(g, l, x + 6, y + 14 + i * 10, '#101010', { shadow: null }));
    return y;
  }
}
