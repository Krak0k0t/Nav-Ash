import * as THREE from 'three';

/**
 * Generates a tangent-space normal map DataTexture from a grayscale height canvas using a 3x3 Sobel filter.
 */
export function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.DataTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for normal map');
  const src = ctx.getImageData(0, 0, w, h).data;
  const dst = new Uint8Array(w * h * 4);

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const invLen = 1.0 / Math.hypot(dx, dy, dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(dst, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a dark nocturnal Slavic forest IBL environment (replaces bright white RoomEnvironment)
 * so forged steel, wet stone, and bog water reflect moonlight, dark canopy, and warm firelight.
 */
export function buildNightForestEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0b1218);

  // Dark forest horizon dome
  const domeGeo = new THREE.SphereGeometry(24, 16, 12);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float up = clamp(vPos.y, -1.0, 1.0);
        vec3 zenith = vec3(0.08, 0.14, 0.22);
        vec3 horizon = vec3(0.05, 0.08, 0.09);
        vec3 ground = vec3(0.02, 0.03, 0.025);
        vec3 col = up >= 0.0
          ? mix(horizon, zenith, pow(up, 0.7))
          : mix(horizon, ground, pow(-up, 0.6));
        // Subtle moonlight highlight patch in upper-left sky
        vec3 moonDir = normalize(vec3(-0.55, 0.68, 0.42));
        float moonGlow = pow(max(0.0, dot(normalize(vPos), moonDir)), 12.0);
        col += vec3(0.45, 0.62, 0.85) * moonGlow * 1.1;
        // Subtle warm campfire bounce on lower-left horizon
        vec3 fireDir = normalize(vec3(-0.65, -0.18, 0.55));
        float fireGlow = pow(max(0.0, dot(normalize(vPos), fireDir)), 5.0);
        col += vec3(0.62, 0.26, 0.07) * fireGlow * 0.55;
        // Subtle Nav emerald hint from altar direction
        vec3 navDir = normalize(vec3(0.1, 0.05, -0.95));
        float navGlow = pow(max(0.0, dot(normalize(vPos), navDir)), 8.0);
        col += vec3(0.06, 0.35, 0.2) * navGlow * 0.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.05);
  domeGeo.dispose();
  domeMat.dispose();
  pmrem.dispose();
  return target.texture;
}
