// The world coming apart (chapter 6, "Glitchen"). Samordnaren's simulation
// shows its seams: random chunks of the level flicker into the cyan
// wireframe of CYBÖRG's training grid, and the picture tears. Scripts set
// `game.sys.glitch.level` (0..1); game.glitchPulse() adds short spikes.

export class Glitch {
  constructor() {
    this.level = 0;
    this.meshes = [];
    this.flipT = 0;
  }

  load(game, world) {
    this.level = game.level.glitch ?? 0;
    this.meshes = [];
    world.root.traverse((o) => { if (o.isMesh && o.material?.uniforms) this.meshes.push({ o, mat: o.material }); });
    this.flipped = new Set();
  }

  clear() {
    for (const m of this.flipped ?? []) this.restore(m);
    for (const m of this.meshes) m.wire?.dispose();
    this.meshes = [];
    this.level = 0;
  }

  restore(m) {
    m.o.material = m.mat;
    this.flipped.delete(m);
  }

  flip(m) {
    // A wireframe copy glowing like the simulation grid, built once per mesh
    // (it keeps the shared light uniforms).
    if (!m.wire) {
      m.wire = Object.assign(m.mat.clone(), { wireframe: true });
      m.wire.uniforms = { ...m.mat.uniforms, uLit: { value: 0 }, uColor: { value: m.mat.uniforms.uColor.value.clone().setRGB(0.3, 0.95, 1.1) }, uHasMap: { value: 0 } };
    }
    m.o.material = m.wire;
    this.flipped.add(m);
  }

  update(game, dt) {
    const post = game.gfx.postUniforms;
    game.glitchT = Math.max(0, (game.glitchT ?? 0) - dt);
    const pulse = game.glitchT > 0 ? game.glitchAmt ?? 0 : 0;
    post.uGlitch.value = Math.min(1, this.level * 0.35 + pulse);
    if (this.level <= 0 || !this.meshes.length) {
      if (this.flipped?.size) for (const m of [...this.flipped]) this.restore(m);
      return;
    }
    this.flipT -= dt;
    if (this.flipT > 0) return;
    this.flipT = 0.08 + Math.random() * (0.6 - this.level * 0.4);
    for (const m of [...this.flipped]) if (Math.random() < 0.6) this.restore(m);
    const n = Math.ceil(this.meshes.length * this.level * 0.12);
    for (let i = 0; i < n; i++) this.flip(this.meshes[Math.floor(Math.random() * this.meshes.length)]);
    if (Math.random() < this.level * 0.15) game.glitchPulse(0.3 + this.level * 0.4, 0.15);
  }
}
