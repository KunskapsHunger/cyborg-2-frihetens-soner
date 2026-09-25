import * as THREE from 'three';

// Global alert state machine, MGS style:
//   normal → ALERT (someone has eyes on Henrik)
//          → EVASION (lost him; searching, countdown)
//          → CAUTION (heightened patrols, countdown) → normal

export const PHASE = { NORMAL: 'normal', ALERT: 'alert', EVASION: 'evasion', CAUTION: 'caution' };

const EVASION_TIME = 20;
const CAUTION_TIME = 40;
const LOSE_SIGHT = 4;

export class Alarm {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = PHASE.NORMAL;
    this.timer = 0;
    this.sinceSeen = 0;
    this.lastKnown = new THREE.Vector3();
    this.seenThisFrame = false;
    this.count = 0;
    this.onPhase = null;
  }

  /** Someone saw the player right now. */
  spotted(pos) {
    this.lastKnown.copy(pos);
    this.seenThisFrame = true;
    if (this.phase !== PHASE.ALERT) {
      this.count += 1;
      this.set(PHASE.ALERT);
    }
  }

  /** Something suspicious (a body, a disabled camera) raises caution. */
  raiseCaution(pos) {
    if (this.phase === PHASE.NORMAL) {
      this.lastKnown.copy(pos);
      this.set(PHASE.CAUTION);
      this.timer = CAUTION_TIME;
    }
  }

  set(phase) {
    const prev = this.phase;
    this.phase = phase;
    if (phase === PHASE.EVASION) this.timer = EVASION_TIME;
    if (phase === PHASE.CAUTION) this.timer = CAUTION_TIME;
    this.sinceSeen = 0;
    if (prev !== phase) this.onPhase?.(phase, prev);
  }

  update(dt) {
    if (this.phase === PHASE.ALERT) {
      this.sinceSeen = this.seenThisFrame ? 0 : this.sinceSeen + dt;
      if (this.sinceSeen > LOSE_SIGHT) this.set(PHASE.EVASION);
    } else if (this.phase === PHASE.EVASION || this.phase === PHASE.CAUTION) {
      this.timer -= dt;
      if (this.timer <= 0) this.set(this.phase === PHASE.EVASION ? PHASE.CAUTION : PHASE.NORMAL);
    }
    this.seenThisFrame = false;
  }

  get hunting() { return this.phase === PHASE.ALERT; }
  get searching() { return this.phase === PHASE.EVASION; }
  get jammed() { return this.phase === PHASE.ALERT || this.phase === PHASE.EVASION; }
}
