import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BloomEffect,
  BrightnessContrastEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import {
  GRAPHICS_PRESETS,
  type CameraStyleId,
  type GraphicsQualityId,
} from '../data/balance';
import {
  getLockedTarget,
  type DustEvent,
  type GameSimState,
  type SlashEffectEvent,
  type SparkEvent,
} from '../systems/gameSim';
import {isEnemyDarknessShielded} from '../systems/quests';
import {SpatialPhysicsClient} from '../systems/spatialClient';
import {buildHeroVityaz} from './assets/heroVityaz';
import {
  buildEnemyByArchetype,
  buildOstrogNpc,
  type CreatureRig,
  type EnemyLocomotionView,
} from './assets/slavicCreatures';
import {buildWorldEnvironment, worldTerrainHeight} from './assets/worldInstanced';
import {detectSoftwareWebGL} from './helloScene';
import {buildNightForestEnvironment} from './materials/proceduralMaps';
import {createProceduralTextures} from './textures';

export type ScenePhase = 'title' | 'transition' | 'playing' | 'paused' | 'gameover';

export interface GameView {
  isSoftwareGl: boolean;
  canvas: HTMLCanvasElement;
  cameraYaw: number;
  cameraStyle: CameraStyleId;
  setCameraStyle: (style: CameraStyleId) => void;
  toggleCameraStyle: () => CameraStyleId;
  applyOrbitInput: (dx: number, dy: number, zoomDelta: number) => void;
  setGraphicsQuality: (quality: GraphicsQualityId) => void;
  triggerHeroSalute: () => void;
  tryPickHeroPreview: (clientX: number, clientY: number) => boolean;
  spawnSlashFx: (ev: SlashEffectEvent) => void;
  spawnSparks: (ev: SparkEvent) => void;
  spawnDust: (ev: DustEvent) => void;
  rebuildWorld: (sim: GameSimState) => void;
  resize: (w: number, h: number) => void;
  renderFrame: (
    sim: GameSimState,
    phase: ScenePhase,
    transitionFrac: number,
    dt: number,
    afterFrame?: () => void,
  ) => void;
  dispose: () => void;
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  isNav: boolean;
}

interface DustParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

interface SlashRingSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

function makeSlavicRunicDiscMaterial(
  colorHex: number,
  secondaryHex: number,
  mode: 'sigil' | 'telegraph' | 'target' | 'aura' | 'slash',
): THREE.ShaderMaterial {
  const modeId =
    mode === 'sigil'
      ? 0.0
      : mode === 'telegraph'
        ? 1.0
        : mode === 'target'
          ? 2.0
          : mode === 'aura'
            ? 3.0
            : 4.0;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uTime: {value: 0},
      uProgress: {value: 0},
      uIntensity: {value: 1},
      uColor: {value: new THREE.Color(colorHex)},
      uColor2: {value: new THREE.Color(secondaryHex)},
      uMode: {value: modeId},
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;
      uniform float uIntensity;
      uniform vec3 uColor;
      uniform vec3 uColor2;
      uniform float uMode;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.5);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        return vnoise(p) * 0.6 + vnoise(p * 2.2 - 1.7) * 0.28 + vnoise(p * 4.5 + 3.1) * 0.12;
      }

      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float ang = atan(vUv.y, vUv.x);

        // Soft organic smoke swirl so nothing looks like a crisp vector sticker
        float swirl = fbm(vUv * 3.6 + vec2(uTime * 0.35, -uTime * 0.45));
        float softFade = exp(-r * r * 3.2) * (1.0 - smoothstep(0.72, 1.0, r));

        float ring1 = exp(-pow((r - 0.78) * 18.0, 2.0));
        float ring2 = exp(-pow((r - 0.52) * 22.0, 2.0));
        // Carved Slavic sun/Nav notches around perimeter
        float notches = smoothstep(0.25, 0.85, cos(ang * 8.0 + uTime * 0.9)) * 0.72
                      + smoothstep(0.45, 0.95, sin(ang * 16.0 - uTime * 1.3)) * 0.35;
        float innerCross = exp(-pow((r - 0.32) * 14.0, 2.0)) * smoothstep(0.1, 0.9, abs(cos(ang * 4.0 - uTime * 0.6)));

        float alpha = 0.0;
        vec3 col = uColor;

        if (uMode < 0.5) {
          // Blood / Nav Sigil: smoldering runic ash circle with misty ember core
          float pulse = 0.82 + 0.18 * sin(uTime * 5.0);
          float core = exp(-r * r * 7.0) * (0.45 + 0.55 * swirl);
          alpha = (ring1 * (0.35 + 0.65 * notches) + ring2 * 0.5 + core * 0.65) * softFade * pulse;
          col = mix(uColor, uColor2, clamp(core + notches * 0.3, 0.0, 1.0));
        } else if (uMode < 1.5) {
          // Enemy Telegraph: crisp crimson-amber warning ring + inward pulse
          float outerWarn = exp(-pow((r - 0.88) * 24.0, 2.0));
          float innerSweep = exp(-pow((r - (0.3 + 0.55 * fract(uTime * 1.4))) * 16.0, 2.0));
          alpha = (outerWarn * (0.6 + 0.4 * notches) + innerSweep * 0.45 + swirl * 0.14 * (1.0 - r)) * (1.0 - smoothstep(0.92, 1.0, r));
          col = mix(uColor, uColor2, outerWarn * 0.6);
        } else if (uMode < 2.5) {
          // Tab Target-Lock Reticle: subtle carved amber compass ring
          float lockRing = exp(-pow((r - 0.82) * 24.0, 2.0));
          float ticks = exp(-pow((r - 0.64) * 20.0, 2.0)) * smoothstep(0.35, 0.9, cos(ang * 4.0 + uTime * 1.6));
          alpha = (lockRing * (0.55 + 0.45 * notches) + ticks * 0.8) * (1.0 - smoothstep(0.9, 1.0, r));
          col = mix(uColor, uColor2, ticks);
        } else if (uMode < 3.5) {
          // Shrine Ground Mist Aura: authentic low-lying emerald/amber runic mist
          float mist = smoothstep(0.28, 0.88, swirl) * softFade;
          float subtleRune = (ring1 * 0.35 + innerCross * 0.45) * (0.4 + 0.6 * swirl);
          alpha = (mist * 0.42 + subtleRune * 0.38) * uIntensity;
          col = mix(uColor, uColor2, subtleRune * 0.65 + swirl * 0.25);
        } else {
          // Expanding Slash / Shockwave Ring
          float wavePos = mix(0.25, 0.88, uProgress);
          float shock = exp(-pow((r - wavePos) * 14.0, 2.0));
          float wispTrail = exp(-pow((r - wavePos * 0.78) * 7.0, 2.0)) * swirl;
          alpha = (shock * 0.95 + wispTrail * 0.45) * (1.0 - uProgress) * (1.0 - smoothstep(0.92, 1.0, r));
          col = mix(uColor, uColor2, shock * 0.55);
        }

        gl_FragColor = vec4(col * uIntensity, clamp(alpha, 0.0, 0.92));
      }
    `,
  });
}

const _skyYav = new THREE.Color(0x0c141d);
const _skyNav = new THREE.Color(0x05140e);
const _skyCur = new THREE.Color();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _curLook = new THREE.Vector3(0, 1.2, 4);
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _pColor = new THREE.Color();
const _spatialEnemyTmp: {id: string; x: number; z: number; vx: number; vz: number; radius: number; ko: boolean}[] = [];
const _locoTmp: EnemyLocomotionView = {
  strideDist: 0,
  speedRatio: 0,
  turnStepDir: 0,
  footOffsetL: 0,
  footOffsetR: 0,
  useIk: true,
  darkShielded: false,
};

export function createGameView(
  container: HTMLElement,
  initialSim: GameSimState,
  initialQuality: GraphicsQualityId,
  initialCamStyle: CameraStyleId,
  initialW: number,
  initialH: number,
): GameView {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(1, initialW);
  const height = Math.max(1, initialH);

  let preset = GRAPHICS_PRESETS[initialQuality];
  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: !isSoftwareGl && initialQuality !== 'low',
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, preset.pixelRatioMax),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = !isSoftwareGl && preset.shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = _skyYav.clone();
  const fog = new THREE.FogExp2(0x0c141d, 0.022);
  scene.fog = fog;

  const envTex = buildNightForestEnvironment(renderer);
  scene.environment = envTex;
  scene.environmentIntensity = 0.72;

  const camera = new THREE.PerspectiveCamera(44, width / height, 0.15, 175);
  camera.position.set(initialSim.heroX - 2.35, 2.08, initialSim.heroZ + 3.7);
  _curLook.set(initialSim.heroX - 1.35, 1.25, initialSim.heroZ - 1.8);
  camera.lookAt(_curLook);

  const textures = createProceduralTextures(
    initialSim.seed,
    renderer.capabilities.getMaxAnisotropy(),
  );

  // Contrasting Nocturnal Lighting Rig (Moonlit rim/key + dark ground shadows so torches & magic pop)
  const hemi = new THREE.HemisphereLight(0x2c4560, 0x090d0b, 0.34);
  scene.add(hemi);

  const moonKey = new THREE.DirectionalLight(0x95b8e3, 1.72);
  moonKey.position.set(-14, 24, 12);
  moonKey.castShadow = !isSoftwareGl && preset.shadowsEnabled;
  moonKey.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
  moonKey.shadow.camera.near = 1;
  moonKey.shadow.camera.far = 65;
  moonKey.shadow.camera.left = -20;
  moonKey.shadow.camera.right = 20;
  moonKey.shadow.camera.top = 20;
  moonKey.shadow.camera.bottom = -20;
  moonKey.shadow.bias = -0.0005;
  scene.add(moonKey);
  scene.add(moonKey.target);

  // Rear Hero Rim Light: dynamically placed behind hero relative to camera to silhouette Shelom helm & cloak
  const heroRimLight = new THREE.DirectionalLight(0x8bbbe8, 2.35);
  heroRimLight.position.set(0, 4.5, -6);
  scene.add(heroRimLight);
  scene.add(heroRimLight.target);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const actorGroup = new THREE.Group();
  scene.add(actorGroup);

  let worldRig = buildWorldEnvironment(
    worldGroup as unknown as THREE.Scene,
    initialSim.layout,
    textures,
    preset,
  );

  const heroRig = buildHeroVityaz(textures);
  actorGroup.add(heroRig.group);

  // Zero-GC Svarog's Ward Protective Solar Shield Aura (visible while sim.wardTimer > 0)
  const wardGroup = new THREE.Group();
  const wardGroundMat = makeSlavicRunicDiscMaterial(0xffb84d, 0xffe4a0, 'sigil');
  const wardGroundGeo = new THREE.PlaneGeometry(2.6, 2.6);
  wardGroundGeo.rotateX(-Math.PI / 2);
  const wardGroundMesh = new THREE.Mesh(wardGroundGeo, wardGroundMat);
  wardGroundMesh.position.y = 0.08;
  const wardRingMat = new THREE.MeshPhysicalMaterial({
    color: 0xffc666,
    emissive: 0xe07026,
    emissiveIntensity: 1.4,
    metalness: 0.75,
    roughness: 0.2,
    clearcoat: 0.7,
    transparent: true,
    opacity: 0.78,
  });
  const wardRingGeo = new THREE.TorusGeometry(0.92, 0.028, 6, 24);
  const wardHaloA = new THREE.Mesh(wardRingGeo, wardRingMat);
  wardHaloA.position.y = 1.02;
  wardHaloA.rotation.x = Math.PI * 0.36;
  const wardHaloB = new THREE.Mesh(wardRingGeo, wardRingMat);
  wardHaloB.position.y = 1.02;
  wardHaloB.rotation.x = -Math.PI * 0.36;
  wardGroup.add(wardGroundMesh, wardHaloA, wardHaloB);
  wardGroup.visible = false;
  actorGroup.add(wardGroup);

  // Friendly Ostrog NPCs
  const npcRigs: {id: 'mara' | 'ratnik'; rig: ReturnType<typeof buildOstrogNpc>}[] = [];
  const syncNpcs = (sim: GameSimState) => {
    npcRigs.forEach((n) => actorGroup.remove(n.rig.group));
    npcRigs.length = 0;
    for (const npc of sim.layout.npcs) {
      const rig = buildOstrogNpc(npc.id, textures);
      rig.group.position.set(npc.x, worldTerrainHeight(npc.x, npc.z), npc.z);
      rig.group.rotation.y = Math.atan2(sim.layout.spawnX - npc.x, sim.layout.spawnZ - npc.z);
      actorGroup.add(rig.group);
      npcRigs.push({id: npc.id, rig});
    }
  };
  syncNpcs(initialSim);

  // Enemy Pool keyed by entity id
  const enemyRigs = new Map<string, CreatureRig>();
  const syncEnemyRigs = (sim: GameSimState) => {
    const activeIds = new Set(sim.enemies.map((e) => e.id));
    for (const [id, rig] of enemyRigs.entries()) {
      if (!activeIds.has(id)) {
        actorGroup.remove(rig.group);
        enemyRigs.delete(id);
      }
    }
    for (const e of sim.enemies) {
      let rig = enemyRigs.get(e.id);
      if (!rig) {
        rig = buildEnemyByArchetype(e.archetype, textures);
        actorGroup.add(rig.group);
        enemyRigs.set(e.id, rig);
      }
      rig.group.position.set(e.x, worldTerrainHeight(e.x, e.z), e.z);
      rig.group.rotation.y = e.yaw;
    }
  };
  syncEnemyRigs(initialSim);

  // Ground Enemy Windup Telegraph Pool (up to 6 procedural runic warning discs)
  const telegraphGeo = new THREE.PlaneGeometry(2.2, 2.2);
  telegraphGeo.rotateX(-Math.PI / 2);
  const telegraphMats: THREE.ShaderMaterial[] = [];
  const telegraphPool: THREE.Mesh[] = Array.from({length: 6}, () => {
    const mat = makeSlavicRunicDiscMaterial(0xc93622, 0xffaa44, 'telegraph');
    telegraphMats.push(mat);
    const m = new THREE.Mesh(telegraphGeo, mat);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // Blood Sigil Rune Pool (up to 6 authentic carved Slavic ground sigils)
  const sigilGeo = new THREE.PlaneGeometry(2.3, 2.3);
  sigilGeo.rotateX(-Math.PI / 2);
  const sigilMats: THREE.ShaderMaterial[] = [];
  const sigilPool: THREE.Mesh[] = Array.from({length: 6}, () => {
    const mat = makeSlavicRunicDiscMaterial(0x28c776, 0xe87d2e, 'sigil');
    sigilMats.push(mat);
    const m = new THREE.Mesh(sigilGeo, mat);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // Spirit Vessel Orbs Pool (up to 4 orbs, M09)
  const orbPool: THREE.Mesh[] = Array.from({length: 4}, () => {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0x104728,
        emissive: 0x3be88c,
        emissiveIntensity: 1.5,
      }),
    );
    m.visible = false;
    scene.add(m);
    return m;
  });

  // Background Web Worker client for spatial & cloth dynamics
  const spatialWorker = new SpatialPhysicsClient();

  // Diegetic Quest World Objects: Carved Slavic Shrine Idol + Hanging Censer + Cursed Totems + 1-Draw-Call Ethereal Spirit
  const mirrorGroup = new THREE.Group();
  const idolStoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    normalMap: textures.stoneNormal,
    roughness: 0.9,
    metalness: 0.05,
  });
  const idolOakMat = new THREE.MeshStandardMaterial({
    color: 0x3b3328,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    roughness: 0.88,
    metalness: 0.04,
  });
  const idolMossMat = new THREE.MeshStandardMaterial({
    color: 0x1e3822,
    normalMap: textures.groundNormal,
    roughness: 0.95,
  });
  const idolRustMat = new THREE.MeshStandardMaterial({
    color: 0x452d22,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    roughness: 0.78,
    metalness: 0.72,
  });
  const idolEyeMat = new THREE.MeshStandardMaterial({
    color: 0x0b2a19,
    emissive: 0x2de88a,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });
  const censerCoalMat = new THREE.MeshStandardMaterial({
    color: 0x4a1806,
    emissive: 0xe86b1e,
    emissiveIntensity: 1.65,
    roughness: 0.4,
  });

  const shrinePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 1.12, 0.44, 7), idolStoneMat);
  shrinePlinth.position.y = 0.22;
  shrinePlinth.castShadow = true;
  shrinePlinth.receiveShadow = true;
  const shrineMossCap = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.96, 0.12, 7), idolMossMat);
  shrineMossCap.position.y = 0.43;

  const idolProfile = [
    new THREE.Vector2(0.36, 0.0),
    new THREE.Vector2(0.3, 0.55),
    new THREE.Vector2(0.35, 1.15),
    new THREE.Vector2(0.28, 1.55),
    new THREE.Vector2(0.34, 1.98),
    new THREE.Vector2(0.06, 2.28),
  ];
  const carvedIdol = new THREE.Mesh(new THREE.LatheGeometry(idolProfile, 8), idolOakMat);
  carvedIdol.position.y = 0.44;
  carvedIdol.castShadow = true;
  const idolHorns = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.24), idolOakMat);
  idolHorns.position.y = 2.18;
  const idolEyeL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.06), idolEyeMat);
  idolEyeL.position.set(-0.11, 2.34, 0.31);
  const idolEyeR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.06), idolEyeMat);
  idolEyeR.position.set(0.11, 2.34, 0.31);

  // Hanging Rusted Iron Censer on timber arm with Volumetric Light Cone
  const censerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.9, 6), idolOakMat);
  censerArm.rotation.x = Math.PI / 2;
  censerArm.position.set(0, 2.48, 0.38);
  const censerPivot = new THREE.Group();
  censerPivot.position.set(0, 2.46, 0.78);
  const chainMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 5), idolRustMat);
  chainMesh.position.y = -0.31;
  const censerBowl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), idolRustMat);
  censerBowl.scale.set(1.0, 0.75, 1.0);
  censerBowl.position.y = -0.64;
  const censerCoals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), censerCoalMat);
  censerCoals.position.y = -0.62;
  const shrineLight = new THREE.PointLight(0x3be88c, 16, 12, 1.5);
  shrineLight.position.set(0, -0.7, 0);
  const volBeamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {uIntensity: {value: 0.32}},
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uIntensity;
      void main() {
        float fade = (1.0 - smoothstep(0.0, 1.0, 1.0 - vUv.y)) * smoothstep(0.0, 0.25, vUv.y);
        gl_FragColor = vec4(0.16, 0.82, 0.48, fade * uIntensity);
      }
    `,
  });
  const volBeam = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.7, 12, 1, true), volBeamMat);
  volBeam.position.y = -1.48;
  censerPivot.add(chainMesh, censerBowl, censerCoals, shrineLight, volBeam);

  // Diegetic floating rune/hand prompt icon above the idol when player approaches
  const mirrorHandBeacon = new THREE.Group();
  const handPalm = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshBasicMaterial({color: 0x9ff7c8, transparent: true, opacity: 0.9}),
  );
  handPalm.scale.set(0.85, 1.35, 0.45);
  const handRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.018, 6, 16),
    new THREE.MeshBasicMaterial({color: 0x3be88c, transparent: true, opacity: 0.8}),
  );
  mirrorHandBeacon.add(handPalm, handRing);
  mirrorHandBeacon.position.set(0, 3.05, 0.25);
  mirrorHandBeacon.visible = false;

  // Authentic Shrine Ground Mist & Runic Echo Aura + Guiding Ancestral Wisps
  const shrineAuraGeo = new THREE.PlaneGeometry(4.4, 4.4);
  shrineAuraGeo.rotateX(-Math.PI / 2);
  const shrineAuraMat = makeSlavicRunicDiscMaterial(0x1f8c56, 0x8be8a8, 'aura');
  const shrineAuraMesh = new THREE.Mesh(shrineAuraGeo, shrineAuraMat);
  shrineAuraMesh.position.y = 0.08;
  mirrorGroup.add(shrineAuraMesh);

  // Circling fireflies around the Quest Idol
  const mirrorFlyCount = 14;
  const mirrorFliesMat = new THREE.MeshBasicMaterial({color: 0x52ffaa});
  const mirrorFliesMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.035, 0),
    mirrorFliesMat,
    mirrorFlyCount,
  );
  mirrorGroup.add(
    shrinePlinth,
    shrineMossCap,
    carvedIdol,
    idolHorns,
    idolEyeL,
    idolEyeR,
    censerArm,
    censerPivot,
    mirrorHandBeacon,
    mirrorFliesMesh,
  );
  scene.add(mirrorGroup);

  // Ancestral Spirit Wisps drifting from the Shrine toward uncollected Echo Shards
  const echoWispCount = 12;
  const echoWispMat = new THREE.MeshBasicMaterial({color: 0x7effbe});
  const echoWispsMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.055, 0),
    echoWispMat,
    echoWispCount,
  );
  echoWispsMesh.frustumCulled = false;
  echoWispsMesh.visible = false;
  scene.add(echoWispsMesh);

  // Carved Slavic Soul-Lantern Echo Shards (Crystal Core + Bronze Runic Halo)
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x0e4728,
    emissive: 0x3be88c,
    emissiveIntensity: 1.75,
    roughness: 0.2,
  });
  const shardHaloMat = new THREE.MeshStandardMaterial({
    color: 0x9c7b45,
    emissive: 0x1fa860,
    emissiveIntensity: 0.65,
    metalness: 0.85,
    roughness: 0.35,
  });
  const shardCoreGeo = new THREE.OctahedronGeometry(0.26, 0);
  const shardHaloGeo = new THREE.TorusGeometry(0.38, 0.025, 6, 18);
  const shardMeshes: THREE.Group[] = Array.from({length: 3}, () => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(shardCoreGeo, shardMat);
    core.scale.set(0.85, 1.35, 0.85);
    const halo = new THREE.Mesh(shardHaloGeo, shardHaloMat);
    halo.rotation.x = Math.PI * 0.35;
    g.add(core, halo);
    g.visible = false;
    scene.add(g);
    return g;
  });

  const totemWoodMat = new THREE.MeshStandardMaterial({
    color: 0x1a151c,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    roughness: 0.88,
  });
  const totemFlameMat = new THREE.MeshStandardMaterial({
    color: 0x3e0b54,
    emissive: 0x9b2ce0,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const totemTetherUniforms = {uTime: {value: 0}};
  const totemTetherMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: totemTetherUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float pulse = 0.55 + 0.45 * sin(vUv.y * 18.0 - uTime * 7.0);
        float core = exp(-pow((vUv.x - 0.5) * 4.5, 2.0));
        float endFade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        vec3 col = mix(vec3(0.45, 0.12, 0.72), vec3(0.85, 0.38, 1.0), pulse * core);
        gl_FragColor = vec4(col, (0.28 + 0.52 * pulse) * endFade);
      }
    `,
  });
  const tetherGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 6, 1, true);
  tetherGeo.rotateX(Math.PI / 2);
  const totemSlots = Array.from({length: 3}, () => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.15, 7), totemWoodMat);
    post.position.y = 1.05;
    const skull = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), totemFlameMat);
    skull.position.y = 2.28;
    const tether = new THREE.Mesh(tetherGeo, totemTetherMat);
    scene.add(tether);
    g.add(post, skull);
    scene.add(g);
    return {group: g, skull, tether};
  });

  // 1-Draw-Call Ethereal Forest Spirit (Low-Poly Merged Silhouette + Master Fresnel/Noise/Dissolve Shader)
  const spiritGroup = new THREE.Group();
  const tagGeoMask = (geo: THREE.BufferGeometry, tagR: number, tagG: number, tagB: number) => {
    const nonIdx = geo.index ? geo.toNonIndexed() : geo;
    const cnt = nonIdx.attributes.position.count;
    const col = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) {
      col[i * 3] = tagR;
      col[i * 3 + 1] = tagG;
      col[i * 3 + 2] = tagB;
    }
    nonIdx.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
    if (!nonIdx.attributes.uv) {
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    }
    return nonIdx;
  };

  const spRobe = new THREE.CylinderGeometry(0.22, 0.58, 1.55, 8, 6, true);
  spRobe.translate(0, 1.05, 0);
  const spHood = new THREE.ConeGeometry(0.24, 0.52, 7);
  spHood.rotateX(0.32);
  spHood.translate(0, 1.94, 0.14);
  const spSkull = new THREE.DodecahedronGeometry(0.15, 0);
  spSkull.translate(0, 1.84, 0.18);
  const spHornL = new THREE.ConeGeometry(0.035, 0.42, 5);
  spHornL.rotateZ(0.42);
  spHornL.rotateX(-0.2);
  spHornL.translate(-0.16, 2.15, 0.1);
  const spHornR = new THREE.ConeGeometry(0.035, 0.42, 5);
  spHornR.rotateZ(-0.42);
  spHornR.rotateX(-0.2);
  spHornR.translate(0.16, 2.15, 0.1);
  const spArmL = new THREE.CylinderGeometry(0.045, 0.025, 0.72, 5);
  spArmL.rotateX(Math.PI * 0.36);
  spArmL.rotateZ(0.28);
  spArmL.translate(-0.34, 1.38, 0.3);
  const spArmR = new THREE.CylinderGeometry(0.045, 0.025, 0.72, 5);
  spArmR.rotateX(Math.PI * 0.36);
  spArmR.rotateZ(-0.28);
  spArmR.translate(0.34, 1.38, 0.3);
  const spHeart = new THREE.OctahedronGeometry(0.13, 0);
  spHeart.scale(0.85, 1.25, 0.75);
  spHeart.translate(0, 1.36, 0.24);
  const spEyeL = new THREE.BoxGeometry(0.055, 0.025, 0.04);
  spEyeL.translate(-0.06, 1.84, 0.3);
  const spEyeR = new THREE.BoxGeometry(0.055, 0.025, 0.04);
  spEyeR.translate(0.06, 1.84, 0.3);

  const spiritParts = [
    tagGeoMask(spRobe, 0, 0, 1),
    tagGeoMask(spHood, 0, 0, 1),
    tagGeoMask(spSkull, 0, 0, 0.7),
    tagGeoMask(spHornL, 0, 0, 0.6),
    tagGeoMask(spHornR, 0, 0, 0.6),
    tagGeoMask(spArmL, 0, 0, 1),
    tagGeoMask(spArmR, 0, 0, 1),
    tagGeoMask(spHeart, 1, 0, 0),
    tagGeoMask(spEyeL, 0, 1, 0),
    tagGeoMask(spEyeR, 0, 1, 0),
  ];
  const mergedSpiritGeo = mergeGeometries(spiritParts, false);
  spiritParts.forEach((p) => p.dispose());

  const spiritUniforms = {uTime: {value: 0}};
  const spiritMasterShader = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true,
    uniforms: spiritUniforms,
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying vec3 vMask;
      uniform float uTime;
      void main() {
        vMask = color;
        vec3 pos = position;
        float bob = sin(uTime * 2.15) * 0.09;
        pos.y += bob;
        // Cloth wind wave strongest along lower robe hem & outstretched sleeves
        float hem = clamp((1.75 - pos.y) / 1.45, 0.0, 1.0);
        float clothWave = sin(uTime * 3.4 + pos.y * 4.5 + pos.x * 5.0) * 0.08 * hem * vMask.b;
        pos.x += clothWave;
        pos.z += cos(uTime * 2.7 + pos.y * 3.8) * 0.055 * hem * vMask.b;
        vLocalPos = pos;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewPos = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      varying vec3 vMask;
      uniform float uTime;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.35);

        // Swirling ethereal smoke noise
        float smoke = noise2D(vLocalPos.xy * 4.2 + vec2(uTime * 0.45, -uTime * 0.9)) * 0.65
                    + noise2D(vLocalPos.zy * 7.5 - vec2(uTime * 0.8, uTime * 1.3)) * 0.35;

        // Pulsing quest crystal heart shining through chest
        if (vMask.r > 0.5) {
          float pulse = 1.15 + 0.45 * sin(uTime * 4.2);
          vec3 heartCol = vec3(0.32, 1.45, 0.88) * (pulse + fresnel * 0.6);
          gl_FragColor = vec4(heartCol, 0.96);
          return;
        }
        // Hollow hooded glowing eyes
        if (vMask.g > 0.5) {
          gl_FragColor = vec4(0.85, 1.55, 1.05, 0.98);
          return;
        }

        // Ragged dissolving bottom hem (never touches earth rigidly)
        float dissolveBand = smoothstep(0.24, 0.92, vLocalPos.y);
        float edgeAlpha = smoothstep(0.22, 0.68, dissolveBand + smoke * 0.52);
        if (edgeAlpha < 0.06) discard;

        vec3 coreDark = vec3(0.04, 0.14, 0.11);
        vec3 rimEmerald = vec3(0.24, 1.25, 0.68);
        vec3 col = mix(coreDark, rimEmerald, clamp(fresnel * 1.15 + smoke * 0.25, 0.0, 1.0));
        float alpha = edgeAlpha * clamp(0.26 + fresnel * 0.72 + smoke * 0.14, 0.15, 0.92);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const spiritMesh = new THREE.Mesh(mergedSpiritGeo, spiritMasterShader);
  const spiritFliesCount = 18;
  const spiritFliesMat = new THREE.MeshBasicMaterial({color: 0x4bffa4});
  const spiritFliesMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.032, 0),
    spiritFliesMat,
    spiritFliesCount,
  );
  spiritGroup.add(spiritMesh, spiritFliesMesh);
  scene.add(spiritGroup);

  // Tab Target-Lock Runic Reticle (procedural amber/gold Slavic compass ground disc + diamond beacon)
  const targetLockGroup = new THREE.Group();
  const targetLockGeo = new THREE.PlaneGeometry(2.0, 2.0);
  targetLockGeo.rotateX(-Math.PI / 2);
  const targetLockMat = makeSlavicRunicDiscMaterial(0xe07026, 0xffd27a, 'target');
  const lockRingOuter = new THREE.Mesh(targetLockGeo, targetLockMat);
  const lockBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    new THREE.MeshBasicMaterial({color: 0xe88338}),
  );
  lockBeacon.position.y = 2.25;
  targetLockGroup.add(lockRingOuter, lockBeacon);
  targetLockGroup.visible = false;
  scene.add(targetLockGroup);

  // Projectile Pool (up to 16: Mire bolts + Spinning Steel Throwing Daggers)
  const mireBoltGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const mireBoltMat = new THREE.MeshBasicMaterial({color: 0x3be88c});
  const daggerBladeMat = new THREE.MeshStandardMaterial({
    color: 0xc8d2da,
    emissive: 0xe07026,
    emissiveIntensity: 0.55,
    metalness: 0.9,
    roughness: 0.25,
  });
  const daggerHiltMat = new THREE.MeshStandardMaterial({color: 0x8b6a3e, metalness: 0.8, roughness: 0.4});
  const projPool: {mire: THREE.Mesh; dagger: THREE.Group}[] = Array.from({length: 16}, () => {
    const mire = new THREE.Mesh(mireBoltGeo, mireBoltMat);
    mire.visible = false;
    scene.add(mire);

    const dagger = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.46, 4), daggerBladeMat);
    blade.rotation.x = Math.PI / 2;
    blade.position.z = 0.14;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.045), daggerHiltMat);
    guard.position.z = -0.06;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.18, 6), daggerHiltMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = -0.15;
    dagger.add(blade, guard, handle);
    dagger.visible = false;
    scene.add(dagger);
    return {mire, dagger};
  });

  // Zero-GC Pooled Particle Burst Ring Buffer (InstancedMesh, 96 particles)
  const burstCap = 96;
  const burstMat = new THREE.MeshBasicMaterial({color: 0xffffff});
  const burstInstanced = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.08, 0),
    burstMat,
    burstCap,
  );
  burstInstanced.frustumCulled = false;
  const bursts: BurstParticle[] = Array.from({length: burstCap}, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.4,
    isNav: false,
  }));
  let burstCursor = 0;
  scene.add(burstInstanced);

  // Zero-GC Metal-on-Metal Sparks Pool (64 stretched glowing sparks)
  const sparkCap = 64;
  const sparkMat = new THREE.MeshBasicMaterial({color: 0xffffff});
  const sparkInstanced = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.03, 0.03, 0.24),
    sparkMat,
    sparkCap,
  );
  sparkInstanced.frustumCulled = false;
  const sparks: BurstParticle[] = Array.from({length: sparkCap}, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.25,
    isNav: false,
  }));
  let sparkCursor = 0;
  scene.add(sparkInstanced);

  // Zero-GC Ground Dust Puff Pool (48 footstep & dash puffs)
  const dustCap = 48;
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x6f685a,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const dustInstanced = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.14, 0),
    dustMat,
    dustCap,
  );
  dustInstanced.frustumCulled = false;
  const dusts: DustParticle[] = Array.from({length: dustCap}, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.42,
  }));
  let dustCursor = 0;
  scene.add(dustInstanced);

  // Zero-GC 12-slot Expanding Slash / Blast Runic Shockwave Disc Pool + 2-Light Dynamic Spell Light Pool
  const slashGeo = new THREE.PlaneGeometry(2.2, 2.2);
  slashGeo.rotateX(-Math.PI / 2);
  const slashRingPool: SlashRingSlot[] = Array.from({length: 12}, () => {
    const mat = makeSlavicRunicDiscMaterial(0xe07026, 0xffd27a, 'slash');
    const mesh = new THREE.Mesh(slashGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      mat,
      active: false,
      life: 0,
      maxLife: 0.34,
      startScale: 0.45,
      endScale: 2.0,
    };
  });
  let slashRingCursor = 0;

  const spellLightPool = Array.from({length: 2}, () => {
    const light = new THREE.PointLight(0xe07026, 0, 14, 1.5);
    light.visible = false;
    scene.add(light);
    return {light, life: 0, maxLife: 0.36, peakIntensity: 18};
  });
  let spellLightCursor = 0;

  // Postprocessing (GPU high/ultra only: Selective HDR Bloom > 1.05 + Cool Grading + Vignette + ACES Filmic)
  let composer: EffectComposer | null = null;
  const initComposer = (usePost: boolean) => {
    composer?.dispose();
    composer = null;
    if (!isSoftwareGl && usePost) {
      renderer.toneMapping = THREE.NoToneMapping;
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new BloomEffect({
        mipmapBlur: true,
        luminanceThreshold: 1.05,
        luminanceSmoothing: 0.14,
        intensity: 0.9,
        radius: 0.56,
      });
      const colorGrade = new HueSaturationEffect({hue: 0.02, saturation: -0.08});
      const contrast = new BrightnessContrastEffect({brightness: -0.02, contrast: 0.08});
      const vignette = new VignetteEffect({offset: 0.34, darkness: 0.54});
      const chromatic = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.00035, 0.00035),
        radialModulation: true,
        modulationOffset: 0.25,
      });
      const tone = new ToneMappingEffect({mode: ToneMappingMode.ACES_FILMIC});
      composer.addPass(
        new EffectPass(camera, bloom, colorGrade, contrast, chromatic, vignette, tone),
      );
      composer.setSize(renderer.domElement.clientWidth || width, renderer.domElement.clientHeight || height);
    } else {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
  };
  initComposer(preset.postprocessing);

  let cameraStyle: CameraStyleId = initialCamStyle;
  let orbitYaw = 0; // 0 looks North (-Z)
  let orbitPitch = 0.62; // radians above ground
  let orbitZoom = 11.5;
  let saluteTimer = 0;
  let gateOpenFrac = 0;
  let elapsed = 0;
  let wasMirrorRevealed = initialSim.quest.echoShrine.revealed;

  const spawnBurstParticles = (x: number, y: number, z: number, count: number, isNav: boolean) => {
    for (let i = 0; i < count; i++) {
      const p = bursts[burstCursor];
      burstCursor = (burstCursor + 1) % burstCap;
      const a = Math.random() * Math.PI * 2;
      const spd = 2.2 + Math.random() * 4.5;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(a) * spd;
      p.vy = 1.6 + Math.random() * 3.4;
      p.vz = Math.sin(a) * spd;
      p.maxLife = 0.28 + Math.random() * 0.24;
      p.life = p.maxLife;
      p.isNav = isNav;
    }
  };

  const spawnSparks = (ev: SparkEvent) => {
    const count = ev.metal ? 12 : 7;
    for (let i = 0; i < count; i++) {
      const s = sparks[sparkCursor];
      sparkCursor = (sparkCursor + 1) % sparkCap;
      const a = Math.random() * Math.PI * 2;
      const spd = 4.2 + Math.random() * 6.5;
      s.active = true;
      s.x = ev.x;
      s.y = ev.y;
      s.z = ev.z;
      s.vx = Math.cos(a) * spd;
      s.vy = 2.4 + Math.random() * 4.8;
      s.vz = Math.sin(a) * spd;
      s.maxLife = 0.16 + Math.random() * 0.14;
      s.life = s.maxLife;
      s.isNav = ev.isNav;
    }
  };

  const spawnDust = (ev: DustEvent) => {
    const ground = worldTerrainHeight(ev.x, ev.z);
    for (let i = 0; i < ev.count; i++) {
      const d = dusts[dustCursor];
      dustCursor = (dustCursor + 1) % dustCap;
      const a = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 1.9;
      d.active = true;
      d.x = ev.x + Math.cos(a) * 0.22;
      d.y = ground + 0.08;
      d.z = ev.z + Math.sin(a) * 0.22;
      d.vx = Math.cos(a) * spd;
      d.vy = 0.45 + Math.random() * 0.75;
      d.vz = Math.sin(a) * spd;
      d.maxLife = 0.34 + Math.random() * 0.18;
      d.life = d.maxLife;
    }
  };

  const spawnSlashFx = (ev: SlashEffectEvent) => {
    const color =
      ev.type === 'playerHit'
        ? 0xa82024
        : ev.type === 'svarogWard'
          ? 0xffb84d
          : ev.isNav
            ? 0x3be88c
            : 0xe07026;
    const secondary = ev.type === 'svarogWard' ? 0xfff0c2 : ev.isNav ? 0xa3ffd0 : 0xffd27a;
    const slot = slashRingPool[slashRingCursor];
    slashRingCursor = (slashRingCursor + 1) % slashRingPool.length;
    slot.mat.uniforms.uColor.value.setHex(color);
    slot.mat.uniforms.uColor2.value.setHex(secondary);
    slot.mat.uniforms.uTime.value = elapsed;
    slot.mat.uniforms.uProgress.value = 0;
    slot.mesh.position.set(ev.x, worldTerrainHeight(ev.x, ev.z) + 0.14, ev.z);
    slot.mesh.rotation.y = ev.yaw;
    slot.startScale = 0.45;
    slot.endScale = Math.max(1.3, ev.radius * 0.95);
    slot.mesh.scale.setScalar(slot.startScale);
    slot.maxLife = 0.34;
    slot.life = 0.34;
    slot.active = true;
    slot.mesh.visible = true;
    if (
      ev.type === 'shieldWave' ||
      ev.type === 'flameSurge' ||
      ev.type === 'navCleave' ||
      ev.type === 'crescendo' ||
      ev.type === 'whirlwind' ||
      ev.type === 'svarogWard' ||
      ev.type === 'sigilBlast' ||
      (ev.type === 'primary' && ev.isNav)
    ) {
      const slot = spellLightPool[spellLightCursor];
      spellLightCursor = (spellLightCursor + 1) % spellLightPool.length;
      slot.light.color.setHex(color);
      slot.light.position.set(ev.x, worldTerrainHeight(ev.x, ev.z) + 1.15, ev.z);
      slot.maxLife = ev.type === 'crescendo' ? 0.45 : ev.type === 'svarogWard' ? 0.5 : 0.34;
      slot.life = slot.maxLife;
      slot.peakIntensity = ev.type === 'crescendo' ? 28 : ev.type === 'primary' ? 14 : 21;
      slot.light.intensity = slot.peakIntensity;
      slot.light.visible = true;
    }
    spawnBurstParticles(ev.x, worldTerrainHeight(ev.x, ev.z) + 0.75, ev.z, 10, ev.isNav);
  };

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
    canvas: renderer.domElement,
    get cameraYaw() {
      return cameraStyle === 'iso' ? 0 : orbitYaw;
    },
    get cameraStyle() {
      return cameraStyle;
    },
    setCameraStyle: (style) => {
      cameraStyle = style;
    },
    toggleCameraStyle: () => {
      cameraStyle = cameraStyle === 'orbit' ? 'iso' : 'orbit';
      return cameraStyle;
    },
    applyOrbitInput: (dx, dy, zoomDelta) => {
      if (cameraStyle === 'orbit') {
        orbitYaw -= dx * 0.0055;
        orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * 0.0045, 0.26, 1.22);
      }
      if (zoomDelta !== 0) {
        orbitZoom = THREE.MathUtils.clamp(orbitZoom + zoomDelta * 0.9, 6.2, 21.0);
      }
    },
    setGraphicsQuality: (quality) => {
      preset = GRAPHICS_PRESETS[quality];
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, preset.pixelRatioMax),
      );
      renderer.shadowMap.enabled = !isSoftwareGl && preset.shadowsEnabled;
      moonKey.castShadow = !isSoftwareGl && preset.shadowsEnabled;
      worldRig.applyGraphicsTier(preset);
      worldRig.campfireLights.forEach((l) => {
        l.castShadow = !isSoftwareGl && preset.shadowsEnabled && preset.shadowMapSize >= 1024;
      });
      initComposer(preset.postprocessing);
    },
    triggerHeroSalute: () => {
      saluteTimer = 0.65;
      spawnSparks({
        x: heroRig.group.position.x,
        y: heroRig.group.position.y + 1.15,
        z: heroRig.group.position.z + 0.25,
        isNav: false,
        metal: true,
      });
    },
    tryPickHeroPreview: (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hits = _raycaster.intersectObject(heroRig.group, true);
      if (hits.length > 0) {
        saluteTimer = 0.65;
        spawnSparks({
          x: heroRig.group.position.x,
          y: heroRig.group.position.y + 1.15,
          z: heroRig.group.position.z + 0.25,
          isNav: false,
          metal: true,
        });
        return true;
      }
      return false;
    },
    spawnSlashFx,
    spawnSparks,
    spawnDust,
    rebuildWorld: (sim) => {
      while (worldGroup.children.length > 0) {
        worldGroup.remove(worldGroup.children[0]);
      }
      worldRig = buildWorldEnvironment(
        worldGroup as unknown as THREE.Scene,
        sim.layout,
        textures,
        preset,
      );
      worldRig.campfireLights.forEach((l) => {
        l.castShadow = !isSoftwareGl && preset.shadowsEnabled && preset.shadowMapSize >= 1024;
      });
      syncNpcs(sim);
      syncEnemyRigs(sim);
      heroRig.resetTrail();
      for (const sr of slashRingPool) {
        sr.active = false;
        sr.mesh.visible = false;
      }
      orbitYaw = 0;
      gateOpenFrac = 0;
      wasMirrorRevealed = sim.quest.echoShrine.revealed;
    },
    resize: (w, h) => {
      const nw = Math.max(1, w);
      const nh = Math.max(1, h);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer?.setSize(nw, nh);
      if (composer) composer.render(1 / 60);
      else renderer.render(scene, camera);
    },
    renderFrame: (sim, phase, transitionFrac, rawDt, afterFrame) => {
      const dt = Math.min(rawDt, 0.05);
      const isHitstopFrozen = sim.hitstopTimer > 0 && phase === 'playing';
      if (!isHitstopFrozen) {
        elapsed += dt;
      }
      saluteTimer = Math.max(0, saluteTimer - dt);

      // Background Web Worker spatial & secondary cloth calculation (off main thread!)
      _spatialEnemyTmp.length = 0;
      for (const e of sim.enemies) {
        _spatialEnemyTmp.push({
          id: e.id,
          x: e.x,
          z: e.z,
          vx: e.vx,
          vz: e.vz,
          radius: e.radius,
          ko: e.state === 'ko',
        });
      }
      const workerState = spatialWorker.dispatch(
        elapsed,
        sim.heroX,
        sim.heroZ,
        sim.heroVx,
        sim.heroVz,
        phase === 'title' ? -0.45 : sim.heroYaw,
        _spatialEnemyTmp,
      );

      // Update atmosphere & Nav blend (deep exponential twilight fog hides horizon boundaries cleanly)
      _skyCur.copy(_skyYav).lerp(_skyNav, sim.navBlend);
      (scene.background as THREE.Color).copy(_skyCur);
      fog.color.copy(_skyCur);
      fog.density = 0.022 + sim.navBlend * 0.011;
      moonKey.intensity = 1.72 - sim.navBlend * 0.55;

      // Directional shadow frustum follows player cleanly
      moonKey.position.set(sim.heroX - 14, 24, sim.heroZ + 12);
      moonKey.target.position.set(sim.heroX, 0, sim.heroZ);

      const groundY = worldTerrainHeight(sim.heroX, sim.heroZ);

      // Rear hero rim light tracks opposite camera vector to keep silhouette crisp against dark forest
      const camToHeroX = sim.heroX - camera.position.x;
      const camToHeroZ = sim.heroZ - camera.position.z;
      const camLen = Math.max(0.01, Math.hypot(camToHeroX, camToHeroZ));
      heroRimLight.position.set(
        sim.heroX + (camToHeroX / camLen) * 5.2,
        groundY + sim.heroY + 3.8,
        sim.heroZ + (camToHeroZ / camLen) * 5.2,
      );
      heroRimLight.target.position.set(sim.heroX, groundY + sim.heroY + 1.05, sim.heroZ);
      heroRimLight.intensity = phase === 'title' ? 2.65 : 2.25 - sim.navBlend * 0.35;

      let loreMask = 0;
      for (let li = 0; li < sim.quest.loreStones.length; li++) {
        if (sim.quest.loreStones[li].discovered) loreMask |= 1 << li;
      }
      gateOpenFrac += ((sim.navGateOpen ? 1 : 0) - gateOpenFrac) * Math.min(1, dt * 2.4);
      worldRig.animate(elapsed, sim.navBlend, gateOpenFrac, sim.heroX, sim.heroZ, loreMask);

      // Environment Awareness & Look-At IK: pick locked target > close NPC > close Altar
      const heroYawVisual = phase === 'title' ? -0.45 : sim.heroYaw;
      const aheadY = worldTerrainHeight(
        sim.heroX + Math.sin(heroYawVisual) * 0.45,
        sim.heroZ + Math.cos(heroYawVisual) * 0.45,
      );
      const groundSlopePitch = THREE.MathUtils.clamp((groundY - aheadY) * 1.4, -0.35, 0.35);

      let nearestFireDist = 99;
      for (const cf of sim.layout.campfires) {
        nearestFireDist = Math.min(nearestFireDist, Math.hypot(sim.heroX - cf.x, sim.heroZ - cf.z));
      }

      let lookLocalYaw: number | undefined;
      let lookLocalPitch: number | undefined;
      const lockedEnemy = getLockedTarget(sim);
      if (lockedEnemy) {
        const worldLookYaw = Math.atan2(lockedEnemy.x - sim.heroX, lockedEnemy.z - sim.heroZ);
        let diff = worldLookYaw - heroYawVisual;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        lookLocalYaw = diff;
        lookLocalPitch = 0.04;
      } else {
        let bestDist = 5.6;
        let poiX = 0;
        let poiZ = 0;
        let hasPoi = false;
        for (const npc of sim.layout.npcs) {
          const d = Math.hypot(npc.x - sim.heroX, npc.z - sim.heroZ);
          if (d < bestDist) {
            bestDist = d;
            poiX = npc.x;
            poiZ = npc.z;
            hasPoi = true;
          }
        }
        for (const alt of sim.layout.altars) {
          const d = Math.hypot(alt.x - sim.heroX, alt.z - sim.heroZ);
          if (d < bestDist) {
            bestDist = d;
            poiX = alt.x;
            poiZ = alt.z;
            hasPoi = true;
          }
        }
        if (hasPoi) {
          const worldLookYaw = Math.atan2(poiX - sim.heroX, poiZ - sim.heroZ);
          let diff = worldLookYaw - heroYawVisual;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          lookLocalYaw = diff;
          lookLocalPitch = -0.05;
        }
      }

      // Hero transform & layered IK animation (frozen cleanly during hitstop!)
      heroRig.group.position.set(sim.heroX, groundY + sim.heroY, sim.heroZ);
      heroRig.group.rotation.y = heroYawVisual;
      heroRig.animate(elapsed, phase === 'title' ? 0 : sim.heroSpeedRatio, {
        strideDist: sim.heroStrideDist,
        actionLock: sim.actionLock,
        attackFrac: sim.attackAnimTimer > 0 ? sim.attackAnimTimer / 0.36 : 0,
        attackCombo: sim.attackCombo,
        daggerFrac: sim.daggerAnimTimer > 0 ? sim.daggerAnimTimer / 0.24 : 0,
        saluteFrac: saluteTimer > 0 ? saluteTimer / 0.65 : 0,
        jumpY: sim.heroY,
        jumpState: sim.jumpState,
        jumpSquash: sim.jumpSquash,
        hitFlash: sim.heroHitFlash,
        lookLocalYaw,
        lookLocalPitch,
        campfireDist: nearestFireDist,
        cloakBackLag: workerState.cloakBackLag,
        cloakSideSwing: workerState.cloakSideSwing,
        cloakFlutter: workerState.cloakFlutter,
        windGust: workerState.windGust,
        groundSlopePitch,
        torchShadowEnabled: !isSoftwareGl && preset.shadowsEnabled && preset.shadowMapSize >= 1024,
        sprintFactor: sim.heroSprintFactor,
        navShifted: sim.navShifted,
        isCounter: sim.counterTimer > 0,
      });
      if (phase === 'title') {
        heroRig.resetTrail();
      }

      wardGroup.visible = phase === 'playing' && sim.wardTimer > 0.02;
      if (wardGroup.visible) {
        wardGroup.position.set(sim.heroX, groundY + sim.heroY, sim.heroZ);
        wardGroundMat.uniforms.uTime.value = elapsed;
        wardGroundMat.uniforms.uIntensity.value = Math.min(1, sim.wardTimer / 0.4) * 0.95;
        wardHaloA.rotation.y = elapsed * 2.8;
        wardHaloA.rotation.z = elapsed * 1.4;
        wardHaloB.rotation.y = -elapsed * 2.4;
        wardHaloB.rotation.z = -elapsed * 1.6;
        const pulse = 0.96 + Math.sin(elapsed * 8.0) * 0.05;
        wardHaloA.scale.setScalar(pulse);
        wardHaloB.scale.setScalar(pulse);
      }

      // NPCs & Enemies sync with Root-Motion Foot IK (<=20m) & AI LOD (>20m)
      for (const npc of npcRigs) {
        npc.rig.animate(elapsed);
      }
      syncEnemyRigs(sim);
      let teleIdx = 0;
      const frameIdx = Math.floor(elapsed * 60);
      for (let ei = 0; ei < sim.enemies.length; ei++) {
        const e = sim.enemies[ei];
        const rig = enemyRigs.get(e.id);
        const distToHero = Math.hypot(e.x - sim.heroX, e.z - sim.heroZ);
        if (rig) {
          const useIk = distToHero <= 20.0;
          const isClose = distToHero < 20.0 || e.state === 'windup' || e.id === sim.lockedTargetId;
          if (isClose || (frameIdx + ei) % 4 === 0) {
            let footOffsetL = 0;
            let footOffsetR = 0;
            if (useIk) {
              const hipY = rig.group.position.y;
              const sideCos = Math.cos(e.yaw) * 0.26;
              const sideSin = Math.sin(e.yaw) * 0.26;
              footOffsetL = worldTerrainHeight(e.x - sideCos, e.z + sideSin) - hipY;
              footOffsetR = worldTerrainHeight(e.x + sideCos, e.z - sideSin) - hipY;
            }
            _locoTmp.strideDist = e.strideDist;
            _locoTmp.speedRatio = e.speedRatio;
            _locoTmp.turnStepDir = e.turnStepDir;
            _locoTmp.footOffsetL = footOffsetL;
            _locoTmp.footOffsetR = footOffsetR;
            _locoTmp.useIk = useIk;
            _locoTmp.darkShielded = isEnemyDarknessShielded(sim.quest, e.id);
            rig.animate(elapsed, sim.navBlend, e.state, e.hitFlashTimer, e.koTimer, _locoTmp);
          }
          const shadowMaxDist = e.archetype === 'leshy' ? 20.0 : 14.0;
          const wantShadow = !isSoftwareGl && preset.shadowsEnabled && distToHero < shadowMaxDist;
          if (rig.group.userData.shadowState !== wantShadow) {
            rig.group.userData.shadowState = wantShadow;
            rig.group.traverse((obj) => {
              if (obj instanceof THREE.Mesh) obj.castShadow = wantShadow;
            });
          }
        }
        if (e.state === 'windup' && teleIdx < telegraphPool.length) {
          const ring = telegraphPool[teleIdx];
          const tMat = telegraphMats[teleIdx++];
          ring.visible = true;
          ring.position.set(
            e.attackTargetX,
            worldTerrainHeight(e.attackTargetX, e.attackTargetZ) + 0.1,
            e.attackTargetZ,
          );
          tMat.uniforms.uTime.value = elapsed;
          const pulse = 0.94 + Math.sin(elapsed * 16) * 0.06;
          ring.scale.setScalar(e.attackRadius * pulse);
        }
      }
      for (let i = teleIdx; i < telegraphPool.length; i++) {
        telegraphPool[i].visible = false;
      }

      // Lazy-streamed Diegetic Quest World Props (updates only within <=36m)
      const mir = sim.quest.echoShrine;
      if (mir.revealed && !wasMirrorRevealed) {
        wasMirrorRevealed = true;
        spawnSlashFx({
          type: 'navCleave',
          x: mir.x,
          z: mir.z,
          yaw: 0,
          radius: 3.0,
          isNav: true,
        });
        spawnSparks({
          x: mir.x,
          y: worldTerrainHeight(mir.x, mir.z) + 1.2,
          z: mir.z,
          isNav: true,
          metal: true,
        });
      }
      const distMir = Math.hypot(mir.x - sim.heroX, mir.z - sim.heroZ);
      mirrorGroup.visible = distMir <= 36;
      shrineLight.visible = mirrorGroup.visible && distMir <= 26;
      if (mirrorGroup.visible) {
        mirrorGroup.position.set(mir.x, worldTerrainHeight(mir.x, mir.z), mir.z);
        const pulse = 1.15 + Math.sin(elapsed * 3.8) * 0.32 + (sim.nearMirror ? 0.55 : 0);
        idolEyeMat.emissiveIntensity = mir.revealed ? pulse * 1.45 : pulse + sim.navBlend * 0.65;
        censerPivot.rotation.z = Math.sin(elapsed * 1.7) * 0.085;
        censerPivot.rotation.x = Math.cos(elapsed * 1.3) * 0.06;
        volBeamMat.uniforms.uIntensity.value = sim.nearMirror ? 0.42 : 0.26;
        shrineLight.intensity = 15 + Math.sin(elapsed * 5.2) * 3.5 + (sim.nearMirror ? 6 : 0);

        shrineAuraMat.uniforms.uTime.value = elapsed;
        shrineAuraMat.uniforms.uIntensity.value = mir.revealed ? 0.95 : sim.nearMirror ? 0.65 : 0.32;

        // Floating hand/rune prompt beacon when player is in interaction range
        mirrorHandBeacon.visible = sim.nearMirror;
        if (sim.nearMirror) {
          mirrorHandBeacon.position.y = 2.95 + Math.sin(elapsed * 3.6) * 0.14;
          mirrorHandBeacon.rotation.y = elapsed * 1.8;
        }

        // Fireflies orbiting carved shrine (quicken & tighten when near!)
        const flyRadius = sim.nearMirror ? 0.95 : 1.35;
        for (let fi = 0; fi < mirrorFlyCount; fi++) {
          const ang = elapsed * (1.2 + (fi % 3) * 0.35) + (fi / mirrorFlyCount) * Math.PI * 2;
          const fy = 0.75 + ((fi * 0.37 + elapsed * 0.4) % 2.1);
          _dummy.position.set(Math.cos(ang) * flyRadius, fy, Math.sin(ang) * flyRadius);
          _dummy.scale.setScalar(sim.nearMirror ? 1.15 : 0.72);
          _dummy.rotation.set(0, 0, 0);
          _dummy.updateMatrix();
          mirrorFliesMesh.setMatrixAt(fi, _dummy.matrix);
        }
        mirrorFliesMesh.instanceMatrix.needsUpdate = true;
      }

      // Ancestral Spirit Wisps guiding the Vityaz from the awakened Shrine toward uncollected Echo Shards
      if (mir.revealed && !sim.quest.echoCompleted && distMir <= 45) {
        let targetShard = sim.quest.echoShards.find((s) => !s.collected);
        if (targetShard) {
          echoWispsMesh.visible = true;
          for (let wi = 0; wi < echoWispCount; wi++) {
            const frac = (elapsed * 0.28 + wi / echoWispCount) % 1;
            const wx = THREE.MathUtils.lerp(mir.x, targetShard.x, frac) + Math.sin(elapsed * 2.4 + wi) * 0.6;
            const wz = THREE.MathUtils.lerp(mir.z, targetShard.z, frac) + Math.cos(elapsed * 2.1 + wi) * 0.6;
            const wy = worldTerrainHeight(wx, wz) + 0.35 + Math.sin(elapsed * 4.2 + wi) * 0.2;
            _dummy.position.set(wx, wy, wz);
            _dummy.scale.setScalar(Math.sin(frac * Math.PI) * 1.15);
            _dummy.rotation.set(0, elapsed + wi, 0);
            _dummy.updateMatrix();
            echoWispsMesh.setMatrixAt(wi, _dummy.matrix);
          }
          echoWispsMesh.instanceMatrix.needsUpdate = true;
        } else {
          echoWispsMesh.visible = false;
        }
      } else {
        echoWispsMesh.visible = false;
      }

      for (let i = 0; i < sim.quest.echoShards.length; i++) {
        const sh = sim.quest.echoShards[i];
        const m = shardMeshes[i];
        const distSh = Math.hypot(sh.x - sim.heroX, sh.z - sim.heroZ);
        if (mir.revealed && !sh.collected && distSh <= 36) {
          m.visible = true;
          m.position.set(sh.x, worldTerrainHeight(sh.x, sh.z) + 0.95 + Math.sin(elapsed * 3.4 + i) * 0.16, sh.z);
          m.rotation.y = elapsed * 2.0;
          if (m.children[1]) {
            m.children[1].rotation.z = elapsed * 2.6;
          }
        } else {
          m.visible = false;
        }
      }

      totemTetherUniforms.uTime.value = elapsed;
      const barrowBoss = sim.enemies.find((e) => e.id === 'e_barrow_elite' && e.state !== 'ko');
      for (let i = 0; i < sim.quest.cursedTotems.length; i++) {
        const tot = sim.quest.cursedTotems[i];
        const slot = totemSlots[i];
        const distTot = Math.hypot(tot.x - sim.heroX, tot.z - sim.heroZ);
        slot.group.visible = !tot.burned && distTot <= 34;
        if (slot.group.visible) {
          const ty = worldTerrainHeight(tot.x, tot.z);
          slot.group.position.set(tot.x, ty, tot.z);
          slot.skull.rotation.y = elapsed * 2.5 + i;
          if (barrowBoss && distTot <= 30) {
            slot.tether.visible = true;
            const by = worldTerrainHeight(barrowBoss.x, barrowBoss.z) + 1.1;
            const sx = tot.x;
            const sy = ty + 2.2;
            const sz = tot.z;
            const dBeam = Math.hypot(barrowBoss.x - sx, by - sy, barrowBoss.z - sz);
            slot.tether.position.set((sx + barrowBoss.x) * 0.5, (sy + by) * 0.5, (sz + barrowBoss.z) * 0.5);
            slot.tether.scale.set(1, 1, dBeam);
            slot.tether.lookAt(barrowBoss.x, by, barrowBoss.z);
          } else {
            slot.tether.visible = false;
          }
        } else {
          slot.tether.visible = false;
        }
      }

      const bSpirit = sim.quest.bargainSpirit;
      const distSp = Math.hypot(bSpirit.x - sim.heroX, bSpirit.z - sim.heroZ);
      spiritGroup.visible = bSpirit.outcome === 'pending' && distSp <= 34;
      if (spiritGroup.visible) {
        spiritUniforms.uTime.value = elapsed;
        spiritGroup.position.set(bSpirit.x, worldTerrainHeight(bSpirit.x, bSpirit.z), bSpirit.z);
        spiritGroup.rotation.y = Math.atan2(sim.heroX - bSpirit.x, sim.heroZ - bSpirit.z);
        for (let fi = 0; fi < spiritFliesCount; fi++) {
          const ang = elapsed * (1.35 + (fi % 4) * 0.25) + (fi / spiritFliesCount) * Math.PI * 2;
          const r = 0.85 + Math.sin(elapsed * 2 + fi) * 0.28;
          _dummy.position.set(
            Math.cos(ang) * r,
            0.55 + ((fi * 0.31 + elapsed * 0.5) % 1.9),
            Math.sin(ang) * r,
          );
          _dummy.scale.setScalar(0.65 + 0.35 * Math.sin(elapsed * 6 + fi));
          _dummy.rotation.set(0, 0, 0);
          _dummy.updateMatrix();
          spiritFliesMesh.setMatrixAt(fi, _dummy.matrix);
        }
        spiritFliesMesh.instanceMatrix.needsUpdate = true;
      }

      // Tab Target-Lock 3D Reticle
      if (lockedEnemy && phase === 'playing') {
        targetLockGroup.visible = true;
        targetLockGroup.position.set(
          lockedEnemy.x,
          worldTerrainHeight(lockedEnemy.x, lockedEnemy.z) + 0.1,
          lockedEnemy.z,
        );
        const lockScale = Math.max(0.85, lockedEnemy.radius * 1.4) * (1 + Math.sin(elapsed * 7.5) * 0.05);
        lockRingOuter.scale.setScalar(lockScale);
        lockRingOuter.rotation.y = elapsed * 1.2;
        targetLockMat.uniforms.uTime.value = elapsed;
        lockBeacon.position.y = 2.05 + lockedEnemy.radius * 0.45 + Math.sin(elapsed * 5.2) * 0.12;
        lockBeacon.rotation.y = elapsed * 3.0;
      } else {
        targetLockGroup.visible = false;
      }

      // Decay dynamic spell flash lights cleanly (zero-GC)
      for (let i = 0; i < spellLightPool.length; i++) {
        const sl = spellLightPool[i];
        if (sl.life > 0) {
          sl.life = Math.max(0, sl.life - dt);
          const frac = sl.life / sl.maxLife;
          sl.light.intensity = sl.peakIntensity * frac * frac;
          if (sl.life <= 0) sl.light.visible = false;
        }
      }

      // Sigils, Orbs, Projectiles (Mire Bolts + Spinning Steel Throwing Daggers)
      for (let i = 0; i < sigilPool.length; i++) {
        const sig = sim.sigils[i];
        if (sig) {
          sigilPool[i].visible = true;
          sigilPool[i].position.set(sig.x, worldTerrainHeight(sig.x, sig.z) + 0.11, sig.z);
          sigilPool[i].rotation.y = elapsed * 0.85;
          sigilPool[i].scale.setScalar(sig.radius * 0.95);
          sigilMats[i].uniforms.uTime.value = elapsed;
        } else {
          sigilPool[i].visible = false;
        }
      }
      for (let i = 0; i < orbPool.length; i++) {
        const orb = sim.vesselOrbs[i];
        if (orb) {
          orbPool[i].visible = true;
          orbPool[i].position.set(orb.x, worldTerrainHeight(orb.x, orb.z) + 0.85 + Math.sin(elapsed * 3) * 0.14, orb.z);
          orbPool[i].rotation.y = elapsed * 2.2;
        } else {
          orbPool[i].visible = false;
        }
      }
      for (let i = 0; i < projPool.length; i++) {
        const p = sim.projectiles[i];
        const slot = projPool[i];
        if (p) {
          const py = worldTerrainHeight(p.x, p.z) + 0.95;
          if (p.kind === 'dagger') {
            slot.mire.visible = false;
            slot.dagger.visible = true;
            slot.dagger.position.set(p.x, py, p.z);
            slot.dagger.rotation.set(0, p.yaw, elapsed * 24);
          } else {
            slot.dagger.visible = false;
            slot.mire.visible = true;
            slot.mire.position.set(p.x, py, p.z);
          }
        } else {
          slot.mire.visible = false;
          slot.dagger.visible = false;
        }
      }

      // Active pooled expanding runic slash / shockwave discs (zero-GC)
      for (let i = 0; i < slashRingPool.length; i++) {
        const sr = slashRingPool[i];
        if (!sr.active) continue;
        sr.life -= dt;
        const t = 1 - Math.max(0, sr.life / sr.maxLife);
        sr.mesh.scale.setScalar(THREE.MathUtils.lerp(sr.startScale, sr.endScale, t));
        sr.mat.uniforms.uTime.value = elapsed;
        sr.mat.uniforms.uProgress.value = t;
        if (sr.life <= 0) {
          sr.active = false;
          sr.mesh.visible = false;
        }
      }

      // Update zero-GC particle burst pool
      let visibleBursts = 0;
      for (let i = 0; i < burstCap; i++) {
        const b = bursts[i];
        if (!b.active) continue;
        b.life -= dt;
        if (b.life <= 0) {
          b.active = false;
          continue;
        }
        b.vy -= 9.5 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        const sc = Math.max(0.01, b.life / b.maxLife);
        _dummy.position.set(b.x, b.y, b.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(sc);
        _dummy.updateMatrix();
        burstInstanced.setMatrixAt(visibleBursts, _dummy.matrix);
        _pColor.setHex(b.isNav ? 0x3be88c : 0xe07026);
        burstInstanced.setColorAt(visibleBursts, _pColor);
        visibleBursts++;
      }
      burstInstanced.count = visibleBursts;
      burstInstanced.instanceMatrix.needsUpdate = true;
      if (burstInstanced.instanceColor) burstInstanced.instanceColor.needsUpdate = true;

      // Update zero-GC metallic spark pool
      let visibleSparks = 0;
      for (let i = 0; i < sparkCap; i++) {
        const s = sparks[i];
        if (!s.active) continue;
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          continue;
        }
        s.vy -= 14.0 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        const sc = Math.max(0.01, s.life / s.maxLife);
        _dummy.position.set(s.x, s.y, s.z);
        _dummy.rotation.set(0, Math.atan2(s.vx, s.vz), 0);
        _dummy.scale.set(sc, sc, sc * 1.45);
        _dummy.updateMatrix();
        sparkInstanced.setMatrixAt(visibleSparks, _dummy.matrix);
        _pColor.setHex(s.isNav ? 0x9cffcf : 0xffd27a);
        sparkInstanced.setColorAt(visibleSparks, _pColor);
        visibleSparks++;
      }
      sparkInstanced.count = visibleSparks;
      sparkInstanced.instanceMatrix.needsUpdate = true;
      if (sparkInstanced.instanceColor) sparkInstanced.instanceColor.needsUpdate = true;

      // Update zero-GC ground dust puff pool
      let visibleDust = 0;
      for (let i = 0; i < dustCap; i++) {
        const d = dusts[i];
        if (!d.active) continue;
        d.life -= dt;
        if (d.life <= 0) {
          d.active = false;
          continue;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        const t = 1 - d.life / d.maxLife;
        const sc = Math.max(0.01, (1 - t) * (0.7 + t * 1.4));
        _dummy.position.set(d.x, d.y, d.z);
        _dummy.rotation.set(t * 2, t * 3, 0);
        _dummy.scale.setScalar(sc);
        _dummy.updateMatrix();
        dustInstanced.setMatrixAt(visibleDust, _dummy.matrix);
        visibleDust++;
      }
      dustInstanced.count = visibleDust;
      dustInstanced.instanceMatrix.needsUpdate = true;

      // Camera Choreography: Title Orbit -> Transition Swoop -> Hybrid Orbit/Iso Gameplay
      const activePlayPos = () => {
        if (cameraStyle === 'iso') {
          _targetPos.set(sim.heroX, sim.heroY + orbitZoom * 1.12, sim.heroZ + orbitZoom * 0.92);
          _targetLook.set(sim.heroX, sim.heroY + 1.0, sim.heroZ - 0.8);
        } else {
          const horiz = Math.cos(orbitPitch) * orbitZoom;
          const vert = Math.sin(orbitPitch) * orbitZoom;
          _targetPos.set(
            sim.heroX + Math.sin(orbitYaw) * horiz,
            groundY + sim.heroY + 1.4 + vert,
            sim.heroZ + Math.cos(orbitYaw) * horiz,
          );
          _targetLook.set(sim.heroX, groundY + sim.heroY + 1.45, sim.heroZ);
        }
      };

      if (phase === 'title') {
        const a = elapsed * 0.18;
        _targetPos.set(
          sim.heroX - 2.35 + Math.sin(a) * 0.65,
          groundY + 2.08 + Math.cos(elapsed * 0.35) * 0.16,
          sim.heroZ + 3.7 + Math.cos(a) * 0.45,
        );
        _targetLook.set(sim.heroX - 1.35, groundY + 1.25, sim.heroZ - 1.8);
      } else if (phase === 'transition') {
        const ease = 1 - Math.pow(1 - Math.min(1, transitionFrac), 3);
        activePlayPos();
        const startX = -1.2;
        const startY = 3.6;
        const startZ = 15.6;
        _targetPos.x = THREE.MathUtils.lerp(startX, _targetPos.x, ease);
        _targetPos.y = THREE.MathUtils.lerp(startY, _targetPos.y, ease);
        _targetPos.z = THREE.MathUtils.lerp(startZ, _targetPos.z, ease);
      } else {
        activePlayPos();
      }

      // Trauma shake
      const shakeMag = sim.cameraTrauma * sim.cameraTrauma * 0.44;
      const sx = shakeMag > 0.002 ? Math.sin(elapsed * 47) * shakeMag : 0;
      const sy = shakeMag > 0.002 ? Math.cos(elapsed * 53) * shakeMag : 0;

      const dampK = phase === 'transition' ? 14 : 9.0;
      const f = 1 - Math.exp(-dampK * dt);
      camera.position.x += (_targetPos.x + sx - camera.position.x) * f;
      camera.position.y += (_targetPos.y + sy - camera.position.y) * f;
      camera.position.z += (_targetPos.z - camera.position.z) * f;
      _curLook.x += (_targetLook.x - _curLook.x) * f;
      _curLook.y += (_targetLook.y - _curLook.y) * f;
      _curLook.z += (_targetLook.z - _curLook.z) * f;
      camera.lookAt(_curLook);

      if (composer) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }

      if (afterFrame) {
        if (isSoftwareGl) afterDraw(afterFrame);
        else afterFrame();
      }
    },
    dispose: () => {
      spatialWorker.dispose();
      composer?.dispose();
      envTex.dispose();
      textures.dispose();
      slashGeo.dispose();
      wardGroundGeo.dispose();
      wardGroundMat.dispose();
      wardRingGeo.dispose();
      wardRingMat.dispose();
      telegraphGeo.dispose();
      sigilGeo.dispose();
      targetLockGeo.dispose();
      shrineAuraGeo.dispose();
      for (const sr of slashRingPool) {
        sr.mat.dispose();
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    },
  };
}
