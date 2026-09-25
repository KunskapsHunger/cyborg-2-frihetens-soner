import * as THREE from 'three';

// PS2-era world material. Per-pixel lighting from a hemisphere sky, up to
// MAX_POINT_LIGHTS point lights and one spot, Blinn-Phong highlights, a faked
// sky reflection on wet/icy surfaces, a rim light that keeps characters
// readable, procedural snow cover on upward faces and exponential fog.
// Gameplay extras carried over from CYBÖRG:
//  - cutaway: geometry between camera and player dissolves (stippled)
//  - thermal vision: world goes cold blue, warm bodies glow
// All materials share the light uniforms so the managers update them once.

export const MAX_POINT_LIGHTS = 16;

export const sharedUniforms = {
  uAmbient: { value: new THREE.Color(0.08, 0.08, 0.09) },
  uSkyColor: { value: new THREE.Color(0, 0, 0) },
  uGroundColor: { value: new THREE.Color(0.05, 0.05, 0.06) },
  uSkyDir: { value: new THREE.Vector3(0.3, 1, 0.2).normalize() },
  uPointPos: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Vector3()) },
  uPointColor: { value: Array.from({ length: MAX_POINT_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
  uPointRange: { value: new Array(MAX_POINT_LIGHTS).fill(1) },
  uSpotPos: { value: new THREE.Vector3() },
  uSpotDir: { value: new THREE.Vector3(0, 0, -1) },
  uSpotColor: { value: new THREE.Color(0, 0, 0) },
  uSpotCos: { value: Math.cos(0.5) },
  uSpotRange: { value: 26 },
  uFogColor: { value: new THREE.Color(0, 0, 0) },
  uFogNear: { value: 4 },
  uFogFar: { value: 30 },
  uCamPos: { value: new THREE.Vector3() },
  uSnow: { value: 0 },
  uSnowColor: { value: new THREE.Color(0.82, 0.86, 0.92) },
  uTime: { value: 0 },
  uCutTarget: { value: new THREE.Vector3(0, -999, 0) },
  uCutCam: { value: new THREE.Vector3() },
  uCutRadius: { value: 2.2 },
  uThermal: { value: 0 },
};

const vertexShader = /* glsl */ `
  uniform vec2 uUvOffset;
  uniform vec2 uUvScale;
  #ifdef USE_VCOLOR
  attribute vec3 color;
  varying vec3 vColor;
  #endif
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 view = viewMatrix * world;
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
    vUv = uv * uUvScale + uUvOffset;
    #ifdef USE_VCOLOR
    vColor = color;
    #endif
  }
`;

const fragmentShader = /* glsl */ `
  #define MAX_POINT_LIGHTS ${MAX_POINT_LIGHTS}
  uniform sampler2D map;
  uniform float uHasMap;
  uniform vec3 uColor;
  uniform vec3 uAmbient;
  uniform vec3 uSkyColor;
  uniform vec3 uGroundColor;
  uniform vec3 uSkyDir;
  uniform vec3 uPointPos[MAX_POINT_LIGHTS];
  uniform vec3 uPointColor[MAX_POINT_LIGHTS];
  uniform float uPointRange[MAX_POINT_LIGHTS];
  uniform vec3 uSpotPos;
  uniform vec3 uSpotDir;
  uniform vec3 uSpotColor;
  uniform float uSpotCos;
  uniform float uSpotRange;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uCamPos;
  uniform float uSnow;
  uniform vec3 uSnowColor;
  uniform float uTime;
  uniform float uLit;
  uniform vec3 uEmissive;
  uniform vec3 uTint;
  uniform float uSpec;
  uniform float uGloss;
  uniform float uWet;
  uniform float uRim;
  uniform float uSnowOn;
  uniform float uAlphaTest;
  uniform float uOpacity;
  uniform float uCutOn;
  uniform vec3 uCutTarget;
  uniform vec3 uCutCam;
  uniform float uCutRadius;
  uniform float uThermal;
  uniform float uHot;
  uniform float uFogOn;
  #ifdef USE_VCOLOR
  varying vec3 vColor;
  #endif
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    // Cutaway: stipple away geometry between the camera and the player.
    if (uCutOn > 0.5 && vWorld.y > uCutTarget.y + 0.35) {
      vec3 ab = uCutTarget - uCutCam;
      float t = clamp(dot(vWorld - uCutCam, ab) / dot(ab, ab), 0.0, 1.0);
      vec3 closest = uCutCam + ab * t;
      vec2 dxz = (vWorld - closest).xz;
      float dist = length(vec3(dxz.x, (vWorld.y - closest.y) * 0.35, dxz.y));
      if (t < 0.97 && dist < uCutRadius) {
        float k = smoothstep(uCutRadius, uCutRadius * 0.45, dist);
        if (hash12(gl_FragCoord.xy) < k * 0.92) discard;
      }
    }

    vec4 tex = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
    if (tex.a < uAlphaTest) discard;
    vec3 albedo = tex.rgb * uColor;
    #ifdef USE_VCOLOR
    albedo *= vColor;
    #endif

    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorld);

    // Snow settles on upward faces, patchy and thicker on flat ground.
    float snow = 0.0;
    if (uSnowOn > 0.5 && uSnow > 0.0) {
      // Large soft drifts with a little fine grain; no hard-edged blotches.
      float n = vnoise(vWorld.xz * 0.18) * 0.55 + vnoise(vWorld.xz * 0.6) * 0.3 + vnoise(vWorld.xz * 2.3) * 0.15;
      snow = smoothstep(0.5, 0.9, N.y) * smoothstep(0.15, 0.75, n + uSnow * 0.55 - 0.25) * uSnow;
      albedo = mix(albedo, uSnowColor * (0.93 + 0.07 * n), snow);
    }

    vec3 col;
    if (uLit > 0.5) {
      float hemi = N.y * 0.5 + 0.5;
      vec3 light = uAmbient + mix(uGroundColor, uSkyColor, hemi) * (0.7 + 0.3 * max(dot(N, uSkyDir), 0.0));
      vec3 specAcc = vec3(0.0);
      float shin = mix(8.0, 96.0, uGloss);
      for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
        vec3 L = uPointPos[i] - vWorld;
        float d = length(L) + 1e-4;
        float att = clamp(1.0 - d / uPointRange[i], 0.0, 1.0);
        att *= att;
        if (att <= 0.0) continue;
        L /= d;
        float ndl = max(dot(N, L), 0.0) * 0.85 + 0.15;
        light += uPointColor[i] * att * ndl;
        vec3 H = normalize(L + V);
        specAcc += uPointColor[i] * att * pow(max(dot(N, H), 0.0), shin);
      }
      vec3 S = vWorld - uSpotPos;
      float sd = length(S) + 1e-4;
      float cone = smoothstep(uSpotCos, uSpotCos + 0.12, dot(S / sd, uSpotDir));
      float sAtt = clamp(1.0 - sd / uSpotRange, 0.0, 1.0);
      light += uSpotColor * cone * sAtt * sAtt * (max(dot(N, -S / sd), 0.0) * 0.8 + 0.2);

      float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      col = albedo * light * uTint;
      col += specAcc * (uSpec + snow * 0.15);
      // Wet asphalt / ice: fake a reflection of the sky and lamps.
      col += mix(uGroundColor, uSkyColor * 1.4, 0.7) * fres * uWet * (1.0 - snow);
      // Rim light keeps figures readable against dark backgrounds.
      col += (uSkyColor + uAmbient) * fres * uRim * 1.6;
    } else {
      col = albedo * uTint;
    }
    col += uEmissive;

    float fog = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    fog = 1.0 - exp(-fog * fog * 3.0);
    col = mix(col, uFogColor, fog * uFogOn);

    if (uThermal > 0.5) {
      float lum = dot(albedo, vec3(0.3, 0.5, 0.2));
      vec3 cold = vec3(0.02, 0.05, 0.16) + vec3(0.05, 0.12, 0.3) * lum * (1.0 - fog);
      vec3 hot = mix(vec3(0.9, 0.25, 0.05), vec3(1.0, 0.95, 0.6), lum);
      col = mix(cold, hot, uHot);
    }
    gl_FragColor = vec4(col, tex.a * uOpacity);
  }
`;

/**
 * @param {object} opts
 * @param {THREE.Texture=} opts.map
 * @param {number=} opts.color
 * @param {boolean=} opts.lit   false = fullbright (fx, neon, signs)
 * @param {boolean=} opts.cut   participates in the camera cutaway (walls, props)
 * @param {boolean=} opts.hot   glows in thermal vision (living bodies)
 * @param {boolean=} opts.fog   false = ignore fog (sky)
 * @param {number=} opts.spec   specular strength (0..1)
 * @param {number=} opts.gloss  highlight tightness (0..1)
 * @param {number=} opts.wet    sky reflection strength (wet asphalt, ice)
 * @param {number=} opts.rim    rim light strength (characters)
 * @param {boolean=} opts.snow  receives procedural snow cover
 */
export function createMaterial(opts = {}) {
  const uniforms = {
    ...sharedUniforms,
    map: { value: opts.map ?? null },
    uHasMap: { value: opts.map ? 1 : 0 },
    uColor: { value: new THREE.Color(opts.color ?? 0xffffff) },
    uLit: { value: opts.lit === false ? 0 : 1 },
    uEmissive: { value: new THREE.Color(opts.emissive ?? 0x000000) },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uSpec: { value: opts.spec ?? 0.15 },
    uGloss: { value: opts.gloss ?? 0.3 },
    uWet: { value: opts.wet ?? 0 },
    uRim: { value: opts.rim ?? 0 },
    uSnowOn: { value: opts.snow ? 1 : 0 },
    uAlphaTest: { value: opts.alphaTest ?? 0.5 },
    uOpacity: { value: opts.opacity ?? 1 },
    uUvOffset: { value: new THREE.Vector2(0, 0) },
    uUvScale: { value: new THREE.Vector2(1, 1) },
    uCutOn: { value: opts.cut ? 1 : 0 },
    uHot: { value: opts.hot ? 1 : 0 },
    uFogOn: { value: opts.fog === false ? 0 : 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    defines: opts.vertexColors ? { USE_VCOLOR: '' } : {},
    transparent: !!opts.transparent || !!opts.additive,
    depthWrite: !(opts.transparent || opts.additive),
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: opts.side ?? THREE.FrontSide,
  });
  mat.userData.world = true;
  return mat;
}

export function setMaterialMap(mat, tex) {
  mat.uniforms.map.value = tex;
  mat.uniforms.uHasMap.value = tex ? 1 : 0;
}
