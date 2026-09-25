import * as THREE from 'three';
import { Renderer } from '../engine/renderer.js';
import { sharedUniforms } from '../engine/material.js';
import { Input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { voice } from '../engine/voice.js';
import { radioVoiceId, lineVoiceId } from '../engine/voiceIds.js';
import { materialFor, loadTexture } from '../engine/assets.js';
import { LightManager } from './lights.js';
import { Effects } from './effects.js';
import { Rain } from './rain.js';
import { Snow } from './snow.js';
import { Footprints } from './footprints.js';
import { createSystems } from './systems/index.js';
import { Player } from './player.js';
import { ChaseCamera } from './camera.js';
import { Alarm, PHASE } from './alarm.js';
import { buildWorld } from './world.js';
import { spawnGuard } from './guard.js';
import { spawnCamera, spawnDrone } from './sensors.js';
import { spawnBoss } from './bosses.js';
import { spawnNPC } from './npc.js';
import { spawnDoor, spawnPickup } from './interactables.js';
import { makeShadow } from './shadows.js';
import { HUD, HUD_SCALE } from './hud.js';
import { UI } from './ui.js';
import { SaveStore } from './save.js';
import { ComicPlayer } from './comic.js';
import { CutscenePlayer } from './cutscene.js';
import { codecScreens, openCodecMenu } from './codecMenu.js';
import { creditsLines } from './ending.js';
import { playHelpers } from './playHelpers.js';

Object.assign(UI.prototype, codecScreens);
import * as act from './actions.js';
import { LEVELS, CHAPTERS } from '../levels/index.js';
import { RADIO } from '../story/radio.js';
import { LINES, BARKS, OBJECTIVES, GAME_OVER, TIPS } from '../story/lines.js';

// Top-level game: chapter flow (comic → level → comic), player control,
// stealth AI, alarm & music, saves and the script API used by levels.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Level shown behind the title menu.
const TITLE_LEVEL = 'frihamnen';
const freshStats = () => ({ kills: 0, takedowns: 0, alerts: 0, time: 0, saves: 0, dogtags: [], scans: 0, continues: 0 });

export class Game {
  constructor(glCanvas, hudCanvas, comicCanvas) {
    this.gfx = new Renderer(glCanvas);
    this.hudCanvas = hudCanvas;
    this.input = new Input(glCanvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.gfx.aspect, 0.1, 140);
    this.viewScene = new THREE.Scene();
    this.lights = new LightManager();
    this.effects = new Effects(this.scene, this.lights);
    this.rain = new Rain(this.scene);
    this.snow = new Snow(this.scene);
    this.sys = createSystems();
    this.shootables = [];
    this.player = new Player();
    this.cam = new ChaseCamera(this.camera);
    this.alarm = new Alarm();
    this.hud = new HUD(hudCanvas);
    this.ui = new UI(this);
    this.comics = new ComicPlayer(this, comicCanvas);
    this.cutscene = new CutscenePlayer(this);
    loadTexture('frost_vignette').then((t) => this.gfx.setFrostTexture(t));
    this.save = new SaveStore();
    this.settings = this.save.loadSettings();
    this.progress = this.save.loadProgress();
    this.audio = audio;
    this.world = null;
    this.level = null;
    this.guards = [];
    this.cameras = [];
    this.drones = [];
    this.bosses = [];
    this.npcs = [];
    this.pickups = [];
    this.doors = [];
    this.timers = [];
    this.flags = {};
    this.stats = freshStats();
    this.inv = this.freshInventory();
    this.state = 'boot';
    this.time = 0;
    this.last = performance.now();
    this.fireCd = 0;
    this.thermal = false;
    this.difficulty = 1;
    this.boss = null;
    this.bossActive = false;
    this.barkCd = 0;
    this.loadToken = 0;
    this.onBossDown = (b) => { this.bossActive = false; audio.playMusic(this.level?.music ?? null, 2); this.level?.script?.bossDown?.(this, b); };
    this.onBossPhase = (b, phase) => this.level?.script?.bossPhase?.(this, b, phase);
    this.player.onStep = (cell) => this.footstep(cell);
    this.player.onNoise = (pos, r) => this.emitNoise(pos, r);
    this.alarm.onPhase = (phase) => this.onAlarmPhase(phase);
    window.addEventListener('resize', () => this.onResize());
    glCanvas.addEventListener('click', () => {
      audio.unlock();
      if (this.inPlay && !this.ui.screen && !this.comics.active) this.input.requestLock();
    });
    window.addEventListener('keydown', () => audio.unlock(), { once: true });
    this.input.onLockChange = (locked) => {
      if (!locked && this.inPlay && !this.ui.screen && !this.comics.active && !this.player.dead) this.pause();
    };
    this.applySettings();
    this.onResize();
  }

  get inPlay() { return this.state === 'play'; }
  get mode() { return this.level?.mode ?? 'mission'; }
  get chapterTitle() { return this.level?.title; }

  freshInventory(loadout = {}) {
    return {
      weapon: 'tranq',
      ammo: { tranq: loadout.tranq ?? 12, pistol: loadout.pistol ?? 8 },
      repair: loadout.repair ?? 1,
      keycards: new Set(),
      items: new Set(loadout.items ?? []),
    };
  }

  // ---- settings / resize -------------------------------------------------------

  onResize() {
    this.gfx.resize();
    this.camera.aspect = this.gfx.aspect;
    this.camera.updateProjectionMatrix();
    this.hudCanvas.width = Math.round(240 * HUD_SCALE * this.gfx.aspect);
    this.hudCanvas.height = 240 * HUD_SCALE;
    this.comics.resize();
  }

  applySettings() {
    const s = this.settings;
    this.input.sensitivity = s.sensitivity;
    audio.volumes.master = s.volume;
    audio.volumes.music = s.music;
    audio.volumes.voice = s.voice ?? 1;
    audio.applyVolumes();
    if (this.gfx.internalHeight !== s.resolution) { this.gfx.setInternalHeight(s.resolution); this.onResize(); }
    this.difficulty = [0.55, 1, 1.5][s.difficulty] ?? 1;
    const post = this.gfx.postUniforms;
    post.uGamma.value = 1.05 - s.brightness * 0.4;
    this.bloomScale = s.bloom ? 1 : 0;
    this.grainScale = s.grain ? 1 : 0;
    this.ghostScale = s.motion ? 1 : 0;
    if (this.look) {
      post.uBloom.value = this.look.bloom * this.bloomScale;
      post.uNoise.value = this.look.grain * this.grainScale;
    }
  }

  saveSettings() { this.save.storeSettings(this.settings); }

  // ---- flow ------------------------------------------------------------------------

  chapterList() { return CHAPTERS; }

  async boot() {
    this.ui.open({ type: 'loading', title: 'CYBÖRG II' });
    // Count visits (Minnesläsaren notices how often you come back).
    this.progress = { ...this.progress, loads: (this.progress.loads ?? 0) + 1 };
    this.save.storeProgress(this.progress);
    await voice.init();
    if (!this.player.obj) await this.player.load(this.scene);
    await this.loadLevel(TITLE_LEVEL, { title: true });
    this.state = 'title';
    this.titleT = 0;
    this.ui.open({ type: 'title' });
    audio.playAmbience('rain_loop', 0.5);
    audio.playMusic('music_title2');
  }

  newGame() {
    this.save.clear();
    this.flags = {};
    this.stats = freshStats();
    this.startChapter(CHAPTERS[0].id);
  }

  continueGame() {
    const s = this.save.load();
    if (!s) { this.newGame(); return; }
    this.flags = { ...s.flags };
    this.stats = { ...freshStats(), ...s.stats };
    this.startChapter(s.chapter, s);
  }

  async startChapter(id, restore = null, opts = {}) {
    const ch = CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
    this.input.exitLock();
    this.state = 'loading';
    if (!restore && ch.comic && !opts.skipComic) {
      await this.comics.play(ch.comic);
    }
    this.ui.open({ type: 'loading', title: ch.title, tip: pick(TIPS) });
    const def = LEVELS[ch.level];
    this.inv = this.freshInventory(def.loadout);
    if (restore) this.restoreInventory(restore);
    await this.loadLevel(ch.level, restore ?? {});
    this.chapterId = id;
    this.ui.close();
    this.state = 'play';
    this.player.dead = false;
    if (restore?.health) this.player.health = restore.health;
    else this.player.health = this.player.maxHealth;
    this.player.energy = 100;
    this.hud.setObjective(this.objectiveFor(0));
    this.hud.showTitle(def.title, def.subtitle);
    this.level.script?.onStart?.(this, restore);
    if (!restore) this.checkpoint();
    this.input.requestLock();
  }

  objectiveFor(i) {
    const o = OBJECTIVES[this.level?.id];
    return Array.isArray(o) ? o[Math.min(i, o.length - 1)] : o;
  }

  setObjective(i) {
    this.objectiveIndex = i;
    this.hud.setObjective(this.objectiveFor(i));
  }

  async loadLevel(id, restore = {}) {
    const token = ++this.loadToken;
    const def = LEVELS[id];
    this.clearLevel();
    // Level systems read what a restored checkpoint remembers (e.g. frozen charges).
    this.restoreState = restore;
    this.frozenBombs = [...(restore.frozen ?? [])];
    const world = await buildWorld(def, this.lights);
    if (token !== this.loadToken) return;
    this.world = world;
    this.level = def;
    this.scene.add(world.root);
    this.actors = new THREE.Group();
    this.scene.add(this.actors);
    // Atmosphere
    const a = def.ambient ?? [0.1, 0.1, 0.12];
    sharedUniforms.uAmbient.value.setRGB(...a);
    const sky = def.sky ?? [0, 0, 0];
    sharedUniforms.uSkyColor.value.setRGB(...sky);
    const fog = def.fogColor ?? [0.1, 0.12, 0.14];
    sharedUniforms.uFogColor.value.setRGB(...fog);
    sharedUniforms.uFogNear.value = def.fog?.[0] ?? 12;
    sharedUniforms.uFogFar.value = def.fog?.[1] ?? 48;
    this.ambientLight = def.ambientLight ?? 0.25;
    this.visionMul = def.visionMul ?? 1;
    this.rain.visible = !!def.rain;
    this.applyLook(def);
    this.water = world.root.getObjectByName('city')?.children.filter((m) => m.userData.water) ?? [];
    // Actors
    const sp = world.spawns;
    const tasks = [];
    if (!restore.title) {
      sp.guards.forEach((g, i) => { g.index = i; tasks.push(spawnGuard(g, world, this.actors).then((x) => this.guards.push(x))); });
      sp.cameras.forEach((c) => tasks.push(spawnCamera(c, this.actors).then((x) => this.cameras.push(x))));
      sp.drones.forEach((d) => tasks.push(spawnDrone(d, world, this.actors).then((x) => this.drones.push(x))));
      sp.bosses.forEach((b) => tasks.push(spawnBoss(b, world, this.actors).then((x) => { x.obj.visible = !b.hidden; this.bosses.push(x); })));
      sp.pickups.forEach((p, i) => { p.index = i; if (!restore.taken?.includes(i)) this.pickups.push(spawnPickup(p, world, this.actors)); });
    }
    sp.npcs.forEach((n) => tasks.push(spawnNPC(n, world, this.actors).then((x) => { this.npcs.push(x); x.shadow = n.holo ? null : makeShadow(this.actors, n.scale ? 0.6 : 0.8); })));
    sp.doors.forEach((d) => tasks.push(spawnDoor(d, world, this.actors).then((x) => this.doors.push(x))));
    await Promise.all(tasks);
    for (const g of this.guards) g.shadow = makeShadow(this.actors, 0.9);
    await this.player.load(this.scene, def.player ?? 'henrik2');
    this.player.attach(this.scene);
    this.player.shadow ??= makeShadow(this.scene, 0.9);
    // Soft character light so Henrik always reads against the dark.
    this.playerLight = this.lights.add({ pos: new THREE.Vector3(), color: def.playerLight ?? 0x9fb0c0, range: 5, intensity: def.playerLightIntensity ?? 0.85, tag: 'player' });
    const marker = restore.checkpoint && sp.markers[restore.checkpoint];
    const spawn = marker ?? def.spawn;
    this.player.spawn(spawn.x, Math.max(0, world.grid.floorAt(spawn.x, spawn.z)), spawn.z, spawn.yaw ?? 0);
    this.player.obj.visible = !restore.title;
    this.player.shadow.visible = !restore.title;
    this.cam.snap(this.player.pos, spawn.camYaw ?? def.camYaw ?? 0);
    this.alarm.reset();
    this.alarm.onPhase = (phase) => this.onAlarmPhase(phase);
    audio.playAmbience(def.ambience ?? null, def.ambienceVolume ?? 0.6);
    audio.playMusic(def.music ?? null);
    this.soundSources = (def.sounds ?? []).map((s) => audio.play(s.name, { pos: new THREE.Vector3(s.x, s.y ?? 1.5, s.z), loop: true, volume: s.volume ?? 0.6, refDistance: s.ref ?? 3, maxDistance: s.max ?? 40 }));
    // Winter: snowfall, footprints and the sequel's gameplay systems.
    this.snow.visible = !!def.snowfall;
    this.snow.configure({ blizzard: def.blizzard ?? 0, wind: def.wind ?? [0.4, 0.1] });
    this.footprints = def.snowfall || def.snowGround ? new Footprints(this.actors) : null;
    if (this.footprints && def.snowFill) this.footprints.fillTime = def.snowFill;
    if (!restore.title) await Promise.all(Object.values(this.sys).map((s) => s.load?.(this, world, restore)));
  }

  /** Per-level PS2 look: ground bounce, snow, bloom and colour grading. */
  applyLook(def) {
    const post = this.gfx.postUniforms;
    const g = def.grade ?? {};
    sharedUniforms.uGroundColor.value.setRGB(...(def.ground ?? (def.sky ?? [0.1, 0.1, 0.12]).map((v) => v * 0.35)));
    sharedUniforms.uSnow.value = def.snow ?? 0;
    this.look = {
      bloom: def.bloom ?? 0.35,
      grain: def.grain ?? 0.02,
      frost: def.frost ?? 0,
    };
    post.uExposure.value = def.exposure ?? 1.25;
    post.uBloom.value = this.look.bloom * (this.bloomScale ?? 1);
    post.uNoise.value = this.look.grain * (this.grainScale ?? 1);
    post.uLift.value.set(...(g.lift ?? [0, 0, 0]));
    post.uGamma3.value.set(...(g.gamma ?? [1, 1, 1]));
    post.uGain.value.set(...(g.gain ?? [1, 1, 1]));
    post.uSaturation.value = g.saturation ?? 0.9;
    post.uFrost.value = this.look.frost;
    post.uGlitch.value = 0;
    post.uLetterbox.value = 0;
    post.uGhost.value = 0;
    post.uDofOn.value = 0;
  }

  clearLevel() {
    // Pending fail timers are dropped with the level, so the flag must go too.
    this.failing = false;
    voice.stop();
    for (const s of Object.values(this.sys)) s.clear?.(this);
    this.footprints = null;
    this.player.hidden = false;
    this.player.frozen = false;
    this.player.boxed = false;
    this.level?.script?.onLeave?.(this);
    for (const s of this.soundSources ?? []) s?.stop(0.3);
    for (const d of this.drones) d.dispose();
    for (const b of this.bosses) b.dispose?.();
    for (const g of this.guards) g.cone?.dispose();
    for (const c of this.cameras) c.cone?.dispose();
    if (this.world) this.scene.remove(this.world.root);
    // Free per-instance GPU resources (shared cached materials stay alive).
    for (const root of [this.world?.root, this.actors]) {
      root?.traverse((o) => {
        if (!o.isMesh) return;
        if (o.material?.userData?.unique) o.material.dispose();
        if (o.geometry?.userData?.levelOwned) o.geometry.dispose();
      });
    }
    if (this.actors) this.scene.remove(this.actors);
    this.lights.clear();
    this.effects.reset();
    this.guards = [];
    this.cameras = [];
    this.drones = [];
    this.bosses = [];
    this.npcs = [];
    this.pickups = [];
    this.doors = [];
    this.timers = [];
    this.boss = null;
    this.bossActive = false;
    this.cinematic = null;
    this.chokeTarget = null;
    this.player.carrying = null;
    if (this.thermal) act.toggleThermal(this, false);
    this.hud.subQueue = [];
    this.hud.subtitle = null;
  }

  checkpoint(markerId = null) {
    this.save.store({
      chapter: this.chapterId ?? CHAPTERS[0].id,
      checkpoint: markerId ?? this.lastCheckpoint ?? null,
      health: Math.max(this.player.health, 50),
      inv: { ...this.inv, keycards: [...this.inv.keycards], items: [...this.inv.items], ammo: { ...this.inv.ammo } },
      frozen: [...(this.frozenBombs ?? [])],
      flags: { ...this.flags },
      stats: { ...this.stats },
      taken: this.world.spawns.pickups.length ? this.world.spawns.pickups.map((p, i) => i).filter((i) => !this.pickups.some((pk) => pk.def.index === i && !pk.taken)) : [],
    });
    if (markerId) this.lastCheckpoint = markerId;
    this.hud.message('Kontrollpunkt.', '#6f8a80', 2);
  }

  restoreInventory(s) {
    this.inv = { ...this.inv, ...s.inv, ammo: { ...s.inv.ammo }, keycards: new Set(s.inv.keycards ?? []), items: new Set(s.inv.items ?? []) };
  }

  async completeChapter() {
    const i = CHAPTERS.findIndex((c) => c.id === this.chapterId);
    this.progress.unlocked = Math.max(this.progress.unlocked, i + 1);
    this.save.storeProgress(this.progress);
    this.lastCheckpoint = null;
    const next = CHAPTERS[i + 1];
    this.input.exitLock();
    if (next) {
      this.flags = { ...this.flags };
      this.startChapter(next.id);
      return;
    }
    await this.playEnding();
  }

  async playEnding() {
    this.state = 'loading';
    this.clearLevel();
    this.save.clear();
    audio.playAmbience(null);
    audio.playMusic('music_ending2', 1);
    await this.comics.play('ending', { lethal: this.stats.kills > 0, music: 'music_ending2' });
    this.state = 'credits';
    this.ui.open({ type: 'credits', lines: creditsLines(this.stats) });
  }

  pause() {
    if (!this.inPlay || this.ui.screen || this.failing) return;
    this.input.exitLock();
    this.ui.open({ type: 'pause' });
  }

  resume() {
    this.ui.close();
    this.input.requestLock();
  }

  toTitle() {
    this.input.exitLock();
    this.comics.stop();
    this.boot();
  }

  fail(kind = 'default') {
    if (this.failing) return;
    this.failing = true;
    this.input.exitLock();
    audio.playMusic(null);
    const seenLines = kind === 'seen_by_family' && this.level?.seenKey ? LINES[this.level.seenKey] : null;
    const quote = seenLines ? seenLines.map((l) => l.text).join(' ') : pick(GAME_OVER[kind] ?? GAME_OVER.default);
    this.later(kind === 'seen_by_family' ? 0.8 : 1.6, () => {
      this.failing = false;
      this.ui.open({ type: 'dead', title: kind === 'seen_by_family' ? 'HON SÅG DIG' : kind === 'lost' ? 'DU TAPPADE BORT DEM' : 'UPPDRAGET MISSLYCKADES', quote });
    });
  }

  // ---- script API ------------------------------------------------------------------

  radio(id, onDone) {
    const lines = RADIO[id];
    if (!lines) { onDone?.(); return; }
    this.input.exitLock();
    audio.play('codec_ring', { volume: 0.8 });
    const voiced = lines.map((l, i) => ({ ...l, voiceId: radioVoiceId(id, i) }));
    voice.preload(voiced.map((l) => l.voiceId));
    this.ui.open({ type: 'radio', lines: voiced, index: 0, onDone: () => { this.input.requestLock(); onDone?.(); } });
  }

  say(key, onDone) {
    const lines = LINES[key];
    if (!lines) { onDone?.(); return; }
    const voiced = lines.map((l, i) => ({ ...l, voiceId: lineVoiceId(key, i) }));
    voice.preload(voiced.map((l) => l.voiceId));
    this.hud.say(voiced, onDone);
  }

  later(seconds, fn) { this.timers.push({ t: seconds, fn }); }

  /** Run due timers. Timers added while ticking wait for the next frame. */
  tickTimers(dt) {
    const due = this.timers;
    this.timers = [];
    for (const t of due) { t.t -= dt; if (t.t <= 0) t.fn(); else this.timers.push(t); }
  }

  /** Short burst of picture tearing (glitch). */
  glitchPulse(amount = 0.4, duration = 0.3) {
    this.glitchAmt = Math.max(this.glitchT > 0 ? this.glitchAmt : 0, amount);
    this.glitchT = Math.max(this.glitchT ?? 0, duration);
    audio.play('glitch_noise', { volume: 0.5 + amount * 0.5 });
  }

  /** Remember collected ID tags across playthroughs. */
  recordDogtag(name) {
    const tags = new Set(this.progress.dogtags ?? []);
    tags.add(name);
    this.progress = { ...this.progress, dogtags: [...tags] };
    this.save.storeProgress(this.progress);
  }

  /** Play an in-engine cutscene; resolves when it ends. */
  playCutscene(id, onDone) {
    if (this.skipCutscenes) { onDone?.(); return Promise.resolve(); }
    return new Promise((resolve) => this.cutscene.play(id, () => { onDone?.(); resolve(); }));
  }
  npc(id) { return this.npcs.find((n) => n.id === id) ?? null; }
  guard(id) { return this.guards.find((g) => g.id === id) ?? null; }
  marker(id) { return this.world.spawns.markers[id]; }
  door(id) { return this.doors.find((d) => d.def.id === id) ?? null; }
  bossTargets() { return this.bosses.filter((b) => !b.dead && this.bossActive); }

  choose(prompt, options) {
    this.input.exitLock();
    this.ui.open({ type: 'choice', prompt, options: options.map((o) => ({ ...o, action: () => { this.input.requestLock(); o.action(); } })) });
  }

  inHideZone(pos) {
    return this.world.spawns.triggers.some((t) => t.hide && pos.x >= t.rect[0] && pos.x <= t.rect[2] + 1 && pos.z >= t.rect[1] && pos.z <= t.rect[3] + 1);
  }

  emitNoise(pos, radius, kind = null) {
    const ctx = this.enemyCtx();
    for (const g of this.guards) g.hearNoise(pos, radius, ctx, kind);
  }

  enemyCtx() {
    return {
      grid: this.world.grid,
      player: this.player,
      alarm: this.alarm,
      lights: this.lights,
      ambientLight: this.ambientLight,
      guards: this.guards,
      visionMul: this.visionMul,
      footprints: this.footprints,
      onCheckLocker: (g, l) => this.sys.lockers.checkedBy(this, g, l),
      bark: (g, type) => this.bark(g, type),
      onKill: () => { this.stats.kills += 1; },
      guardShoot: (g, dist) => act.guardShoot(this, g, dist),
    };
  }

  bark(guard, type) {
    const set = guard.def.barks ?? (guard.shield ? 'shield' : this.level?.barks ?? 'sons');
    const pool = BARKS[set]?.[type] ?? BARKS.sons?.[type] ?? [];
    if (!pool.length || this.barkCd > 0) return;
    if (guard.pos.distanceTo(this.player.pos) > 18) return;
    this.barkCd = 2.5;
    this.hud.message(`VAKT: ${pick(pool)}`, type === 'alert' ? '#f07050' : '#c8c0a0', 2.6);
  }

  hurtPlayer(dmg) {
    if (this.player.dead || this.godMode) return;
    this.player.damage(dmg);
    audio.play(this.player.dead ? 'death' : Math.random() < 0.5 ? 'hurt_1' : 'hurt_2', { volume: 0.8 });
    this.gfx.postUniforms.uDamage.value = 0.8;
    if (this.player.dead) this.fail('default');
  }

  onAlarmPhase(phase) {
    const def = this.level;
    if (!def || this.mode !== 'mission' || this.bossActive) return;
    for (const s of Object.values(this.sys)) s.onPhase?.(phase);
    if (phase === PHASE.ALERT) {
      this.stats.alerts += 1;
      audio.play('alert', { volume: 1 });
      audio.playMusic(def.alertMusic ?? 'music_alert2', 0.2);
    } else if (phase === PHASE.EVASION) audio.playMusic(def.evasionMusic ?? 'music_evasion2', 1);
    else audio.playMusic(def.music ?? null, 3);
  }

  footstep(cell) {
    const ft = cell?.ft ?? '';
    const kind = /metal|plate|corrugated|noise/.test(ft) ? 'metal' : /grass|mud/.test(ft) ? 'grass' : 'asphalt';
    const puddle = this.level?.rain && kind === 'asphalt' && Math.random() < 0.3;
    const name = puddle ? `step_puddle_${1 + Math.floor(Math.random() * 3)}` : `step_${kind}_${1 + Math.floor(Math.random() * (kind === 'asphalt' ? 4 : 3))}`;
    audio.play(name, { volume: this.player.crouch ? 0.18 : this.player.running ? 0.5 : 0.32, rate: 0.9 + Math.random() * 0.2 });
    if (Math.random() < 0.25) audio.play('step_servo', { volume: 0.15 });
  }

  // ---- loop ------------------------------------------------------------------------

  start() {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      try { this.update(dt); } catch (err) { console.error('[game] frame error', err); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    this.time += dt;
    sharedUniforms.uTime.value = this.time;
    const post = this.gfx.postUniforms;
    post.uTime.value = this.time;
    const mouse = this.input.consumeMouse();
    const paused = !!this.ui.screen || this.comics.active;
    this.barkCd = Math.max(0, this.barkCd - dt);

    if (this.comics.active) this.comics.update(dt);
    else if (this.state === 'title' && this.world) this.titleCamera(dt);
    else if (this.inPlay && this.world && !paused && this.cutscene.playing) this.updateCutscene(dt);
    else if (this.inPlay && this.world && !paused) this.updatePlay(dt, mouse);
    if (this.inPlay && this.world && this.ui.screen?.type === 'dead') this.updateDying(dt);

    for (const w of this.water ?? []) w.material.uniforms.uUvOffset.value.set(this.time * 0.01, this.time * 0.02);
    this.lights.update(dt, this.camera.position);
    this.effects.update(dt, this.camera);
    this.rain.update(dt, this.cam.target, this.camera, this.world?.grid);
    // No snowfall over roofed interiors (they are drawn open for the cutaway camera).
    const under = this.world?.grid.cellAt(this.cam.target.x, this.cam.target.z);
    this.snow.mesh.visible = !!this.level?.snowfall && !under?.indoor;
    this.snow.update(dt, this.cam.target, this.camera);
    // PS2-style frame blending while the alarm is up.
    if (this.inPlay && !this.cutscene.playing) {
      const want = this.alarm.phase === PHASE.ALERT ? 0.35 : 0;
      post.uGhost.value += (want * (this.ghostScale ?? 1) - post.uGhost.value) * Math.min(1, dt * 3);
    }
    audio.setListener(this.camera.position, new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion));
    post.uDamage.value = Math.max(0, post.uDamage.value - dt * 1.5);
    post.uToxic.value = 0;
    this.ui.update(dt);
    this.hud.update(dt);
    this.hud.clear();
    if (this.inPlay && (!this.ui.screen || this.ui.screen.type === 'choice')) this.hud.draw(this);
    this.ui.draw();
    this.input.endFrame();
    if (!this.comics.active) this.gfx.render(this.scene, this.camera, null, null);
  }

  updatePlay(dt, mouse) {
    const { input, player } = this;
    if (input.wasPressed('Escape')) { this.pause(); return; }
    this.stats.time += dt;
    this.fireCd = Math.max(0, this.fireCd - dt);
    const mission = this.mode === 'mission';
    const aim = mission && input.mouseDown[2] && !player.carrying && player.choke <= 0;
    const inv = this.settings.invertY ? -1 : 1;
    if (aim) {
      if (this.cam.fp < 0.5 && !this.wasAiming) { this.cam.fpYaw = player.yaw; this.cam.fpPitch = 0; }
      this.cam.fpYaw -= mouse.x * 0.0022;
      this.cam.fpPitch = Math.max(-1.2, Math.min(1.2, this.cam.fpPitch - mouse.y * 0.0022 * inv));
    } else {
      this.cam.targetYaw -= mouse.x * 0.003;
    }
    this.wasAiming = aim;
    // WASD and the arrow keys both move. Which one was used last matters to
    // Minnesläsaren, who reads the WASD hand (the "switch controller port" gag).
    const wasd = new THREE.Vector2(
      (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0),
      (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0),
    );
    const arrows = new THREE.Vector2(
      (input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('ArrowLeft') ? 1 : 0),
      (input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('ArrowDown') ? 1 : 0),
    );
    if (wasd.lengthSq()) { this.moveScheme = 'wasd'; this.moveSchemeT = this.time; }
    else if (arrows.lengthSq()) { this.moveScheme = 'arrows'; this.moveSchemeT = this.time; }
    const move = this.cinematic || player.frozen ? new THREE.Vector2() : wasd.add(arrows).clampLength(0, 1.5);
    player.update(dt, this.world.grid, {
      move, basis: this.cam.basis(), run: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
      crouchToggle: input.wasPressed('KeyC') || input.wasPressed('ControlLeft'), aim, aimYaw: this.cam.fpYaw,
    });
    this.cam.update(dt, player.pos, { fp: aim, eye: player.eye(), grid: this.world.grid });
    if (this.cinematic) {
      this.camera.position.set(...this.cinematic.pos);
      this.camera.lookAt(new THREE.Vector3(...this.cinematic.look));
      this.camera.updateMatrixWorld();
      sharedUniforms.uCutTarget.value.set(0, 9999, 0);
    }
    player.obj.visible = this.cam.fp < 0.5 && !this.cinematic;
    player.shadow.position.set(player.pos.x, player.pos.y + 0.03, player.pos.z);
    this.playerLight?.pos.set(player.pos.x + 0.6, player.pos.y + 2.4, player.pos.z + 0.8);

    if (mission) {
      if (input.wasPressed('Digit1')) { this.inv.weapon = 'tranq'; audio.play('reload', { volume: 0.5 }); }
      if (input.wasPressed('Digit2')) { this.inv.weapon = 'pistol'; audio.play('reload', { volume: 0.5 }); }
      if (input.mousePressed[0] && !player.carrying && player.choke <= 0) act.playerShoot(this);
      if (input.wasPressed('KeyQ')) act.useEmp(this);
      if (input.wasPressed('KeyT')) act.toggleThermal(this);
      if (input.wasPressed('KeyH')) act.useRepair(this);
    }
    // Radio and core recharge work in family chapters too.
    if (input.wasPressed('KeyV')) openCodecMenu(this);
    act.updateAbilities(this, dt);
    for (const s of Object.values(this.sys)) s.update?.(this, dt);
    if (this.footprints) {
      if (!player.hidden) this.footprints.track(player.pos, player.yaw, this.world.grid.cellAt(player.pos.x, player.pos.z), player.crouch);
      this.footprints.update(dt);
    }
    // Blizzard gusts shorten every guard's sight and frost the screen edges.
    const gust = this.snow.gust;
    this.visionMul = (this.level.visionMul ?? 1) * (1 - gust * 0.45);
    this.gfx.postUniforms.uFrost.value = Math.min(1, (this.look?.frost ?? 0) + gust * 0.6);
    act.updateChoke(this, dt);
    act.updateCarry(this);
    this.updateInteraction();

    const ctx = this.enemyCtx();
    for (const g of this.guards) {
      g.update(dt, ctx);
      g.showCone = this.settings.cones;
      if (g.cone && g.active && g.showCone) {
        g.cone.setColor(g.state === 'alert' ? 0xff3020 : g.state === 'suspicious' || g.state === 'search' ? 0xffd040 : 0xbfe8ff, 0.28);
        g.cone.update(this.world.grid, g.pos, g.yaw, 0.55, 9 * this.visionMul, g.pos.y);
      }
      g.shadow.position.set(g.pos.x, g.pos.y + 0.03, g.pos.z);
      g.shadow.visible = !g.carried;
      this.updateIcon(g);
    }
    for (const c of this.cameras) { c.update(dt, ctx); c.cone.visible = c.cone.visible && this.settings.cones; }
    for (const d of this.drones) d.update(dt, ctx);
    for (const b of this.bosses) if (this.bossActive || b.dead) b.update(dt, this);
    for (const n of this.npcs) {
      n.update(dt, { grid: this.world.grid, player, lights: this.lights, ambientLight: this.ambientLight, onSeenByFamily: () => this.fail('seen_by_family'), onGlanceWarn: (npc) => this.level.script?.onGlance?.(this, npc) });
      if (n.shadow) { n.shadow.position.set(n.pos.x, n.pos.y + 0.03, n.pos.z); n.shadow.visible = !n.hidden; }
    }
    for (const d of this.doors) d.update(dt, this);
    for (const p of this.pickups) this.updatePickup(p, dt);
    this.updateTriggers();
    this.alarm.update(dt);
    this.tickTimers(dt);
    this.level.script?.update?.(this, dt);
    if (player.health < 25 && Math.floor(this.time * 1.1) !== Math.floor((this.time - dt) * 1.1)) audio.play('heartbeat', { volume: 0.5 });
  }

  /** While a cutscene plays: the world keeps living but the player waits. */
  updateCutscene(dt) {
    this.cutscene.update(dt);
    this.tickTimers(dt);
    for (const d of this.doors) d.update(dt, this);
  }

  updateDying(dt) {
    this.player.update(dt, this.world.grid, { move: new THREE.Vector2(), basis: this.cam.basis(), aim: false });
    this.cam.update(dt, this.player.pos, { grid: this.world.grid });
    this.tickTimers(dt);
  }
}

Object.assign(Game.prototype, playHelpers);

export { materialFor };
