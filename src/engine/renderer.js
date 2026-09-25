import * as THREE from 'three';
import { sharedUniforms } from './material.js';

// PS2-era frame pipeline. The world renders into a multisampled HDR target at
// an internal resolution (448 lines by default) with a depth texture. Post:
//   bright pass → 3-level blurred bloom chain, a half-res blurred copy for
//   depth of field, then one composite pass that does DoF, bloom, filmic tone
//   mapping, colour grading, frame blending (PS2 "ghosting"), frost, glitch,
//   damage, grain, vignette and cinema letterbox, upscaled bilinearly.

export const INTERNAL_HEIGHT = 448;

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const brightFragment = /* glsl */ `
  uniform sampler2D tSrc;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb;
    float l = max(max(c.r, c.g), c.b);
    gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.6, l), 1.0);
  }
`;

const blurFragment = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
    c += texture2D(tSrc, vUv + uDir * 1.3846).rgb * 0.316216;
    c += texture2D(tSrc, vUv - uDir * 1.3846).rgb * 0.316216;
    c += texture2D(tSrc, vUv + uDir * 3.2308).rgb * 0.070270;
    c += texture2D(tSrc, vUv - uDir * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const copyFragment = /* glsl */ `
  uniform sampler2D tSrc;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(tSrc, vUv); }
`;

const compositeFragment = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tDepth;
  uniform sampler2D tBloom1;
  uniform sampler2D tBloom2;
  uniform sampler2D tBloom3;
  uniform sampler2D tSoft;
  uniform sampler2D tPrev;
  uniform sampler2D tFrost;
  uniform vec2 uRes;
  uniform float uNear;
  uniform float uFar;
  uniform float uExposure;
  uniform float uBloom;
  uniform vec3 uLift;
  uniform vec3 uGamma3;
  uniform vec3 uGain;
  uniform float uSaturation;
  uniform float uGamma;
  uniform float uNoise;
  uniform float uVignette;
  uniform float uLetterbox;
  uniform float uGhost;
  uniform float uFrost;
  uniform float uGlitch;
  uniform float uDamage;
  uniform float uToxic;
  uniform float uFade;
  uniform float uTime;
  uniform float uDofOn;
  uniform float uFocus;
  uniform float uFocusRange;
  uniform float uHasPrev;
  uniform float uHasFrost;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  float linearDepth(float z) {
    float ndc = z * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
  }

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    // Letterbox bars for cutscenes.
    float bar = uLetterbox * 0.12;
    if (uv.y < bar || uv.y > 1.0 - bar) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

    // Glitch: torn blocks, row jitter and colour split.
    vec2 guv = uv;
    float split = 0.0;
    if (uGlitch > 0.0) {
      float t = floor(uTime * 12.0);
      vec2 block = floor(uv * vec2(6.0, 18.0));
      float h = hash(block + t);
      if (h < uGlitch * 0.35) guv.x += (hash(block * 1.7 + t) - 0.5) * 0.18 * uGlitch;
      float row = floor(uv.y * 90.0);
      if (hash(vec2(row, t)) < uGlitch * 0.12) guv.x += (hash(vec2(t, row)) - 0.5) * 0.06;
      split = uGlitch * 0.012 * (0.5 + hash(vec2(t, 3.0)));
    }

    vec3 c = texture2D(tScene, guv).rgb;
    if (split > 0.0) {
      c.r = texture2D(tScene, guv + vec2(split, 0.0)).r;
      c.b = texture2D(tScene, guv - vec2(split, 0.0)).b;
    }

    // Depth of field (cutscenes): blend towards the soft copy away from focus.
    if (uDofOn > 0.0) {
      float d = linearDepth(texture2D(tDepth, guv).r);
      float coc = clamp(abs(d - uFocus) / uFocusRange - 0.35, 0.0, 1.0);
      c = mix(c, texture2D(tSoft, guv).rgb, coc * uDofOn);
    }

    c += (texture2D(tBloom1, guv).rgb * 0.5 + texture2D(tBloom2, guv).rgb * 0.8 + texture2D(tBloom3, guv).rgb * 1.1) * uBloom;
    c *= uExposure;
    c = aces(c);

    // Lift / gamma / gain grading and saturation.
    c = pow(max(c * uGain + uLift * (1.0 - c), vec3(0.0)), 1.0 / uGamma3);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, uSaturation);

    if (uHasPrev > 0.5 && uGhost > 0.0) c = mix(c, texture2D(tPrev, uv).rgb, uGhost);

    vec2 d = uv - 0.5;
    float vig = dot(d, d);
    c *= 1.0 - vig * uVignette;
    if (uHasFrost > 0.5 && uFrost > 0.0) {
      vec4 f = texture2D(tFrost, uv);
      c = mix(c, vec3(0.85, 0.92, 1.0), f.a * uFrost * smoothstep(0.08, 0.3, vig));
    }
    c = mix(c, vec3(c.r * 0.6 + c.g * 0.3, c.g * 1.1, c.b * 0.5), uToxic * 0.5);
    c = mix(c, vec3(0.6, 0.0, 0.0), clamp(uDamage * (0.3 + vig * 3.0), 0.0, 0.8));
    c += (hash(uv * uRes + fract(uTime) * 91.0) - 0.5) * uNoise;
    if (uGlitch > 0.0) c += step(0.985 - uGlitch * 0.03, hash(vec2(floor(uv.y * 240.0), floor(uTime * 30.0)))) * 0.25;
    c *= 1.0 - uFade;
    c = pow(max(c, vec3(0.0)), vec3(uGamma));
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

function makeTarget(w, h, opts = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
    depthBuffer: false,
    ...opts,
  });
}

export class Renderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.scene = makeTarget(4, 4, { depthBuffer: true, samples: 4, depthTexture: new THREE.DepthTexture(4, 4) });
    this.bright = makeTarget(4, 4);
    this.chain = [makeTarget(4, 4), makeTarget(4, 4), makeTarget(4, 4)];
    this.tmp = [makeTarget(4, 4), makeTarget(4, 4), makeTarget(4, 4)];
    this.soft = makeTarget(4, 4);
    this.softTmp = makeTarget(4, 4);
    // Ping-pong pair for frame blending (a pass cannot read its own target).
    this.prev = [makeTarget(4, 4, { type: THREE.UnsignedByteType }), makeTarget(4, 4, { type: THREE.UnsignedByteType })];
    this.hasPrev = false;

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    const pass = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: fullscreenVertex, fragmentShader, depthTest: false, depthWrite: false });
    this.brightMat = pass(brightFragment, { tSrc: { value: null }, uThreshold: { value: 0.9 } });
    this.blurMat = pass(blurFragment, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.copyMat = pass(copyFragment, { tSrc: { value: null } });

    this.postUniforms = {
      tScene: { value: this.scene.texture },
      tDepth: { value: this.scene.depthTexture },
      tBloom1: { value: this.chain[0].texture },
      tBloom2: { value: this.chain[1].texture },
      tBloom3: { value: this.chain[2].texture },
      tSoft: { value: this.soft.texture },
      tPrev: { value: this.prev[0].texture },
      tFrost: { value: null },
      uRes: { value: new THREE.Vector2(4, 4) },
      uNear: { value: 0.1 },
      uFar: { value: 200 },
      uExposure: { value: 1.25 },
      uBloom: { value: 0.35 },
      uLift: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
      uGamma3: { value: new THREE.Vector3(1, 1, 1) },
      uGain: { value: new THREE.Vector3(1, 1, 1) },
      uSaturation: { value: 0.9 },
      uGamma: { value: 0.85 },
      uNoise: { value: 0.02 },
      uVignette: { value: 0.9 },
      uLetterbox: { value: 0 },
      uGhost: { value: 0 },
      uFrost: { value: 0 },
      uGlitch: { value: 0 },
      uDamage: { value: 0 },
      uToxic: { value: 0 },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uDofOn: { value: 0 },
      uFocus: { value: 5 },
      uFocusRange: { value: 4 },
      uHasPrev: { value: 0 },
      uHasFrost: { value: 0 },
    };
    this.compositeMat = pass(compositeFragment, this.postUniforms);

    this.internalHeight = INTERNAL_HEIGHT;
    this.width = 4;
    this.height = 4;
    this.resize();
  }

  setFrostTexture(tex) {
    this.postUniforms.tFrost.value = tex;
    this.postUniforms.uHasFrost.value = tex ? 1 : 0;
  }

  setInternalHeight(h) {
    this.internalHeight = h;
    this.resize();
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;
    this.scene.setSize(w, h);
    this.bright.setSize(w >> 1, h >> 1);
    this.soft.setSize(w >> 1, h >> 1);
    this.softTmp.setSize(w >> 1, h >> 1);
    for (const t of this.prev) t.setSize(w, h);
    this.hasPrev = false;
    for (let i = 0; i < 3; i++) {
      const s = 2 << i;
      this.chain[i].setSize(Math.max(1, Math.round(w / s)), Math.max(1, Math.round(h / s)));
      this.tmp[i].setSize(Math.max(1, Math.round(w / s)), Math.max(1, Math.round(h / s)));
    }
    this.postUniforms.uRes.value.set(w, h);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.setSize(Math.max(1, Math.round(this.internalHeight * (w / h))), this.internalHeight);
  }

  get aspect() {
    return this.width / this.height;
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  blur(src, dst, tmp, radius = 1) {
    const u = this.blurMat.uniforms;
    u.tSrc.value = src.texture;
    u.uDir.value.set(radius / src.width, 0);
    this.pass(this.blurMat, tmp);
    u.tSrc.value = tmp.texture;
    u.uDir.value.set(0, radius / src.height);
    this.pass(this.blurMat, dst);
  }

  /** World → HDR target, then the post chain up to (not including) the composite. */
  renderWorld(scene, camera, viewScene, viewCamera) {
    const r = this.renderer;
    sharedUniforms.uCamPos.value.copy(camera.position);
    this.postUniforms.uNear.value = camera.near;
    this.postUniforms.uFar.value = camera.far;
    r.setRenderTarget(this.scene);
    r.setClearColor(sharedUniforms.uFogColor.value, 1);
    r.clear(true, true, true);
    r.render(scene, camera);
    if (viewScene && viewCamera) {
      r.clearDepth();
      r.render(viewScene, viewCamera);
    }
    this.brightMat.uniforms.tSrc.value = this.scene.texture;
    this.pass(this.brightMat, this.bright);
    let src = this.bright;
    for (let i = 0; i < 3; i++) {
      this.blur(src, this.chain[i], this.tmp[i], 1.2 + i * 0.6);
      src = this.chain[i];
    }
    if (this.postUniforms.uDofOn.value > 0) {
      this.copyMat.uniforms.tSrc.value = this.scene.texture;
      this.pass(this.copyMat, this.soft);
      this.blur(this.soft, this.soft, this.softTmp, 1.6);
    }
  }

  render(scene, camera, viewScene, viewCamera) {
    this.renderWorld(scene, camera, viewScene, viewCamera);
    const r = this.renderer;
    this.postUniforms.uHasPrev.value = this.hasPrev ? 1 : 0;
    r.setRenderTarget(null);
    r.clear(true, true, true);
    this.pass(this.compositeMat, null);
    // Keep this frame for ghosting (only when the effect is in use).
    if (this.postUniforms.uGhost.value > 0) {
      const [read, write] = this.prev;
      this.postUniforms.tPrev.value = read.texture;
      this.pass(this.compositeMat, write);
      this.prev = [write, read];
      this.postUniforms.tPrev.value = write.texture;
      this.hasPrev = true;
    } else {
      this.hasPrev = false;
    }
  }

  /**
   * Render a still (comic panel) at w×h through the full post chain and return
   * it as a 2D canvas. Restores the normal render size afterwards.
   */
  renderStill(scene, camera, w, h) {
    const r = this.renderer;
    const prev = { w: this.width, h: this.height, aspect: camera.aspect, letterbox: this.postUniforms.uLetterbox.value, ghost: this.postUniforms.uGhost.value };
    const out = new THREE.WebGLRenderTarget(w, h);
    this.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    this.postUniforms.uLetterbox.value = 0;
    this.postUniforms.uGhost.value = 0;
    this.postUniforms.uHasPrev.value = 0;
    this.renderWorld(scene, camera);
    this.pass(this.compositeMat, out);
    const px = new Uint8Array(w * h * 4);
    r.readRenderTargetPixels(out, 0, 0, w, h, px);
    r.setRenderTarget(null);
    out.dispose();
    this.setSize(prev.w, prev.h);
    camera.aspect = prev.aspect;
    camera.updateProjectionMatrix();
    this.postUniforms.uLetterbox.value = prev.letterbox;
    this.postUniforms.uGhost.value = prev.ghost;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const img = c.getContext('2d').createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  }
}
