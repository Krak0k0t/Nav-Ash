import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRng} from '../../core/rng';
import type {GraphicsPresetConfig} from '../../data/balance';
import {isPointWalkable, type DungeonLayout} from '../../systems/dungeonGen';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';

export interface WorldEnvironmentRig {
  altarRunes: THREE.MeshStandardMaterial;
  altarLights: THREE.PointLight[];
  campfireLights: THREE.PointLight[];
  navGateMeshes: {group: THREE.Group; baseY: number}[];
  mistPlanes: THREE.Mesh[];
  branchesMesh: THREE.InstancedMesh;
  grassMesh: THREE.InstancedMesh;
  leavesMesh: THREE.InstancedMesh;
  pebblesMesh: THREE.InstancedMesh;
  applyGraphicsTier: (preset: GraphicsPresetConfig) => void;
  animate: (
    elapsed: number,
    navBlend: number,
    gateOpenFrac: number,
    heroX?: number,
    heroZ?: number,
    loreDiscoveredMask?: number,
  ) => void;
}

export function worldTerrainHeight(x: number, z: number): number {
  // Subtle organic undulation across playable chambers for crisp foot grounding
  const gentle = Math.sin(x * 0.1) * Math.cos(z * 0.09) * 0.07;

  // Outer wild forest rolling hills outside the central N-S & E-W causeways
  const outX = Math.max(0, Math.abs(x) - 21);
  const hillNoise =
    (Math.sin(x * 0.075 + z * 0.04) + Math.cos(z * 0.065 - x * 0.03) * 0.7) * 0.55 + 0.65;
  const outerHills = Math.min(2.6, outX * 0.065) * hillNoise;

  // Sunken reflective mire pools outside road corridors
  const mireDip =
    Math.exp(-((x - 11) * (x - 11) * 0.035 + (z + 30) * (z + 30) * 0.03)) * -0.38 +
    Math.exp(-((x + 11) * (x + 11) * 0.035 + (z + 74) * (z + 74) * 0.03)) * -0.38 +
    Math.exp(-((x - 9) * (x - 9) * 0.035 + (z + 118) * (z + 118) * 0.03)) * -0.38;

  return gentle + outerHills + mireDip;
}

function makeSlabGeo(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.55, -0.35);
  s.lineTo(-0.15, -0.52);
  s.lineTo(0.48, -0.4);
  s.lineTo(0.58, 0.12);
  s.lineTo(0.22, 0.5);
  s.lineTo(-0.44, 0.42);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Builds a single volumetric 3-plane crossed grass tuft with vertex-color root AO gradient
 * so 1 InstancedMesh draw call fills the entire Slavic mire with lush dark/turquoise foliage.
 */
function makeCrossedGrassTuftGeo(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 3; b++) {
    const angle = (b / 3) * Math.PI + (b === 1 ? 0.18 : -0.1);
    const blade = new THREE.PlaneGeometry(0.22, 0.68, 1, 4);
    blade.translate(0, 0.34, 0);
    const pos = blade.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const h = THREE.MathUtils.clamp(y / 0.68, 0, 1);
      // Taper width toward tip + gentle organic curve
      pos.setX(i, pos.getX(i) * (1 - h * 0.88));
      pos.setZ(i, h * h * 0.16);
      // Root AO darkening -> lively tip
      const shade = 0.28 + h * 0.72;
      colors[i * 3] = shade * 0.78;
      colors[i * 3 + 1] = shade;
      colors[i * 3 + 2] = shade * 0.88;
    }
    blade.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    blade.rotateY(angle);
    blade.computeVertexNormals();
    blades.push(blade);
  }
  const merged = mergeGeometries(blades, false);
  blades.forEach((b) => b.dispose());
  return merged;
}

function buildNavAltarGroup(
  stoneMat: THREE.Material,
  oakMat: THREE.Material,
  runeMat: THREE.Material,
  textures: ProceduralTextures,
): {group: THREE.Group; light: THREE.PointLight} {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.78, 0.34, 9), stoneMat);
  base.position.y = 0.17;
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 0.28, 9), stoneMat);
  upper.position.y = 0.48;
  g.add(base, upper);

  const runeParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rg = new THREE.BoxGeometry(0.4, 0.05, 0.1);
    rg.rotateY(a);
    rg.translate(Math.sin(a) * 1.38, 0.34, Math.cos(a) * 1.38);
    runeParts.push(rg);
  }
  const runeRing = new THREE.Mesh(mergeGeometries(runeParts, false), runeMat);
  runeParts.forEach((p) => p.dispose());
  g.add(runeRing);

  const profile = [
    new THREE.Vector2(0.5, 0.0),
    new THREE.Vector2(0.44, 0.6),
    new THREE.Vector2(0.48, 1.4),
    new THREE.Vector2(0.42, 2.2),
    new THREE.Vector2(0.48, 2.75),
    new THREE.Vector2(0.06, 3.15),
  ];
  const idol = new THREE.Mesh(new THREE.LatheGeometry(profile, 10), oakMat);
  idol.position.y = 0.56;
  const wings = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.34), oakMat);
  wings.position.y = 2.3;
  const eyeGeo = new THREE.BoxGeometry(0.13, 0.045, 0.08);
  const eyeL = new THREE.Mesh(eyeGeo, runeMat);
  eyeL.position.set(-0.16, 2.68, 0.41);
  const eyeR = new THREE.Mesh(eyeGeo, runeMat);
  eyeR.position.set(0.16, 2.68, 0.41);
  const skull = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.12, 0),
    new THREE.MeshStandardMaterial({
      map: textures.boneAlbedo,
      normalMap: textures.boneNormal,
      roughness: 0.75,
    }),
  );
  skull.position.set(0.32, 0.68, 0.88);
  const light = new THREE.PointLight(0x3be88c, 12, 13, 1.5);
  light.position.set(0, 2.25, 0.95);
  g.add(idol, wings, eyeL, eyeR, skull, light);
  g.traverse((m) => {
    if (m instanceof THREE.Mesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return {group: g, light};
}

export function buildWorldEnvironment(
  scene: THREE.Scene,
  layout: DungeonLayout,
  textures: ProceduralTextures,
  initialPreset: GraphicsPresetConfig,
): WorldEnvironmentRig {
  const rng = createRng(layout.seed ^ 0x4b1d92f1);
  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();

  // Shared PBR Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: textures.stoneRoughness,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rockInstanceMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: textures.stoneRoughness,
    roughness: 0.9,
    metalness: 0.04,
  });
  const oakMat = applyFresnelRim(
    new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.3, 1.3),
      roughness: 0.85,
      metalness: 0.04,
    }),
    {color: 0x3be88c, power: 3.3, intensity: 0.22},
  );
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4f4337,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.9,
  });
  const altarRunes = new THREE.MeshStandardMaterial({
    color: 0x052d18,
    emissive: 0x26d97c,
    emissiveIntensity: 1.45,
    roughness: 0.25,
    metalness: 0.08,
  });

  // 1. Massive Expansive Ground Terrain covering 7-zone 250x270m Slavonic Valley
  const terrainGeo = new THREE.PlaneGeometry(250, 270, 110, 120);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -82);
  const tPos = terrainGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    tPos.setY(i, worldTerrainHeight(tPos.getX(i), tPos.getZ(i)));
  }
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.groundAlbedo,
    normalMap: textures.groundNormal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: textures.groundRoughness,
    roughness: 0.94,
    metalness: 0.05,
  });
  textures.groundAlbedo.repeat.set(38, 42);
  textures.groundNormal.repeat.set(38, 42);
  textures.groundRoughness.repeat.set(38, 42);
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Reflective dark mire pools in sunken hollows
  const waterNormal = textures.groundNormal.clone();
  waterNormal.repeat.set(6, 6);
  waterNormal.needsUpdate = true;
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x040b0a,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 0.76,
    clearcoatRoughness: 0.16,
    envMapIntensity: 0.85,
  });
  for (const [wx, wz, rad] of [
    [11, -30, 5.8],
    [-11, -74, 6.2],
    [9, -118, 5.8],
  ]) {
    const wMesh = new THREE.Mesh(new THREE.CircleGeometry(rad, 28), waterMat);
    wMesh.rotation.x = -Math.PI / 2;
    wMesh.position.set(wx, -0.18, wz);
    wMesh.receiveShadow = true;
    scene.add(wMesh);
  }

  // 2. Flagstone Road Trail connecting all 7 Zones (Ostrog -> Mire -> Barrow -> Necropolis -> Sanctum + E/W Wings)
  const slabGeo = makeSlabGeo();
  const slabCount = 195;
  const slabs = new THREE.InstancedMesh(slabGeo, stoneMat, slabCount);
  slabs.receiveShadow = true;
  let slabIdx = 0;
  // Main North-South Road (z = 8 down to z = -164)
  for (let i = 0; i < 135 && slabIdx < slabCount; i++) {
    const z = 7.5 - i * 1.28;
    const x = Math.sin(z * 0.22) * 0.85;
    dummy.position.set(x, worldTerrainHeight(x, z) - 0.02, z);
    dummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
    const sc = rng.range(0.85, 1.32);
    dummy.scale.set(sc, 1, sc * rng.range(0.8, 1.15));
    dummy.updateMatrix();
    slabs.setMatrixAt(slabIdx++, dummy.matrix);
  }
  // West causeway to Whispering Hollow
  for (let i = 0; i < 28 && slabIdx < slabCount; i++) {
    const x = -6 - i * 1.22;
    const z = -33 + Math.sin(i * 0.55) * 0.7;
    dummy.position.set(x, worldTerrainHeight(x, z) - 0.02, z);
    dummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
    dummy.scale.setScalar(rng.range(0.85, 1.2));
    dummy.updateMatrix();
    slabs.setMatrixAt(slabIdx++, dummy.matrix);
  }
  // East causeway to Sunken Watchpost
  for (let i = 0; i < 28 && slabIdx < slabCount; i++) {
    const x = 6 + i * 1.22;
    const z = -33 + Math.cos(i * 0.55) * 0.7;
    dummy.position.set(x, worldTerrainHeight(x, z) - 0.02, z);
    dummy.rotation.set(0, rng.range(0, Math.PI * 2), 0);
    dummy.scale.setScalar(rng.range(0.85, 1.2));
    dummy.updateMatrix();
    slabs.setMatrixAt(slabIdx++, dummy.matrix);
  }
  slabs.count = slabIdx;
  slabs.instanceMatrix.needsUpdate = true;
  slabs.computeBoundingSphere();
  scene.add(slabs);

  // 3. Ostrog Timber Palisade, Crossbeams & Brazier Gateposts + East Watchpost Timber Ruins
  // Strictly aligned 1-to-1 with layout.wallSegments (pal_s_w, pal_s_e, pal_n_w, pal_n_e)
  const palisadeGeo = new THREE.ConeGeometry(0.19, 2.95, 7);
  palisadeGeo.translate(0, 1.47, 0);
  const palisades = new THREE.InstancedMesh(palisadeGeo, timberMat, 56);
  palisades.castShadow = false;
  palisades.receiveShadow = true;
  let pIdx = 0;
  for (const seg of layout.wallSegments) {
    if (!seg.id.startsWith('pal_')) continue;
    const len = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
    const stakes = Math.max(4, Math.round(len / 0.72));
    for (let s = 0; s < stakes && pIdx < 56; s++) {
      const t = stakes > 1 ? s / (stakes - 1) : 0.5;
      const x = THREE.MathUtils.lerp(seg.x1, seg.x2, t);
      const z = THREE.MathUtils.lerp(seg.z1, seg.z2, t);
      dummy.position.set(x, worldTerrainHeight(x, z) - 0.1, z);
      dummy.rotation.set(rng.range(-0.05, 0.05), rng.range(0, 3), rng.range(-0.06, 0.06));
      dummy.scale.set(1, rng.range(0.86, 1.15), 1);
      dummy.updateMatrix();
      palisades.setMatrixAt(pIdx++, dummy.matrix);
    }
  }
  // Watchpost eastern palisade stakes (decorative outside main path)
  for (let i = 0; i < 16 && pIdx < 56; i++) {
    const angle = (i / 16) * Math.PI * 1.4 - 0.7;
    const x = 44 + Math.cos(angle) * 9.5;
    const z = -34 + Math.sin(angle) * 9.5;
    dummy.position.set(x, worldTerrainHeight(x, z) - 0.1, z);
    dummy.rotation.set(rng.range(-0.09, 0.09), rng.range(0, 3), rng.range(-0.09, 0.09));
    dummy.scale.set(1.1, rng.range(0.75, 1.25), 1.1);
    dummy.updateMatrix();
    palisades.setMatrixAt(pIdx++, dummy.matrix);
  }
  palisades.count = pIdx;
  palisades.instanceMatrix.needsUpdate = true;
  palisades.computeBoundingSphere();
  scene.add(palisades);

  // Horizontal lashed timber rails batched into a single InstancedMesh
  const railSegs = layout.wallSegments.filter((seg) => seg.id.startsWith('pal_'));
  if (railSegs.length > 0) {
    const unitRailGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.0, 6);
    unitRailGeo.rotateZ(Math.PI / 2);
    const railsMesh = new THREE.InstancedMesh(unitRailGeo, timberMat, railSegs.length * 2);
    railsMesh.castShadow = true;
    railsMesh.receiveShadow = true;
    let rIdx = 0;
    for (const seg of railSegs) {
      const len = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
      const cx = (seg.x1 + seg.x2) * 0.5;
      const cz = (seg.z1 + seg.z2) * 0.5;
      const rotY = Math.atan2(-(seg.z2 - seg.z1), seg.x2 - seg.x1);
      for (const ry of [0.85, 1.75]) {
        dummy.position.set(cx, worldTerrainHeight(cx, cz) + ry, cz);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(len, 1, 1);
        dummy.updateMatrix();
        railsMesh.setMatrixAt(rIdx++, dummy.matrix);
      }
    }
    railsMesh.count = rIdx;
    railsMesh.instanceMatrix.needsUpdate = true;
    railsMesh.computeBoundingSphere();
    scene.add(railsMesh);
  }
  const ironCageMat = new THREE.MeshStandardMaterial({
    color: 0x26292c,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    metalness: 0.78,
    roughness: 0.56,
  });
  const brazierCoalMat = new THREE.MeshStandardMaterial({
    color: 0x3b1206,
    emissive: 0xd95414,
    emissiveIntensity: 1.4,
    roughness: 0.5,
  });
  const gateFlames: THREE.Mesh[] = [];
  for (const [gx, gz] of [
    [-3.15, 11.4],
    [3.15, 11.4],
    [-4.1, -6.2],
    [4.1, -6.2],
  ]) {
    const gy = worldTerrainHeight(gx, gz);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 3.55, 8), timberMat);
    post.position.set(gx, gy + 1.72, gz);
    post.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.42, 6), stoneMat);
    cap.position.set(gx, gy + 3.65, gz);
    const bx = gx + (gx < 0 ? 0.34 : -0.34);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.16, 8), ironCageMat);
    bowl.position.set(bx, gy + 2.42, gz);
    const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), brazierCoalMat);
    coals.scale.set(1.1, 0.45, 1.1);
    coals.position.set(bx, gy + 2.5, gz);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 7, 3), timberMat);
    flame.position.set(bx, gy + 2.72, gz);
    gateFlames.push(flame);
    scene.add(post, cap, bowl, coals, flame);
  }

  // 4. Nav Altars & Campfires across the expanded valley
  const altarLights: THREE.PointLight[] = [];
  for (const a of layout.altars) {
    const built = buildNavAltarGroup(stoneMat, oakMat, altarRunes, textures);
    built.group.position.set(a.x, worldTerrainHeight(a.x, a.z), a.z);
    scene.add(built.group);
    altarLights.push(built.light);
  }

  const campLights: THREE.PointLight[] = [];
  const campUniforms = {uTime: {value: 0}};
  const campFlameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: campUniforms,
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 9.0 + p.y * 8.0) * 0.05 * uv.y;
        p.z += cos(uTime * 7.5 + p.y * 7.0) * 0.04 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float h = clamp(vUv.y, 0.0, 1.0);
        float flicker = 0.8 + 0.2 * sin(uTime * 14.0 + vUv.x * 12.0);
        float alpha = (1.0 - smoothstep(0.32, 1.0, h)) * smoothstep(0.0, 0.14, h) * flicker;
        vec3 col = mix(vec3(1.35, 0.82, 0.28), vec3(0.95, 0.24, 0.04), smoothstep(0.15, 0.85, h));
        gl_FragColor = vec4(col, alpha * 0.92);
      }
    `,
  });
  for (const gf of gateFlames) {
    gf.material = campFlameMat;
  }

  for (const cf of layout.campfires) {
    const fg = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.13, 6, 10), stoneMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    const coals = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({color: 0x4f1c08, emissive: 0xe05814, emissiveIntensity: 2.1}),
    );
    coals.scale.set(1.2, 0.35, 1.2);
    coals.position.y = 0.08;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 7, 4), campFlameMat);
    fl.position.y = 0.36;
    const light = new THREE.PointLight(0xe07026, 28, 17, 1.45);
    light.position.set(0, 1.15, 0);
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.4;
    light.shadow.camera.far = 14;
    light.shadow.bias = -0.003;
    fg.add(ring, coals, fl, light);
    fg.position.set(cf.x, worldTerrainHeight(cf.x, cf.z), cf.z);
    scene.add(fg);
    campLights.push(light);
  }

  // 5. Monolith Pillars & Natural Boulders batched via InstancedMesh (3 draw calls instead of ~80!)
  const obsBoulders = layout.obstacles.filter((o) => o.kind === 'boulder');
  const obsPillars = layout.obstacles.filter((o) => o.kind !== 'altar' && o.kind !== 'campfire' && o.kind !== 'boulder');
  if (obsBoulders.length > 0) {
    const bGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const bInst = new THREE.InstancedMesh(bGeo, stoneMat, obsBoulders.length * 2);
    bInst.castShadow = true;
    bInst.receiveShadow = true;
    let bi = 0;
    for (const obs of obsBoulders) {
      const oy = worldTerrainHeight(obs.x, obs.z);
      const rMain = obs.radius * 0.92;
      dummy.position.set(obs.x, oy + obs.radius * 0.42, obs.z);
      dummy.rotation.set(0.2, rng.range(0, 6), 0.15);
      dummy.scale.set(rMain * 1.08, rMain * 0.72, rMain * 0.96);
      dummy.updateMatrix();
      bInst.setMatrixAt(bi++, dummy.matrix);

      const rSide = obs.radius * 0.54;
      dummy.position.set(obs.x + obs.radius * 0.48, oy + obs.radius * 0.22, obs.z + obs.radius * 0.3);
      dummy.rotation.set(0.1, rng.range(0, 6), -0.1);
      dummy.scale.set(rSide * 1.1, rSide * 0.68, rSide * 0.9);
      dummy.updateMatrix();
      bInst.setMatrixAt(bi++, dummy.matrix);
    }
    bInst.count = bi;
    bInst.instanceMatrix.needsUpdate = true;
    bInst.computeBoundingSphere();
    scene.add(bInst);
  }
  if (obsPillars.length > 0) {
    const pGeo = new THREE.ConeGeometry(0.72, 2.8, 5);
    const prGeo = new THREE.BoxGeometry(0.08, 1.1, 0.08);
    const pInst = new THREE.InstancedMesh(pGeo, stoneMat, obsPillars.length);
    const prInst = new THREE.InstancedMesh(prGeo, altarRunes, obsPillars.length);
    pInst.castShadow = true;
    pInst.receiveShadow = true;
    for (let i = 0; i < obsPillars.length; i++) {
      const obs = obsPillars[i];
      const oy = worldTerrainHeight(obs.x, obs.z);
      dummy.position.set(obs.x, oy + 1.3, obs.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(obs.radius, 1, obs.radius);
      dummy.updateMatrix();
      pInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(obs.x, oy + 1.2, obs.z + obs.radius * 0.42);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      prInst.setMatrixAt(i, dummy.matrix);
    }
    pInst.instanceMatrix.needsUpdate = true;
    prInst.instanceMatrix.needsUpdate = true;
    pInst.computeBoundingSphere();
    prInst.computeBoundingSphere();
    scene.add(pInst, prInst);
  }

  // Visible Flanking Stone Cliff Ridge along sanctum_ridge_w / sanctum_ridge_e (z = -138.5)
  const cliffSegs = layout.wallSegments.filter((w) => w.id.startsWith('sanctum_ridge_'));
  if (cliffSegs.length > 0) {
    const cliffGeo = new THREE.DodecahedronGeometry(1.55, 1);
    const cliffMesh = new THREE.InstancedMesh(cliffGeo, rockInstanceMat, 64);
    cliffMesh.castShadow = false;
    cliffMesh.receiveShadow = true;
    let cIdx = 0;
    for (const seg of cliffSegs) {
      const len = Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
      const count = Math.min(32, Math.max(12, Math.round(len / 2.2)));
      for (let i = 0; i < count && cIdx < 64; i++) {
        const t = i / Math.max(1, count - 1);
        const cx = THREE.MathUtils.lerp(seg.x1, seg.x2, t);
        const cz = THREE.MathUtils.lerp(seg.z1, seg.z2, t) + rng.range(-0.35, 0.35);
        const h = rng.range(2.2, 4.2);
        dummy.position.set(cx, worldTerrainHeight(cx, cz) + h * 0.42, cz);
        dummy.rotation.set(rng.range(-0.18, 0.18), rng.range(0, 6), rng.range(-0.18, 0.18));
        dummy.scale.set(rng.range(1.1, 1.55), h * 0.48, rng.range(0.9, 1.25));
        dummy.updateMatrix();
        cliffMesh.setMatrixAt(cIdx, dummy.matrix);
        const tone = rng.range(0.65, 0.95);
        colorTmp.setRGB(tone * 0.85, tone * 0.92, tone);
        cliffMesh.setColorAt(cIdx, colorTmp);
        cIdx++;
      }
    }
    cliffMesh.count = cIdx;
    cliffMesh.instanceMatrix.needsUpdate = true;
    if (cliffMesh.instanceColor) cliffMesh.instanceColor.needsUpdate = true;
    cliffMesh.computeBoundingSphere();
    scene.add(cliffMesh);
  }

  const navGateMeshes: {group: THREE.Group; baseY: number}[] = [];
  for (const gate of layout.navGates) {
    const gg = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.45, 3.4, 0.9), stoneMat);
      slab.position.set(i * 1.45, 1.6, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      const seal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.96), altarRunes);
      seal.position.set(i * 1.45, 1.6, 0);
      gg.add(slab, seal);
    }
    const baseY = worldTerrainHeight(gate.x, gate.z);
    gg.position.set(gate.x, baseY, gate.z);
    scene.add(gg);
    navGateMeshes.push({group: gg, baseY});
  }

  // 6. <RockField> InstancedMesh scattered cleanly outside central paths
  const rockCount = 180;
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.62, 1), rockInstanceMat, rockCount);
  rocks.castShadow = false;
  rocks.receiveShadow = true;
  let rIdx = 0;
  for (let i = 0; i < 420 && rIdx < rockCount; i++) {
    const z = rng.range(-190, 22);
    const x = rng.range(-72, 72);
    if (isPointWalkable(layout, x, z, 1.4, true)) continue;
    dummy.position.set(x, worldTerrainHeight(x, z) + 0.05, z);
    dummy.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
    const sx = rng.range(0.65, 2.1);
    dummy.scale.set(sx, rng.range(0.45, 0.95), sx * rng.range(0.7, 1.3));
    dummy.updateMatrix();
    rocks.setMatrixAt(rIdx, dummy.matrix);
    const tone = rng.range(0.72, 1.12);
    colorTmp.setRGB(tone * 0.9, tone * 0.95, tone * 1.05);
    rocks.setColorAt(rIdx, colorTmp);
    rIdx++;
  }
  rocks.count = rIdx;
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.computeBoundingSphere();
  scene.add(rocks);

  // 7. <BioluminescentMushrooms> Organic forest-floor Nav fungi across deep mire edges
  const capCount = 110;
  const capGeo = new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const mushMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d3f26,
    emissive: 0x1aa860,
    emissiveIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
    clearcoat: 0.75,
    clearcoatRoughness: 0.2,
  });
  const mushrooms = new THREE.InstancedMesh(capGeo, mushMat, capCount);
  for (let i = 0; i < capCount; i++) {
    const z = rng.range(-178, -6);
    const x = rng.range(-52, 52);
    const sc = rng.range(0.55, 1.18);
    dummy.position.set(x, worldTerrainHeight(x, z) + 0.015 * sc, z);
    dummy.rotation.set(rng.range(-0.18, 0.18), rng.range(0, 6), rng.range(-0.18, 0.18));
    dummy.scale.set(sc, sc * 0.75, sc);
    dummy.updateMatrix();
    mushrooms.setMatrixAt(i, dummy.matrix);
  }
  mushrooms.instanceMatrix.needsUpdate = true;
  mushrooms.computeBoundingSphere();
  scene.add(mushrooms);

  // 8. <VolumetricGrassTufts> 3-Plane Crossed Grass Blades (Vertex Gradient + Moss/Turquoise Tint + GPU Wind Sway)
  const tuftGeo = makeCrossedGrassTuftGeo();
  const windUniforms = {uTime: {value: 0}, uNavBlend: {value: 0}};
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.84,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uNavBlend = windUniforms.uNavBlend;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vTipHeight;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTipHeight = clamp(position.y / 0.68, 0.0, 1.0);
        float instPhase = instanceMatrix[3][0] * 0.45 + instanceMatrix[3][2] * 0.35;
        transformed.x += sin(uTime * 1.85 + instPhase + position.y * 2.2) * 0.11 * (vTipHeight * vTipHeight);
        transformed.z += cos(uTime * 1.45 + instPhase) * 0.06 * (vTipHeight * vTipHeight);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uNavBlend;\nvarying float vTipHeight;')
      .replace(
        '#include <dithering_fragment>',
        `gl_FragColor.rgb += vec3(0.04, 0.24, 0.14) * (vTipHeight * vTipHeight * uNavBlend * 0.3);
        #include <dithering_fragment>`,
      );
  };
  const maxGrassCount = 1350;
  const grassMesh = new THREE.InstancedMesh(tuftGeo, grassMat, maxGrassCount);
  const cMoss = new THREE.Color(0x1f361e);
  const cTurq = new THREE.Color(0x183d34);
  for (let i = 0; i < maxGrassCount; i++) {
    const z = rng.range(-188, 16);
    const x = rng.range(-58, 58);
    dummy.position.set(x, worldTerrainHeight(x, z) - 0.02, z);
    dummy.rotation.set(rng.range(-0.1, 0.1), rng.range(0, Math.PI * 2), rng.range(-0.1, 0.1));
    const sc = rng.range(0.75, 1.55);
    dummy.scale.set(sc, sc * rng.range(0.85, 1.25), sc);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
    colorTmp.copy(cMoss).lerp(cTurq, rng.range(0, 1)).multiplyScalar(rng.range(0.8, 1.25));
    grassMesh.setColorAt(i, colorTmp);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
  grassMesh.computeBoundingSphere();
  scene.add(grassMesh);

  // 9. Micro-Detail: Fallen Birch Leaves (pointed leaf silhouette) & Root Pebbles via InstancedMesh (1 draw call each!)
  const maxLeaves = 480;
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, -0.075);
  leafShape.quadraticCurveTo(0.055, -0.02, 0.042, 0.035);
  leafShape.quadraticCurveTo(0.02, 0.07, 0, 0.09);
  leafShape.quadraticCurveTo(-0.02, 0.07, -0.042, 0.035);
  leafShape.quadraticCurveTo(-0.055, -0.02, 0, -0.075);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 3);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const leavesMesh = new THREE.InstancedMesh(leafGeo, leafMat, maxLeaves);
  for (let i = 0; i < maxLeaves; i++) {
    const z = rng.range(-182, 16);
    const x = rng.range(-54, 54);
    dummy.position.set(x, worldTerrainHeight(x, z) + 0.015, z);
    dummy.rotation.set(rng.range(-0.15, 0.15), rng.range(0, Math.PI * 2), rng.range(-0.15, 0.15));
    dummy.scale.setScalar(rng.range(0.7, 1.4));
    dummy.updateMatrix();
    leavesMesh.setMatrixAt(i, dummy.matrix);
    colorTmp.setRGB(rng.range(0.32, 0.56), rng.range(0.24, 0.42), rng.range(0.11, 0.2));
    leavesMesh.setColorAt(i, colorTmp);
  }
  leavesMesh.instanceMatrix.needsUpdate = true;
  if (leavesMesh.instanceColor) leavesMesh.instanceColor.needsUpdate = true;
  leavesMesh.computeBoundingSphere();
  scene.add(leavesMesh);

  const maxPebbles = 320;
  const pebbleGeo = new THREE.DodecahedronGeometry(0.12, 0);
  const pebblesMesh = new THREE.InstancedMesh(pebbleGeo, rockInstanceMat, maxPebbles);
  for (let i = 0; i < maxPebbles; i++) {
    const z = rng.range(-182, 16);
    const x = rng.range(-54, 54);
    dummy.position.set(x, worldTerrainHeight(x, z) + 0.01, z);
    dummy.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
    const ps = rng.range(0.65, 1.6);
    dummy.scale.set(ps, ps * 0.45, ps * rng.range(0.8, 1.4));
    dummy.updateMatrix();
    pebblesMesh.setMatrixAt(i, dummy.matrix);
    const tone = rng.range(0.55, 0.92);
    colorTmp.setRGB(tone * 0.9, tone * 0.95, tone);
    pebblesMesh.setColorAt(i, colorTmp);
  }
  pebblesMesh.instanceMatrix.needsUpdate = true;
  if (pebblesMesh.instanceColor) pebblesMesh.instanceColor.needsUpdate = true;
  pebblesMesh.computeBoundingSphere();
  scene.add(pebblesMesh);

  // 10. Multi-LOD Birch Forest Framing All 7 Zones with Root-Flared Tapered Lathe Trunks
  const treeCount = 300;
  const trunkProfile = [
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.42, 0.55),
    new THREE.Vector2(0.32, 1.5),
    new THREE.Vector2(0.26, 4.2),
    new THREE.Vector2(0.19, 7.6),
    new THREE.Vector2(0.11, 10.4),
  ];
  const trunkGeo = new THREE.LatheGeometry(trunkProfile, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: textures.birchAlbedo,
    normalMap: textures.birchNormal,
    roughness: 0.88,
  });
  const branchGeo = new THREE.ConeGeometry(0.08, 3.2, 5);
  branchGeo.translate(0, 1.6, 0);
  const branchMat = new THREE.MeshStandardMaterial({color: 0x201f1b, roughness: 0.94});

  const trunksMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const branchesMesh = new THREE.InstancedMesh(branchGeo, branchMat, treeCount * 3);
  let tIdx = 0;
  let brIdx = 0;
  for (let attempt = 0; attempt < 1100 && tIdx < treeCount; attempt++) {
    const z = rng.range(-196, 26);
    const x = rng.range(-78, 78);
    // Guarantee clean clearance around all 7 playable rooms, corridors & Sanctum
    if (isPointWalkable(layout, x, z, 2.8, true)) continue;
    const s = rng.range(0.85, 1.55);
    const ty = worldTerrainHeight(x, z) - 0.15;
    dummy.position.set(x, ty, z);
    dummy.rotation.set(rng.range(-0.07, 0.07), rng.range(0, 6), rng.range(-0.07, 0.07));
    dummy.scale.set(s, s * rng.range(0.9, 1.25), s);
    dummy.updateMatrix();
    trunksMesh.setMatrixAt(tIdx, dummy.matrix);
    const shade = rng.range(0.6, 1.0);
    colorTmp.setRGB(shade, shade * 0.95, shade * 0.88);
    trunksMesh.setColorAt(tIdx, colorTmp);

    for (let k = 0; k < 3; k++) {
      const ba = (k / 3) * Math.PI * 2 + tIdx;
      dummy.position.set(x, ty + (4.4 + k * 1.15) * s, z);
      dummy.rotation.set(Math.cos(ba) * 0.8, ba, Math.sin(ba) * 0.8);
      dummy.scale.setScalar(s * 0.9);
      dummy.updateMatrix();
      branchesMesh.setMatrixAt(brIdx++, dummy.matrix);
    }
    tIdx++;
  }
  trunksMesh.count = tIdx;
  branchesMesh.count = brIdx;
  trunksMesh.instanceMatrix.needsUpdate = true;
  if (trunksMesh.instanceColor) trunksMesh.instanceColor.needsUpdate = true;
  branchesMesh.instanceMatrix.needsUpdate = true;
  trunksMesh.computeBoundingSphere();
  branchesMesh.computeBoundingSphere();
  scene.add(trunksMesh, branchesMesh);

  // 11. Signature 2D-FBM Drifting Twilight Mist Planes across massive valley
  const mistUniforms = {uTime: {value: 0}, uNavBlend: {value: 0}};
  const mistPlanes: THREE.Mesh[] = [];
  for (let l = 0; l < 3; l++) {
    const mm = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {uTime: mistUniforms.uTime, uNavBlend: mistUniforms.uNavBlend, uLayer: {value: l}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uNavBlend; uniform float uLayer;
        float hash21(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 34.23);
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
          return vnoise(p) * 0.58 + vnoise(p * 2.13 + 3.7) * 0.28 + vnoise(p * 4.31 - 1.9) * 0.14;
        }
        void main() {
          vec2 drift = vec2(uTime * (0.045 + uLayer * 0.018), -uTime * (0.032 - uLayer * 0.01));
          float n1 = fbm(vUv * (14.0 + uLayer * 3.0) + drift);
          float n2 = fbm(vUv * 22.0 - drift * 1.4 + n1 * 1.2);
          float wisp = smoothstep(0.38, 0.86, n1 * 0.6 + n2 * 0.4);
          float edgeFade = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x)
                         * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          float alpha = wisp * edgeFade * ((0.14 - uLayer * 0.03) + uNavBlend * 0.09);
          vec3 col = mix(vec3(0.11, 0.17, 0.24), vec3(0.06, 0.34, 0.21), uNavBlend);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(170, 240), mm);
    mp.rotation.x = -Math.PI / 2;
    mp.position.set(0, 0.22 + l * 0.45, -82);
    scene.add(mp);
    mistPlanes.push(mp);
  }

  // 12. Floating Embers InstancedMesh distributed across all 7 zones
  const maxEmbers = 96;
  const emberMat = new THREE.MeshBasicMaterial({color: 0xe07026});
  const embersMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.032, 0), emberMat, maxEmbers);
  const emberSeeds = Array.from({length: maxEmbers}, () => ({
    x: rng.range(-46, 46),
    z: rng.range(-175, 14),
    speed: rng.range(0.35, 0.85),
    phase: rng.range(0, 10),
  }));
  embersMesh.frustumCulled = false;
  scene.add(embersMesh);

  // 13. Carved Basalt Lore Runestones (4 chronicled tapered menhirs + 12 carved rune strokes in 2 InstancedMesh calls)
  const LORE_COORDS: [number, number][] = [
    [4.8, 3.2],
    [8.5, -29.0],
    [-7.5, -72.0],
    [31.0, -34.0],
  ];
  const loreStoneGeo = new THREE.CylinderGeometry(0.19, 0.43, 1.95, 5);
  loreStoneGeo.translate(0, 0.96, 0);
  const loreStonesMesh = new THREE.InstancedMesh(loreStoneGeo, rockInstanceMat, LORE_COORDS.length);
  loreStonesMesh.castShadow = true;
  loreStonesMesh.receiveShadow = true;

  const loreRuneGeo = new THREE.BoxGeometry(0.055, 0.34, 0.04);
  const loreRuneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x164a78,
    emissiveIntensity: 0.42,
    roughness: 0.35,
    metalness: 0.15,
  });
  const loreRunesMesh = new THREE.InstancedMesh(loreRuneGeo, loreRuneMat, LORE_COORDS.length * 3);
  const _loreUnread = new THREE.Color(0x52b6ff);
  const _loreRead = new THREE.Color(0x284e3f);
  for (let i = 0; i < LORE_COORDS.length; i++) {
    const [lx, lz] = LORE_COORDS[i];
    const ly = worldTerrainHeight(lx, lz);
    const yaw = (i * 1.15 - 0.5) * 0.45;
    dummy.position.set(lx, ly - 0.08, lz);
    dummy.rotation.set(0.03, yaw, -0.02);
    dummy.scale.set(1.0, 1.0, 0.72);
    dummy.updateMatrix();
    loreStonesMesh.setMatrixAt(i, dummy.matrix);

    // 3 carved Slavic rune bars angled cleanly along the front face of the menhir
    const glyphOffsets: [number, number, number][] = [
      [0.0, 1.24, 0.0],
      [-0.04, 1.0, 0.55],
      [0.04, 0.86, -0.55],
    ];
    for (let g = 0; g < 3; g++) {
      const [ox, oy, tilt] = glyphOffsets[g];
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const faceDist = 0.245;
      dummy.position.set(
        lx + sinY * faceDist + cosY * ox,
        ly + oy,
        lz + cosY * faceDist - sinY * ox,
      );
      dummy.rotation.set(0.08, yaw, tilt);
      dummy.scale.set(1, g === 0 ? 1.05 : 0.72, 1);
      dummy.updateMatrix();
      const idx = i * 3 + g;
      loreRunesMesh.setMatrixAt(idx, dummy.matrix);
      loreRunesMesh.setColorAt(idx, _loreUnread);
    }
  }
  loreStonesMesh.instanceMatrix.needsUpdate = true;
  loreRunesMesh.instanceMatrix.needsUpdate = true;
  if (loreRunesMesh.instanceColor) loreRunesMesh.instanceColor.needsUpdate = true;
  loreStonesMesh.computeBoundingSphere();
  loreRunesMesh.computeBoundingSphere();
  scene.add(loreStonesMesh, loreRunesMesh);

  const applyGraphicsTier = (preset: GraphicsPresetConfig) => {
    grassMesh.count = Math.round(maxGrassCount * preset.foliageDensity);
    leavesMesh.count = Math.round(maxLeaves * preset.foliageDensity);
    pebblesMesh.count = Math.round(maxPebbles * preset.foliageDensity);
    branchesMesh.visible = preset.foliageDensity >= 0.55;
    embersMesh.count = Math.min(maxEmbers, preset.emberCount);
    mistPlanes.forEach((p, idx) => {
      p.visible = idx < preset.mistLayers;
    });
    if (campLights[0]) {
      campLights[0].castShadow = preset.shadowsEnabled && preset.shadowMapSize >= 1024;
    }
  };
  applyGraphicsTier(initialPreset);

  const _cFire = new THREE.Color(0xe07026);
  const _cNav = new THREE.Color(0x3be88c);

  return {
    altarRunes,
    altarLights,
    campfireLights: campLights,
    navGateMeshes,
    mistPlanes,
    branchesMesh,
    grassMesh,
    leavesMesh,
    pebblesMesh,
    applyGraphicsTier,
    animate: (elapsed, navBlend, gateOpenFrac, heroX = 0, heroZ = 0, loreDiscoveredMask = 0) => {
      campUniforms.uTime.value = elapsed;
      windUniforms.uTime.value = elapsed;
      windUniforms.uNavBlend.value = navBlend;
      mistUniforms.uTime.value = elapsed;
      mistUniforms.uNavBlend.value = navBlend;
      waterNormal.offset.set(elapsed * 0.004, elapsed * 0.002);

      // Update Lore Runestone inlay glow based on discovery state
      loreRuneMat.emissiveIntensity = 0.35 + Math.sin(elapsed * 2.4) * 0.12 + navBlend * 0.2;
      for (let i = 0; i < LORE_COORDS.length; i++) {
        const read = (loreDiscoveredMask & (1 << i)) !== 0;
        const col = read ? _loreRead : _loreUnread;
        loreRunesMesh.setColorAt(i * 3, col);
        loreRunesMesh.setColorAt(i * 3 + 1, col);
        loreRunesMesh.setColorAt(i * 3 + 2, col);
      }
      if (loreRunesMesh.instanceColor) loreRunesMesh.instanceColor.needsUpdate = true;

      // Distance culling for PointLights (<= 28m) to slash per-pixel fragment lighting cost
      const maxLightDistSq = 28 * 28;
      altarRunes.emissiveIntensity = 1.45 + navBlend * 0.75 + Math.sin(elapsed * 3.0) * 0.15;
      for (let i = 0; i < altarLights.length; i++) {
        const l = altarLights[i];
        const pos = layout.altars[i];
        const dSq = pos ? (pos.x - heroX) * (pos.x - heroX) + (pos.z - heroZ) * (pos.z - heroZ) : 0;
        l.visible = dSq <= maxLightDistSq;
        if (l.visible) {
          l.intensity = 12 + navBlend * 22;
        }
      }
      for (let i = 0; i < campLights.length; i++) {
        const l = campLights[i];
        const pos = layout.campfires[i];
        const dSq = pos ? (pos.x - heroX) * (pos.x - heroX) + (pos.z - heroZ) * (pos.z - heroZ) : 0;
        l.visible = dSq <= maxLightDistSq;
        if (l.visible) {
          l.intensity = (26 + Math.sin(elapsed * 11.2 + i) * 3) * (1 - navBlend * 0.45);
        }
      }

      // M12 Path Inversion: Nav Gate physically sinks into earth when opened
      for (const g of navGateMeshes) {
        g.group.position.y = g.baseY - gateOpenFrac * 3.6;
      }

      emberMat.color.copy(_cFire).lerp(_cNav, navBlend * 0.75);
      const count = embersMesh.count;
      for (let i = 0; i < count; i++) {
        const es = emberSeeds[i];
        const cycle = (elapsed * es.speed + es.phase) % 3.6;
        dummy.position.set(
          es.x + Math.sin(elapsed * 1.3 + es.phase) * 0.35,
          0.25 + cycle * 1.1,
          es.z + Math.cos(elapsed * 1.1 + es.phase) * 0.35,
        );
        dummy.scale.setScalar(Math.max(0.06, 1 - cycle / 3.6));
        dummy.rotation.set(elapsed, elapsed * 0.6, 0);
        dummy.updateMatrix();
        embersMesh.setMatrixAt(i, dummy.matrix);
      }
      embersMesh.instanceMatrix.needsUpdate = true;
    },
  };
}
