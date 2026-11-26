import * as THREE from 'three';
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import {buildEnemyUpyr} from './assets/enemyUpyr';
import {buildHeroVityaz} from './assets/heroVityaz';
import {buildLookdevEnvironment, terrainHeightAt} from './assets/slavicProps';
import {detectSoftwareWebGL} from './helloScene';
import {buildNightForestEnvironment} from './materials/proceduralMaps';
import {createProceduralTextures} from './textures';

export type LookdevPreset = 'iso' | 'hero' | 'altar' | 'wide';

export interface LookdevView {
  isSoftwareGl: boolean;
  preset: LookdevPreset;
  navShifted: boolean;
  setPreset: (preset: LookdevPreset) => void;
  setNavShifted: (shifted: boolean) => void;
  toggleNavShifted: () => boolean;
  resize: (width: number, height: number) => void;
  renderFrame: (dt: number, afterFrame?: () => void) => void;
  dispose: () => void;
}

const PRESETS: Record<
  LookdevPreset,
  {pos: [number, number, number]; look: [number, number, number]; fov: number}
> = {
  iso: {pos: [0.3, 13.2, 12.4], look: [-0.15, 0.9, -0.5], fov: 42},
  hero: {pos: [1.05, 2.45, 5.4], look: [-1.5, 1.35, 2.0], fov: 35},
  altar: {pos: [-2.9, 2.95, 2.5], look: [0.55, 1.45, -2.5], fov: 37},
  wide: {pos: [-7.0, 5.4, 11.2], look: [-0.2, 1.25, -1.6], fov: 40},
};

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _curLook = new THREE.Vector3(-0.15, 0.9, -0.5);
const _skyYav = new THREE.Color(0x101820);
const _skyNav = new THREE.Color(0x061611);
const _skyCur = new THREE.Color();

export function createLookdevView(
  container: HTMLElement,
  seed: number,
  initialWidth: number,
  initialHeight: number,
): LookdevView {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(1, initialWidth);
  const height = Math.max(1, initialHeight);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = isSoftwareGl ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = _skyYav.clone();
  const fog = new THREE.FogExp2(0x101820, 0.044);
  scene.fog = fog;

  // Nocturnal forest HDR-style IBL (eliminates white studio reflections)
  const envTex = buildNightForestEnvironment(renderer);
  scene.environment = envTex;
  scene.environmentIntensity = 0.72;

  const camera = new THREE.PerspectiveCamera(PRESETS.iso.fov, width / height, 0.1, 160);
  camera.position.set(...PRESETS.iso.pos);
  camera.lookAt(...PRESETS.iso.look);

  const textures = createProceduralTextures(seed, renderer.capabilities.getMaxAnisotropy());

  // Dramatic dark-fantasy lighting rig: low slate fill + moon directional + clearing SpotLight + warm fire vs emerald Nav
  const hemi = new THREE.HemisphereLight(0x324b66, 0x0b0f0d, 0.36);
  scene.add(hemi);

  const moonKey = new THREE.DirectionalLight(0x90b3dc, 1.45);
  moonKey.position.set(-15, 24, 10);
  moonKey.castShadow = !isSoftwareGl;
  moonKey.shadow.mapSize.set(2048, 2048);
  moonKey.shadow.camera.near = 1;
  moonKey.shadow.camera.far = 60;
  moonKey.shadow.camera.left = -16;
  moonKey.shadow.camera.right = 16;
  moonKey.shadow.camera.top = 16;
  moonKey.shadow.camera.bottom = -16;
  moonKey.shadow.bias = -0.0004;
  moonKey.shadow.normalBias = 0.02;
  scene.add(moonKey);

  // Focused moonlight spotlight sculpting the clearing & hero silhouette
  const clearingSpot = new THREE.SpotLight(0xa2c4eb, 42, 34, Math.PI / 4.2, 0.72, 1.45);
  clearingSpot.position.set(-6.5, 16.5, 5.5);
  clearingSpot.target.position.set(0.2, 0, -1.2);
  scene.add(clearingSpot.target);
  scene.add(clearingSpot);

  // Soft-edged volumetric moonlight shafts
  const beamUniforms = {uNavBlend: {value: 0}};
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: beamUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      uniform float uNavBlend;
      void main() {
        vec3 vDir = normalize(vViewPos);
        float edge = pow(abs(dot(normalize(vNormalView), vDir)), 2.8);
        float vertFade = smoothstep(0.0, 0.34, vUv.y) * smoothstep(1.0, 0.42, vUv.y);
        float alpha = edge * vertFade * 0.085;
        vec3 col = mix(vec3(0.45, 0.62, 0.82), vec3(0.18, 0.72, 0.52), uNavBlend);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  for (const [bx, bz] of [
    [-2.5, -2.0],
    [2.8, -1.2],
    [-0.5, 2.2],
  ]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 2.9, 17, 20, 1, true), beamMat);
    beam.position.set(bx, 7.2, bz);
    beam.rotation.set(0.18, 0, -0.36);
    scene.add(beam);
  }

  const envRig = buildLookdevEnvironment(scene, seed, textures);

  const hero = buildHeroVityaz(textures);
  hero.group.position.set(-1.6, terrainHeightAt(-1.6, 2.2), 2.2);
  hero.group.rotation.y = Math.atan2(2.3 - -1.6, -1.6 - 2.2);
  scene.add(hero.group);

  const upyr = buildEnemyUpyr(textures);
  upyr.group.position.set(2.3, terrainHeightAt(2.3, -1.6), -1.6);
  upyr.group.rotation.y = Math.atan2(-1.6 - 2.3, 2.2 - -1.6);
  scene.add(upyr.group);

  let composer: EffectComposer | null = null;
  if (!isSoftwareGl) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.96,
      intensity: 0.9,
      radius: 0.58,
    });
    const vignette = new VignetteEffect({offset: 0.32, darkness: 0.58});
    const chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0005, 0.0005),
      radialModulation: true,
      modulationOffset: 0.25,
    });
    const toneMapping = new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC});
    composer.addPass(new EffectPass(camera, bloom, chromatic, vignette, toneMapping));
  }

  let preset: LookdevPreset = 'iso';
  let navShifted = false;
  let navBlend = 0;
  let elapsed = 0;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 80);
      }
    };
    window.setTimeout(poll, 5);
  }

  return {
    isSoftwareGl,
    get preset() {
      return preset;
    },
    get navShifted() {
      return navShifted;
    },
    setPreset: (next) => {
      preset = next;
    },
    setNavShifted: (shifted) => {
      navShifted = shifted;
    },
    toggleNavShifted: () => {
      navShifted = !navShifted;
      return navShifted;
    },
    resize: (w, h) => {
      const nw = Math.max(1, w);
      const nh = Math.max(1, h);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer?.setSize(nw, nh);
    },
    renderFrame: (dt, afterFrame) => {
      elapsed += dt;
      const targetBlend = navShifted ? 1 : 0;
      navBlend = THREE.MathUtils.damp(navBlend, targetBlend, 4.5, dt);

      _skyCur.copy(_skyYav).lerp(_skyNav, navBlend);
      (scene.background as THREE.Color).copy(_skyCur);
      fog.color.copy(_skyCur);
      fog.density = 0.044 + navBlend * 0.018;
      moonKey.intensity = 1.45 - navBlend * 0.55;
      clearingSpot.intensity = 42 - navBlend * 16;
      beamUniforms.uNavBlend.value = navBlend;

      hero.animate(elapsed, 0.15);
      upyr.animate(elapsed, navBlend);
      envRig.animate(elapsed, navBlend);

      const cfg = PRESETS[preset];
      _targetPos.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      _targetLook.set(cfg.look[0], cfg.look[1], cfg.look[2]);
      const lambda = 7.0;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, dt);
      _curLook.x = THREE.MathUtils.damp(_curLook.x, _targetLook.x, lambda, dt);
      _curLook.y = THREE.MathUtils.damp(_curLook.y, _targetLook.y, lambda, dt);
      _curLook.z = THREE.MathUtils.damp(_curLook.z, _targetLook.z, lambda, dt);
      camera.lookAt(_curLook);

      if (Math.abs(camera.fov - cfg.fov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, cfg.fov, lambda, dt);
        camera.updateProjectionMatrix();
      }

      if (composer) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }

      if (afterFrame) {
        if (isSoftwareGl) {
          afterDraw(afterFrame);
        } else {
          afterFrame();
        }
      }
    },
    dispose: () => {
      composer?.dispose();
      envTex.dispose();
      textures.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    },
  };
}
