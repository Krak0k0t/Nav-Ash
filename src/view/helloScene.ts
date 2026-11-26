import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import {createRng} from '../core/rng';
import tuning from '../data/hello.json';
import type {HelloState} from '../systems/hello/helloSim';
import {createProceduralTextures} from './textures';

export interface HelloView {
  isSoftwareGl: boolean;
  cameraMode: 'iso' | 'cinematic';
  setCameraMode: (mode: 'iso' | 'cinematic') => void;
  toggleCameraMode: () => 'iso' | 'cinematic';
  resize: (width: number, height: number) => void;
  syncAndRender: (state: HelloState, dt: number, afterFrame?: () => void) => void;
  dispose: () => void;
}

const _camTargetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.0, 0);
const _skyYav = new THREE.Color(0x1d2833);
const _skyNav = new THREE.Color(0x10221e);
const _skyLerp = new THREE.Color();
const _runeBase = new THREE.Color(0x289962);
const _runeBright = new THREE.Color(0x3be88c);

export function detectSoftwareWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function buildHeroGroup(textures: ReturnType<typeof createProceduralTextures>): {
  group: THREE.Group;
  torchLight: THREE.PointLight;
  torchEmberMat: THREE.MeshStandardMaterial;
  cloakMat: THREE.MeshStandardMaterial;
  cloakMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x5c6369,
    metalness: 0.85,
    roughness: 0.34,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a20,
    metalness: 0.1,
    roughness: 0.78,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0x26292e,
    metalness: 0.05,
    roughness: 0.9,
  });
  const woodShieldMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    bumpMap: textures.woodBump,
    bumpScale: 0.03,
    metalness: 0.1,
    roughness: 0.74,
  });
  const torchEmberMat = new THREE.MeshStandardMaterial({
    color: 0xe07026,
    emissive: 0xe05814,
    emissiveIntensity: 1.8,
    roughness: 0.4,
    metalness: 0.0,
  });

  // 1. Boots (2 parts)
  const bootGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.55, 8);
  const bootL = new THREE.Mesh(bootGeo, leatherMat);
  bootL.position.set(-0.17, 0.275, 0);
  bootL.castShadow = true;
  const bootR = new THREE.Mesh(bootGeo, leatherMat);
  bootR.position.set(0.17, 0.275, 0);
  bootR.castShadow = true;
  group.add(bootL, bootR);

  // 2. Armored tunic torso (Lathe/cylinder silhouette)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.88, 10), leatherMat);
  torso.position.y = 0.95;
  torso.castShadow = true;
  group.add(torso);

  // 3. Chainmail chestplate band
  const chestBand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.34, 0.42, 10), ironMat);
  chestBand.position.y = 1.16;
  chestBand.castShadow = true;
  group.add(chestBand);

  // 4. Heavy Slavic cloak
  const cloakMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.56, 1.18, 10, 1, true),
    cloakMat,
  );
  cloakMesh.material.side = THREE.DoubleSide;
  cloakMesh.position.set(0, 0.86, -0.14);
  cloakMesh.rotation.x = 0.18;
  cloakMesh.castShadow = true;
  group.add(cloakMesh);

  // 5. Hammered iron pauldrons (2 parts)
  const pauldronGeo = new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const pauldronL = new THREE.Mesh(pauldronGeo, ironMat);
  pauldronL.position.set(-0.4, 1.33, 0);
  pauldronL.rotation.z = 0.35;
  pauldronL.castShadow = true;
  const pauldronR = new THREE.Mesh(pauldronGeo, ironMat);
  pauldronR.position.set(0.4, 1.33, 0);
  pauldronR.rotation.z = -0.35;
  pauldronR.castShadow = true;
  group.add(pauldronL, pauldronR);

  // 6. Conical Slavic helm (Shishak) with nasal guard
  const helmDome = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.36, 10), ironMat);
  helmDome.position.y = 1.72;
  helmDome.castShadow = true;
  const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 12), ironMat);
  helmRim.rotation.x = Math.PI / 2;
  helmRim.position.y = 1.56;
  group.add(helmDome, helmRim);

  // 7. Carved oak-and-iron shield slung on back
  const shieldGroup = new THREE.Group();
  const shieldBoard = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), woodShieldMat);
  shieldBoard.rotation.x = Math.PI / 2;
  const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), ironMat);
  shieldBoss.position.z = -0.04;
  const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 18), ironMat);
  shieldGroup.add(shieldBoard, shieldBoss, shieldRim);
  shieldGroup.position.set(-0.08, 1.1, -0.33);
  shieldGroup.rotation.y = 0.15;
  group.add(shieldGroup);

  // 8. Torch staff + glowing ember head + warm PointLight
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 1.35, 8), woodShieldMat);
  staff.position.set(0.48, 1.02, 0.25);
  staff.rotation.x = 0.22;
  staff.castShadow = true;
  const ember = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), torchEmberMat);
  ember.position.set(0.48, 1.7, 0.4);
  group.add(staff, ember);

  const torchLight = new THREE.PointLight(0xe07026, 22, 16, 1.6);
  torchLight.position.set(0.5, 2.05, 0.45);
  group.add(torchLight);

  // Contact shadow disc grounded under boots
  const contactMat = new THREE.MeshBasicMaterial({
    color: 0x050706,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const contact = new THREE.Mesh(new THREE.CircleGeometry(0.65, 20), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.02;
  group.add(contact);

  return {group, torchLight, torchEmberMat, cloakMat, cloakMesh};
}

function buildNavAltarGroup(textures: ReturnType<typeof createProceduralTextures>): {
  group: THREE.Group;
  runeRing: THREE.Mesh;
  runeMat: THREE.MeshStandardMaterial;
  altarLight: THREE.PointLight;
} {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    roughness: 0.88,
    metalness: 0.06,
  });
  const oakMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    bumpMap: textures.woodBump,
    bumpScale: 0.045,
    roughness: 0.78,
    metalness: 0.08,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x16a358,
    emissive: 0x3be88c,
    emissiveIntensity: 1.15,
    roughness: 0.25,
    metalness: 0.1,
  });

  // 1. Stepped moss stone plinth (2 parts)
  const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, 0.34, 8), stoneMat);
  baseStep.position.y = 0.17;
  baseStep.receiveShadow = true;
  baseStep.castShadow = true;
  const upperStep = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.22, 0.28, 8), stoneMat);
  upperStep.position.y = 0.48;
  upperStep.receiveShadow = true;
  upperStep.castShadow = true;
  group.add(baseStep, upperStep);

  // 2. Carved oak Slavic idol pillar (chur)
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.55, 8), oakMat);
  pillar.position.y = 1.85;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  group.add(pillar);

  // 3. Carved brow & beard bevels + twin crossbeam horns
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.24, 0.58), oakMat);
  brow.position.y = 2.68;
  brow.castShadow = true;
  const crownCap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.65, 4), oakMat);
  crownCap.position.y = 3.45;
  crownCap.rotation.y = Math.PI / 4;
  crownCap.castShadow = true;
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 0.28), oakMat);
  crossBeam.position.y = 2.24;
  crossBeam.castShadow = true;
  group.add(brow, crownCap, crossBeam);

  // 4. Glowing emerald eye slits + inlaid rune collar + floating Nav ring
  const eyeGeo = new THREE.BoxGeometry(0.16, 0.06, 0.08);
  const eyeL = new THREE.Mesh(eyeGeo, runeMat);
  eyeL.position.set(-0.18, 2.52, 0.38);
  const eyeR = new THREE.Mesh(eyeGeo, runeMat);
  eyeR.position.set(0.18, 2.52, 0.38);

  const collarRune = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 24), runeMat);
  collarRune.rotation.x = Math.PI / 2;
  collarRune.position.y = 1.55;

  const runeRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.04, 8, 36), runeMat);
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.36;
  group.add(eyeL, eyeR, collarRune, runeRing);

  const altarLight = new THREE.PointLight(0x3be88c, 10, 11, 1.7);
  altarLight.position.set(0, 2.0, 0.8);
  group.add(altarLight);

  group.position.set(tuning.altarPosition.x, 0, tuning.altarPosition.z);
  return {group, runeRing, runeMat, altarLight};
}

function buildBirchGrove(
  seed: number,
  textures: ReturnType<typeof createProceduralTextures>,
): {birchTrunks: THREE.InstancedMesh; deadBranches: THREE.InstancedMesh} {
  const rng = createRng(seed ^ 0x51f23a1b);
  const count = 48;

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 8.5, 7);
  trunkGeo.translate(0, 4.25, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: textures.birchAlbedo,
    roughness: 0.84,
    metalness: 0.02,
  });

  const branchGeo = new THREE.ConeGeometry(1.6, 4.2, 6);
  branchGeo.translate(0, 6.8, 0);
  const branchMat = new THREE.MeshStandardMaterial({
    color: 0x1a201b,
    roughness: 0.92,
    metalness: 0.0,
  });

  const birchTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const deadBranches = new THREE.InstancedMesh(branchGeo, branchMat, count);
  birchTrunks.castShadow = false;
  birchTrunks.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng.range(-0.08, 0.08);
    const radius = tuning.arenaRadius + rng.range(1.6, 11.5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const s = rng.range(0.85, 1.35);

    dummy.position.set(x, 0, z);
    dummy.rotation.set(rng.range(-0.05, 0.05), rng.range(0, Math.PI * 2), rng.range(-0.06, 0.06));
    dummy.scale.set(s, s * rng.range(0.85, 1.25), s);
    dummy.updateMatrix();
    birchTrunks.setMatrixAt(i, dummy.matrix);
    deadBranches.setMatrixAt(i, dummy.matrix);

    const shade = rng.range(0.76, 1.05);
    tint.setRGB(shade, shade * 0.96, shade * 0.9);
    birchTrunks.setColorAt(i, tint);
  }

  birchTrunks.instanceMatrix.needsUpdate = true;
  deadBranches.instanceMatrix.needsUpdate = true;
  birchTrunks.computeBoundingSphere();
  deadBranches.computeBoundingSphere();

  return {birchTrunks, deadBranches};
}

export function createHelloView(
  container: HTMLElement,
  seed: number,
  initialWidth: number,
  initialHeight: number,
): HelloView {
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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = _skyYav.clone();
  const fog = new THREE.FogExp2(0x1d2833, 0.044);
  scene.fog = fog;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(tuning.camera.isoFov, width / height, 0.1, 140);
  camera.position.set(
    tuning.heroStart.x + tuning.camera.isoOffset.x,
    tuning.camera.isoOffset.y,
    tuning.heroStart.z + tuning.camera.isoOffset.z,
  );
  camera.lookAt(tuning.heroStart.x, 1.0, tuning.heroStart.z);

  const textures = createProceduralTextures(seed, renderer.capabilities.getMaxAnisotropy());

  // Lighting: cool moonlight + warm/cool hemisphere fill (hero torch carries warm point light)
  const hemi = new THREE.HemisphereLight(0x3a5068, 0x131815, 0.72);
  scene.add(hemi);

  const moonKey = new THREE.DirectionalLight(0x9cb8d9, 1.65);
  moonKey.position.set(-14, 22, 12);
  moonKey.castShadow = !isSoftwareGl;
  moonKey.shadow.mapSize.set(1024, 1024);
  moonKey.shadow.camera.near = 1;
  moonKey.shadow.camera.far = 55;
  moonKey.shadow.camera.left = -16;
  moonKey.shadow.camera.right = 16;
  moonKey.shadow.camera.top = 16;
  moonKey.shadow.camera.bottom = -16;
  moonKey.shadow.bias = -0.0005;
  moonKey.shadow.normalBias = 0.02;
  scene.add(moonKey);

  // Extended peat ground fading smoothly into horizon mist (never boxed in walls)
  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.groundAlbedo,
    roughnessMap: textures.groundRoughness,
    roughness: 0.9,
    metalness: 0.06,
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(68, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle carved ritual circle around Nav Altar (offset Y >= 0.02 so zero Z-fighting)
  const stoneRingMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    roughness: 0.82,
    metalness: 0.1,
  });
  const ritualRing = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.35, 32), stoneRingMat);
  ritualRing.rotation.x = -Math.PI / 2;
  ritualRing.position.set(tuning.altarPosition.x, 0.02, tuning.altarPosition.z);
  ritualRing.receiveShadow = true;
  scene.add(ritualRing);

  const hero = buildHeroGroup(textures);
  scene.add(hero.group);

  const altar = buildNavAltarGroup(textures);
  scene.add(altar.group);

  const grove = buildBirchGrove(seed, textures);
  scene.add(grove.birchTrunks, grove.deadBranches);

  // Post-processing composer on GPU (skipped cleanly on software WebGL per threejs skill)
  let composer: EffectComposer | null = null;
  if (!isSoftwareGl) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 1.05,
      intensity: 0.9,
      radius: 0.55,
    });
    const vignette = new VignetteEffect({offset: 0.35, darkness: 0.55});
    const toneMapping = new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC});
    composer.addPass(new EffectPass(camera, bloom, vignette, toneMapping));
  }

  let cameraMode: 'iso' | 'cinematic' = 'iso';

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
    get cameraMode() {
      return cameraMode;
    },
    setCameraMode: (mode: 'iso' | 'cinematic') => {
      cameraMode = mode;
    },
    toggleCameraMode: () => {
      cameraMode = cameraMode === 'iso' ? 'cinematic' : 'iso';
      return cameraMode;
    },
    resize: (w: number, h: number) => {
      const nw = Math.max(1, w);
      const nh = Math.max(1, h);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer?.setSize(nw, nh);
    },
    syncAndRender: (state: HelloState, dt: number, afterFrame?: () => void) => {
      // Hero transform + torch flicker
      hero.group.position.set(state.heroX, 0, state.heroZ);
      hero.group.rotation.y = state.facingYaw;
      const flicker =
        Math.sin(state.elapsed * 13.7) * 0.14 + Math.cos(state.elapsed * 7.3) * 0.09;
      hero.torchLight.intensity = 22 + flicker * 18;
      hero.torchEmberMat.emissiveIntensity = 1.65 + flicker * 0.7;

      // Nav Shift atmosphere modulation (Явь slate -> Навь emerald mist)
      _skyLerp.copy(_skyYav).lerp(_skyNav, state.navBlend);
      (scene.background as THREE.Color).copy(_skyLerp);
      fog.color.copy(_skyLerp);
      fog.density = 0.044 + state.navBlend * 0.016;

      // Altar emerald pulse (kept saturated under ACES Filmic)
      const altarPulse = 1 + Math.sin(state.elapsed * 3.2) * 0.15 + state.navBlend * 0.65;
      altar.runeMat.emissiveIntensity = 1.05 * altarPulse;
      altar.runeMat.color.copy(_runeBase).lerp(_runeBright, state.navBlend);
      altar.altarLight.intensity = 9 + state.navBlend * 18 + Math.sin(state.elapsed * 2.8) * 1.5;
      altar.runeRing.position.y = 0.36 + state.navBlend * 0.25 + Math.sin(state.elapsed * 2.0) * 0.05;
      altar.runeRing.rotation.z = state.elapsed * (0.35 + state.navBlend * 0.85);

      // Smoothly damped dynamic camera (isometric combat <-> cinematic close-up)
      const camCfg = tuning.camera;
      const offset = cameraMode === 'iso' ? camCfg.isoOffset : camCfg.cinematicOffset;
      const targetFov = cameraMode === 'iso' ? camCfg.isoFov : camCfg.cinematicFov;
      const lambda = camCfg.dampLambda;

      _camTargetPos.set(state.heroX + offset.x, offset.y, state.heroZ + offset.z);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, lambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, lambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, lambda, dt);

      _lookTarget.set(
        state.heroX * 0.78,
        cameraMode === 'iso' ? 0.9 : 1.35,
        state.heroZ * 0.78 - 0.6,
      );
      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _lookTarget.x, lambda, dt);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _lookTarget.y, lambda, dt);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _lookTarget.z, lambda, dt);
      camera.lookAt(_currentLook);

      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, lambda, dt);
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
