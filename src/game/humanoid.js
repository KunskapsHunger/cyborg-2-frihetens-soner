import { findPart } from '../engine/assets.js';

// Procedural animation for segmented (rigid-part) humanoids.
// Rig: hips > torso > head / arm_l > forearm_l / arm_r > forearm_r,
//      hips > leg_l > shin_l / leg_r > shin_r. Model faces +Z.
// Sign conventions (rotation about local X): negative swings a hanging limb
// forward, positive tilts the torso forward, positive bends the knee back.

const PARTS = ['hips', 'torso', 'head', 'arm_l', 'forearm_l', 'arm_r', 'forearm_r', 'leg_l', 'shin_l', 'leg_r', 'shin_r'];
const ZERO = () => ({ x: 0, y: 0, z: 0 });

export class Humanoid {
  constructor(root) {
    this.root = root;
    this.parts = {};
    for (const n of PARTS) {
      const o = findPart(root, n);
      if (o) this.parts[n] = { o, base: o.rotation.clone(), basePos: o.position.clone(), cur: ZERO() };
    }
    this.phase = Math.random() * 6;
    this.hipDrop = 0;
    this.t = Math.random() * 10;
  }

  /**
   * @param {number} dt
   * @param {object} s  { speed (m/s), crouch 0..1, aim 0..1, choke 0..1, carry 0..1,
   *                      sit 0..1, talk 0..1, reach 0..1, hurt 0..1, lookYaw,
   *                      handsUp 0..1, sing 0..1, hug 0..1, kneel 0..1 }
   */
  update(dt, s = {}) {
    this.t += dt;
    const speed = s.speed ?? 0;
    const crouch = s.crouch ?? 0;
    const move = Math.min(1, speed / 3);
    this.phase += dt * (speed > 0.1 ? 3.2 + speed * 1.3 : 0);
    const p = this.phase;
    const sw = Math.sin(p);
    const run = Math.max(0, Math.min(1, (speed - 3.5) / 2));
    const legA = (0.55 + run * 0.35) * move * (1 - crouch * 0.4);
    const breathe = Math.sin(this.t * 1.6) * 0.03;
    const T = {};
    const set = (n, x = 0, y = 0, z = 0) => { T[n] = { x, y, z }; };

    // Legs
    set('leg_l', -sw * legA - crouch * 1.05 - (s.sit ?? 0) * 1.5);
    set('leg_r', sw * legA - crouch * 1.05 - (s.sit ?? 0) * 1.5);
    set('shin_l', Math.max(0, -Math.cos(p)) * legA * 1.3 + crouch * 1.5 + (s.sit ?? 0) * 1.5);
    set('shin_r', Math.max(0, Math.cos(p)) * legA * 1.3 + crouch * 1.5 + (s.sit ?? 0) * 1.5);
    // Torso & head
    set('torso', breathe + crouch * 0.35 + run * 0.18 + (s.carry ?? 0) * 0.15 + (s.hurt ?? 0) * 0.3, Math.sin(p) * 0.05 * move);
    set('head', -crouch * 0.2 - run * 0.1 + (s.look ?? 0), s.lookYaw ?? 0);
    // Arms: swing, then layer aim / choke / carry / talk / reach.
    let al = sw * 0.45 * move, ar = -sw * 0.45 * move;
    let fl = -0.15 - run * 0.9, fr = -0.15 - run * 0.9;
    let alz = 0, arz = 0;
    const aim = s.aim ?? 0, choke = s.choke ?? 0, carry = s.carry ?? 0, talk = s.talk ?? 0, reach = s.reach ?? 0;
    ar = mix(ar, -1.5, aim); fr = mix(fr, 0, aim);
    al = mix(al, -1.25, aim); fl = mix(fl, -0.35, aim); alz = mix(alz, -0.35, aim);
    al = mix(al, -1.35, choke); ar = mix(ar, -1.35, choke); fl = mix(fl, -1.1, choke); fr = mix(fr, -1.1, choke);
    alz = mix(alz, -0.5, choke); arz = mix(arz, 0.5, choke);
    al = mix(al, -1.0, carry); ar = mix(ar, -1.0, carry); fl = mix(fl, -0.7, carry); fr = mix(fr, -0.7, carry);
    const g = Math.sin(this.t * 4.3) * 0.25;
    ar = mix(ar, -0.7 + g, talk); fr = mix(fr, -0.9 - g, talk);
    ar = mix(ar, -1.2, reach); fr = mix(fr, -0.2, reach);
    // Cutscene / sequel poses: hands up, singing (hands folded), hug, kneel.
    const up = s.handsUp ?? 0, sing = s.sing ?? 0, hug = s.hug ?? 0, kneel = s.kneel ?? 0;
    al = mix(al, -2.9, up); ar = mix(ar, -2.9, up); fl = mix(fl, -0.4, up); fr = mix(fr, -0.4, up);
    alz = mix(alz, -0.25, up); arz = mix(arz, 0.25, up);
    al = mix(al, -0.55, sing); ar = mix(ar, -0.55, sing); fl = mix(fl, -1.3, sing); fr = mix(fr, -1.3, sing);
    alz = mix(alz, 0.35, sing); arz = mix(arz, -0.35, sing);
    al = mix(al, -1.2, hug); ar = mix(ar, -1.2, hug); fl = mix(fl, -1.0, hug); fr = mix(fr, -1.0, hug);
    alz = mix(alz, 0.55, hug); arz = mix(arz, -0.55, hug);
    if (kneel > 0) {
      T.leg_l.x = mix(T.leg_l.x, -1.5, kneel); T.shin_l.x = mix(T.shin_l.x, 1.5, kneel);
      T.leg_r.x = mix(T.leg_r.x, 0.1, kneel); T.shin_r.x = mix(T.shin_r.x, 1.6, kneel);
      T.torso.x += 0.15 * kneel;
    }
    set('arm_l', al, 0, alz);
    set('arm_r', ar, 0, arz);
    set('forearm_l', fl);
    set('forearm_r', fr);

    // Blend towards targets and apply.
    const k = Math.min(1, dt * 12);
    for (const [n, part] of Object.entries(this.parts)) {
      const t = T[n] ?? ZERO();
      part.cur.x += (t.x - part.cur.x) * k;
      part.cur.y += (t.y - part.cur.y) * k;
      part.cur.z += (t.z - part.cur.z) * k;
      part.o.rotation.set(part.base.x + part.cur.x, part.base.y + part.cur.y, part.base.z + part.cur.z);
    }
    const drop = crouch * 0.42 + (s.sit ?? 0) * 0.5 + (s.kneel ?? 0) * 0.45 - Math.abs(Math.cos(p)) * 0.04 * move;
    this.hipDrop += (drop - this.hipDrop) * k;
    const hips = this.parts.hips;
    if (hips) hips.o.position.y = hips.basePos.y - this.hipDrop;
  }
}

function mix(a, b, t) {
  return a + (b - a) * t;
}
