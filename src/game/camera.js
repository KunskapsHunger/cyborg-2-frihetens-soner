import * as THREE from 'three';
import { sharedUniforms } from '../engine/material.js';

// MGS1-style elevated third-person camera that trails the player, plus a
// first-person aiming mode. Updates the cutaway uniforms every frame.

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.targetYaw = 0;
    this.pitch = 0.95;
    this.dist = 9.5;
    this.target = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.fp = 0;
    this.fpYaw = 0;
    this.fpPitch = 0;
    this.shake = 0;
  }

  snap(target, yaw) {
    this.yaw = this.targetYaw = yaw;
    this.target.copy(target);
    this.fp = 0;
    this.compute(1);
  }

  compute(k) {
    const cp = Math.cos(this.pitch);
    const want = new THREE.Vector3(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
    this.pos.lerp(want, k);
  }

  /**
   * @param {THREE.Vector3} focus  player feet position
   * @param {object} opts { fp: bool, eye: Vector3, grid, mouseX }
   */
  update(dt, focus, { fp = false, eye = null, grid = null } = {}) {
    let d = this.targetYaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * 4);
    this.target.lerp(new THREE.Vector3(focus.x, focus.y + 1.0, focus.z), Math.min(1, dt * 8));
    this.compute(Math.min(1, dt * 6));
    // Pull in when the elevated position would be inside a very tall wall.
    if (grid) {
      const floorY = grid.floorAt(this.pos.x, this.pos.z);
      if (floorY === -Infinity) this.pos.y = Math.max(this.pos.y, this.target.y + 2);
    }
    this.fp += ((fp ? 1 : 0) - this.fp) * Math.min(1, dt * 10);
    const cam = this.camera;
    if (this.fp > 0.5 && eye) {
      cam.position.copy(eye);
      cam.rotation.set(this.fpPitch, this.fpYaw, 0, 'YXZ');
    } else {
      cam.position.copy(this.pos);
      cam.lookAt(this.target);
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2);
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.3;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.3;
    }
    cam.updateMatrixWorld();
    // Cutaway around the player (disabled in first person).
    sharedUniforms.uCutCam.value.copy(cam.position);
    if (this.fp > 0.5) sharedUniforms.uCutTarget.value.set(0, 9999, 0);
    else sharedUniforms.uCutTarget.value.set(focus.x, focus.y, focus.z);
  }

  /** Unit vectors for movement relative to the view. */
  basis() {
    const yaw = this.fp > 0.5 ? this.fpYaw : this.yaw;
    return {
      forward: new THREE.Vector2(-Math.sin(yaw), -Math.cos(yaw)),
      right: new THREE.Vector2(Math.cos(yaw), -Math.sin(yaw)),
    };
  }
}
