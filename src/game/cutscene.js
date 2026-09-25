import * as THREE from 'three';
import { audio } from '../engine/audio.js';
import { voice } from '../engine/voice.js';
import { cutsceneVoiceId } from '../engine/voiceIds.js';
import { CUTSCENES } from '../story/cutscenes.js';
import { spawnNPC } from './npc.js';
import { sharedUniforms } from '../engine/material.js';

// In-engine cutscenes (MGS2 style). A cutscene (src/story/cutscenes.js) is a
// list of beats written as direction: a shot type, stage actions and one
// line. The level provides the stage: where each actor stands, named marks
// and props, and an establishing view. This player spawns the actors, frames
// every shot from their positions (with a slow drift), drives letterbox and
// depth of field, and plays the voiced lines as subtitles.
//
// Stage format (level.stages[scene]):
//   { actors: { henrik: { x, z, rot, model?, pose? } }, marks: { mark_a: [x, z] },
//     props: { bomb: [x, y, z] }, establish: { pos: [x, y, z], look: [x, y, z] } }

export const ACTOR_MODELS = {
  henrik: 'henrik2', atta: 'atta', sara: 'sara2', kall: 'kall', astrom: 'astrom', maja: 'maja2',
  elsa: 'elsa_lucia', vargen: 'vargen', reader: 'reader', guard1: 'sons_guard', guard2: 'sons_guard',
  police1: 'police', hostage1: 'civilian2', hostage2: 'civilian2', hostage3: 'civilian2',
};

const HEAD = 1.6;
const up = (v, y) => new THREE.Vector3(v.x, v.y + y, v.z);

export class CutscenePlayer {
  constructor(game) {
    this.game = game;
    this.active = null;
  }

  get playing() { return !!this.active; }

  /** Play a cutscene by id. Resolves (and calls onDone) when it ends or is skipped. */
  async play(id, onDone) {
    const g = this.game;
    // Only one cutscene at a time: a new one ends the current (its onDone still fires).
    if (this.active) this.finish();
    const token = (this.seq = (this.seq ?? 0) + 1);
    const cs = CUTSCENES[id];
    // A level may stage one cutscene differently from others in the same scene.
    const stage = g.level?.stages?.[id] ?? g.level?.stages?.[cs?.scene];
    if (!cs || !stage) {
      console.warn(`[cutscene] missing ${!cs ? 'cutscene' : 'stage'} for ${id}`);
      onDone?.();
      return;
    }
    // Decode every line before the first beat, so no clip starts late and gets cut
    // off by the next beat (give up waiting after a few seconds on slow links).
    const ids = cs.beats.map((b, i) => (b.line ? cutsceneVoiceId(id, i) : null)).filter(Boolean);
    const loaded = voice.preload(ids);
    const actors = new Map();
    await Promise.all([loaded, ...(cs.actors ?? []).map(async (name) => {
      const spot = stage.actors?.[name] ?? { x: g.player.pos.x, z: g.player.pos.z };
      const npc = await spawnNPC({ id: name, model: spot.model ?? ACTOR_MODELS[name] ?? 'civilian2', x: spot.x, z: spot.z, y: spot.y, rot: spot.rot ?? 0, pose: spot.pose, tint: spot.tint }, g.world, g.actors);
      actors.set(name, npc);
    })].map((p) => Promise.race([p, new Promise((r) => setTimeout(r, 4000))])));
    if (token !== this.seq || this.active) {
      // Superseded while loading: drop our actors and let our caller continue.
      for (const npc of actors.values()) g.actors.remove(npc.obj);
      onDone?.();
      return;
    }
    this.active = { id, cs, stage, actors, beat: -1, t: 0, dur: 0, onDone, cam: null };
    g.player.obj.visible = false;
    g.player.shadow && (g.player.shadow.visible = false);
    g.hud.subQueue = [];
    g.hud.subtitle = null;
    this.next();
  }

  actor(name) { return this.active?.actors.get(name) ?? null; }

  mark(name) {
    const m = this.active.stage.marks?.[name];
    return m ? new THREE.Vector3(m[0], 0, m[1]) : null;
  }

  next() {
    const a = this.active;
    a.beat += 1;
    if (a.beat >= a.cs.beats.length) { this.finish(); return; }
    const beat = a.cs.beats[a.beat];
    for (const act of beat.act ?? []) this.perform(act);
    if (beat.sfx) audio.play(beat.sfx, { volume: 0.9 });
    if (beat.music) audio.playMusic(beat.music, 1.5);
    a.t = 0;
    a.cam = this.frame(beat.shot ?? 'wide');
    // Place/time caption ("M/S FRIHETEN, KATTEGATT …").
    if (beat.text) this.game.hud.caption = { text: beat.text, time: Math.max(3.5, beat.hold ?? 3), max: Math.max(3.5, beat.hold ?? 3) };
    const line = beat.line;
    if (line) {
      const vid = cutsceneVoiceId(a.id, a.beat);
      const voiced = voice.has(vid);
      const dur = voiced ? voice.duration(vid) : Math.max(2, line.text.length * 0.062);
      const hold = beat.hold ?? 0;
      a.drift = hold + dur + 0.5;
      // A voiced beat lasts until its clip has actually finished (plus a breath);
      // the extra seconds are only a safety net if audio never reports the end.
      a.dur = voiced ? a.drift + 3 : a.drift;
      this.game.hud.subtitle = { who: line.who, text: line.text, inner: !!line.inner, time: 1e9, cinema: true };
      const beatIndex = a.beat;
      if (voiced) voice.play(vid, { onEnd: () => { if (this.active === a && a.beat === beatIndex) a.dur = Math.min(a.dur, a.t + hold + 0.45); } });
      else voice.stop();
      const speaker = this.actor(line.who);
      if (speaker) speaker.talking = dur;
    } else {
      a.dur = beat.hold ?? 2.5;
      a.drift = a.dur;
      this.game.hud.subtitle = null;
    }
  }

  perform(act) {
    const [name, verb, arg] = act.split(':');
    const npc = this.actor(name);
    if (!npc) return;
    switch (verb) {
      case 'walk':
      case 'run': {
        const m = this.mark(arg);
        if (npc.pose === 'sit' || npc.pose === 'kneel' || npc.pose === 'crouch') npc.pose = 'idle';
        if (m) npc.walk([[m.x, m.z]], verb === 'run' ? 4 : 1.4);
        break;
      }
      case 'turn': {
        const other = this.actor(arg);
        if (other) npc.lookAt = other.pos;
        break;
      }
      case 'pose': npc.pose = arg; break;
      case 'hide': npc.setHidden(true); break;
      case 'show': npc.setHidden(false); break;
      case 'fall': npc.pose = 'lie'; audio.play('body_fall', { pos: npc.pos, volume: 0.8 }); break;
      default:
    }
  }

  /** Camera {from, to, look, lookTo, fov, focus} for a shot type. */
  frame(shot) {
    const a = this.active;
    const [kind, arg = ''] = shot.split(':');
    const who = (n) => this.actor(n);
    const face = (npc) => new THREE.Vector3(Math.sin(npc.yaw), 0, Math.cos(npc.yaw));
    const side = (v) => new THREE.Vector3(v.z, 0, -v.x);
    const centroid = () => {
      const c = new THREE.Vector3();
      let n = 0;
      for (const npc of a.actors.values()) if (!npc.hidden) { c.add(npc.pos); n++; }
      return n ? c.divideScalar(n) : this.game.player.pos.clone();
    };
    const shotFrom = (pos, look, fov, drift) => ({
      from: pos, to: pos.clone().add(drift ?? new THREE.Vector3()), look, lookTo: look.clone(), fov, focus: pos.distanceTo(look),
    });
    const target = who(arg.split(/[,>]/)[0]);
    switch (kind) {
      case 'establish': {
        const e = a.stage.establish;
        if (e) {
          const from = new THREE.Vector3(...e.pos), look = new THREE.Vector3(...e.look);
          return { ...shotFrom(from, look, e.fov ?? 50, from.clone().sub(look).normalize().multiplyScalar(-2)), focus: 30 };
        }
        const c = centroid();
        return { ...shotFrom(up(c, 9).add(new THREE.Vector3(-12, 0, 12)), up(c, 1), 50, new THREE.Vector3(2, -1, -2)), focus: 30 };
      }
      case 'close':
      case 'medium':
      case 'low':
      case 'high':
      case 'pov': {
        if (!target) return this.frame('wide');
        const f = face(target);
        const s = side(f);
        if (target.pose === 'lie' || target.pose === 'dead') {
          // Lying models are rotated back about the feet: the head is behind them, near the ground.
          const head = up(target.pos, 0.3).addScaledVector(f, -1.5);
          const dist = kind === 'close' ? 1.3 : 2.4;
          return shotFrom(head.clone().addScaledVector(s, dist * 0.6).addScaledVector(f, dist * 0.4).setY(head.y + dist * 0.7), head, kind === 'close' ? 34 : 44, s.clone().multiplyScalar(0.12));
        }
        const low = { crouch: 1.1, kneel: 1.1, sit: 1.15 }[target.pose];
        const head = up(target.pos, (low ?? HEAD) * (target.def.model === 'elsa_lucia' ? 0.72 : 1));
        if (kind === 'close') return shotFrom(head.clone().addScaledVector(f, 1.4).addScaledVector(s, 0.35).setY(head.y + 0.05), head, 32, s.clone().multiplyScalar(0.15));
        if (kind === 'medium') return shotFrom(head.clone().addScaledVector(f, 2.8).addScaledVector(s, 0.6).setY(head.y - 0.1), up(target.pos, 1.3), 42, s.clone().multiplyScalar(0.25));
        if (kind === 'low') return shotFrom(up(target.pos, 0.35).addScaledVector(f, 2.4).addScaledVector(s, 0.5), head, 48, new THREE.Vector3(0, 0.15, 0));
        if (kind === 'high') return shotFrom(up(target.pos, 7).addScaledVector(f, 2).addScaledVector(s, 1.5), up(target.pos, 0.8), 45, new THREE.Vector3(0, 0.8, 0));
        return shotFrom(head.clone().addScaledVector(f, 0.3), head.clone().addScaledVector(f, 6), 60);
      }
      case 'two': {
        const [n1, n2] = arg.split(',');
        const p1 = who(n1), p2 = who(n2);
        if (!p1 || !p2) return this.frame(`medium:${n1}`);
        const mid = p1.pos.clone().add(p2.pos).multiplyScalar(0.5);
        const ab = p2.pos.clone().sub(p1.pos);
        const d = Math.max(1, ab.length());
        const s = side(ab.normalize());
        return shotFrom(up(mid, 1.55).addScaledVector(s, d * 1.1 + 1.8), up(mid, 1.4), 42, ab.clone().multiplyScalar(0.3));
      }
      case 'ots': {
        const [n1, n2] = arg.split('>');
        const p1 = who(n1), p2 = who(n2);
        if (!p1 || !p2) return this.frame(`close:${n2 || n1}`);
        const dir = p2.pos.clone().sub(p1.pos).setY(0).normalize();
        const s = side(dir);
        return shotFrom(up(p1.pos, 1.72).addScaledVector(dir, -0.7).addScaledVector(s, -0.45), up(p2.pos, HEAD - 0.05), 38, s.clone().multiplyScalar(-0.1));
      }
      case 'track': {
        if (!target) return this.frame('wide');
        return { track: target, fov: 45, focus: 5 };
      }
      case 'insert': {
        const p = a.stage.props?.[arg];
        if (!p) return this.frame('wide');
        const at = new THREE.Vector3(...p);
        return shotFrom(at.clone().add(new THREE.Vector3(0.6, 0.35, 0.6)), at, 30, new THREE.Vector3(-0.1, 0, 0.05));
      }
      default: {
        const c = centroid();
        return shotFrom(up(c, 3.2).add(new THREE.Vector3(-5, 0, 6)), up(c, 1.2), 48, new THREE.Vector3(0.6, 0, -0.4));
      }
    }
  }

  update(dt) {
    const a = this.active;
    if (!a) return;
    const g = this.game;
    a.t += dt;
    const post = g.gfx.postUniforms;
    post.uLetterbox.value = Math.min(1, post.uLetterbox.value + dt * 2);
    const ctx = { grid: g.world.grid };
    for (const npc of a.actors.values()) npc.update(dt, ctx);

    // Camera: ease along the shot's drift.
    const c = a.cam;
    const cam = g.camera;
    if (c.track) {
      const t = c.track;
      const f = new THREE.Vector3(Math.sin(t.yaw), 0, Math.cos(t.yaw));
      const want = up(t.pos, 1.7).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), 3).addScaledVector(f, 1);
      cam.position.lerp(want, Math.min(1, dt * 3));
      cam.lookAt(up(t.pos, 1.3));
    } else {
      const k = Math.min(1, a.t / Math.max(1, a.drift ?? a.dur));
      const e = k * k * (3 - 2 * k);
      cam.position.lerpVectors(c.from, c.to, e);
      cam.lookAt(c.look);
    }
    cam.fov += ((c.fov ?? 45) - cam.fov) * Math.min(1, dt * 6);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    sharedUniforms.uCutTarget.value.set(0, 9999, 0);
    post.uDofOn.value = 1;
    post.uFocus.value = c.focus ?? 5;
    post.uFocusRange.value = Math.max(2, (c.focus ?? 5) * 0.6);

    const skipAll = g.input.wasPressed('Escape');
    const next = g.input.anyPressed('Enter', 'Space', 'KeyE') || g.input.mousePressed[0];
    if (skipAll) { this.finish(); return; }
    if ((next && a.t > 0.3) || a.t >= a.dur) this.next();
  }

  finish() {
    const a = this.active;
    if (!a) return;
    const g = this.game;
    this.active = null;
    voice.stop();
    for (const npc of a.actors.values()) {
      g.actors.remove(npc.obj);
      npc.cone?.dispose?.();
    }
    const post = g.gfx.postUniforms;
    post.uLetterbox.value = 0;
    post.uDofOn.value = 0;
    g.camera.fov = 60;
    g.camera.updateProjectionMatrix();
    g.hud.subtitle = null;
    g.player.obj.visible = !g.player.hidden;
    if (g.player.shadow) g.player.shadow.visible = !g.player.hidden;
    g.cam.snap(g.player.pos, g.cam.yaw);
    a.onDone?.();
  }
}
