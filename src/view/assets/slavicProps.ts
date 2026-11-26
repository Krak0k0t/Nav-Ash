import * as THREE from 'three';
import {createRng} from '../../core/rng';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';

export interface LookdevPropsRig {
  navAltarGroup: THREE.Group;
  runeMat: THREE.MeshStandardMaterial;
  altarLight: THREE.PointLight;
  campfireLight: THREE.PointLight;
  telegraphRing: THREE.Mesh;
  telegraphMat: THREE.ShaderMaterial;
  mistPlanes: THREE.Mesh[];
  mistUniforms: {uTime: {value: number}; uNavBlend: {value: number}};
  embersMesh: THREE.InstancedMesh;
  animate: (elapsed: number, navBlend: number) => void;
}

export function terrainHeightAt(x: number, z: number): number {
  const distHero = Math.hypot(x - -1.6, z - 2.2);
  const distAltar = Math.hypot(x - -0.8, z - -3.8);
  const distUpyr = Math.hypot(x - 2.3, z - -1.6);
  // Keep hero, altar mound, and main arena path dry; dip a natural bog water hollow along right-rear flank
  const bogHollow =
    Math.exp(-((x - 5.2) * (x - 5.2) * 0.08 + (z - -3.2) * (z - -3.2) * 0.06)) * -0.42 +
    Math.exp(-((x - 4.4) * (x - 4.4) * 0.07 + (z - 1.2) * (z - 1.2) * 0.09)) * -0.32;
  const altarRise = Math.exp(-distAltar * distAltar * 0.16) * 0.18;

  const r = Math.hypot(x, z);
  const clearingFlatten = THREE.MathUtils.smoothstep(r, 5.2, 16.5);
  const rimHills =
    (Math.sin(x * 0.24) * Math.cos(z * 0.21) * 0.42 +
      Math.sin((x + z) * 0.42) * 0.16) *
    clearingFlatten;

  const flattenMask =
    THREE.MathUtils.smoothstep(distHero, 1.2, 2.6) *
    THREE.MathUtils.smoothstep(distUpyr, 1.4, 2.8);

  return rimHills + altarRise + bogHollow * flattenMask;
}

function makeCurvedTubeGeo(
  points: [number, number, number][],
  rStart: number,
  rEnd: number,
  tubularSegs = 10,
  radialSegs = 6,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, tubularSegs, 1, radialSegs, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.floor(i / (radialSegs + 1));
    const t = Math.min(1, ringIdx / tubularSegs);
    curve.getPointAt(t, c);
    v.fromBufferAttribute(pos, i).sub(c);
    v.multiplyScalar(THREE.MathUtils.lerp(rStart, rEnd, t)).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeHewnSlabGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, -0.35);
  shape.lineTo(-0.15, -0.52);
  shape.lineTo(0.48, -0.4);
  shape.lineTo(0.58, 0.12);
  shape.lineTo(0.22, 0.5);
  shape.lineTo(-0.44, 0.42);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildLookdevEnvironment(
  scene: THREE.Scene,
  seed: number,
  textures: ProceduralTextures,
): LookdevPropsRig {
  const rng = createRng(seed ^ 0x3f84a21c);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: textures.stoneRoughness,
    roughness: 0.88,
    metalness: 0.05,
  });
  const oakMat = applyFresnelRim(
    new THREE.MeshStandardMaterial({
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.35, 1.35),
      roughness: 0.84,
      metalness: 0.04,
    }),
    {color: 0x3be88c, power: 3.4, intensity: 0.24},
  );
  const weatheredOakMat = new THREE.MeshStandardMaterial({
    color: 0x5c4f42,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughness: 0.9,
    metalness: 0.03,
  });
  const rootBarkMat = new THREE.MeshStandardMaterial({
    color: 0x26241c,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.92,
    metalness: 0.02,
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x052d18,
    emissive: 0x26d97c,
    emissiveIntensity: 1.25,
    roughness: 0.28,
    metalness: 0.08,
  });

  // 1. Undulating dark peat terrain with Sobel normal map & roughness puddles
  const terrainGeo = new THREE.PlaneGeometry(110, 110, 84, 84);
  terrainGeo.rotateX(-Math.PI / 2);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeightAt(x, z));
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
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Dark reflective bog water plane pooling inside the sunken bog hollow
  const waterNormal = textures.groundNormal.clone();
  waterNormal.repeat.set(5, 5);
  waterNormal.needsUpdate = true;
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x060c0b,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.14,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.35,
  });
  const bogWater = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), waterMat);
  bogWater.rotation.x = -Math.PI / 2;
  bogWater.position.set(4.5, -0.1, -1.4);
  bogWater.receiveShadow = true;
  scene.add(bogWater);

  // 2. Hewn beveled mossy flagstones leading toward the Nav Altar
  const slabGeo = makeHewnSlabGeo();
  const slabs = new THREE.InstancedMesh(slabGeo, stoneMat, 14);
  slabs.receiveShadow = true;
  slabs.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const z = 4.6 - i * 0.68;
    const x = Math.sin(i * 0.72) * 0.48 + rng.range(-0.18, 0.18);
    dummy.position.set(x, terrainHeightAt(x, z) - 0.015, z);
    dummy.rotation.set(rng.range(-0.04, 0.04), rng.range(0, Math.PI * 2), rng.range(-0.04, 0.04));
    const s = rng.range(0.68, 1.05);
    dummy.scale.set(s, 1, s * rng.range(0.75, 1.12));
    dummy.updateMatrix();
    slabs.setMatrixAt(i, dummy.matrix);
  }
  slabs.instanceMatrix.needsUpdate = true;
  slabs.computeBoundingSphere();
  scene.add(slabs);

  // Snaking mossy roots arching along the path & altar bank
  const rootPaths: [number, number, number][][] = [
    [
      [-3.8, -0.05, -2.1],
      [-2.7, 0.24, -2.5],
      [-1.7, 0.18, -3.2],
      [-1.1, -0.02, -3.4],
    ],
    [
      [1.8, -0.04, -4.8],
      [0.9, 0.22, -4.4],
      [0.1, 0.16, -3.9],
    ],
    [
      [-5.2, 0.02, 0.6],
      [-4.1, 0.16, 0.1],
      [-3.0, -0.04, 0.4],
    ],
  ];
  for (const pts of rootPaths) {
    const root = new THREE.Mesh(makeCurvedTubeGeo(pts, 0.13, 0.035, 10, 6), rootBarkMat);
    root.castShadow = true;
    root.receiveShadow = true;
    scene.add(root);
  }

  // 3. Carved Slavic Nav Idol Altar (PR_NavAltar) with inlaid ground ritual stones & candles
  const navAltarGroup = new THREE.Group();
  const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.88, 0.34, 9), stoneMat);
  baseStep.position.y = 0.17;
  const upperStep = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.32, 0.28, 9), stoneMat);
  upperStep.position.y = 0.48;

  // Embedded segmented stone ritual collar (no blown-out white hoop)
  const runeArcGeo = new THREE.BoxGeometry(0.42, 0.05, 0.11);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const runeSegment = new THREE.Mesh(runeArcGeo, runeMat);
    runeSegment.position.set(Math.sin(ang) * 1.44, 0.34, Math.cos(ang) * 1.44);
    runeSegment.rotation.y = ang;
    navAltarGroup.add(runeSegment);
  }

  const idolProfile = [
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.5, 0.55),
    new THREE.Vector2(0.44, 0.65),
    new THREE.Vector2(0.52, 1.2),
    new THREE.Vector2(0.43, 1.32),
    new THREE.Vector2(0.49, 2.05),
    new THREE.Vector2(0.54, 2.38),
    new THREE.Vector2(0.4, 2.68),
    new THREE.Vector2(0.5, 2.95),
    new THREE.Vector2(0.06, 3.35),
  ];
  const idolBody = new THREE.Mesh(new THREE.LatheGeometry(idolProfile, 12), oakMat);
  idolBody.position.y = 0.58;

  const shoulderWing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.24, 0.36), oakMat);
  shoulderWing.position.y = 2.42;
  const browRidge = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.22, 0.46), oakMat);
  browRidge.position.set(0, 2.96, 0.22);
  const beardWedge = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.86, 5), oakMat);
  beardWedge.rotation.x = Math.PI;
  beardWedge.position.set(0, 2.26, 0.38);

  const eyeGeo = new THREE.BoxGeometry(0.14, 0.048, 0.08);
  const eyeL = new THREE.Mesh(eyeGeo, runeMat);
  eyeL.position.set(-0.18, 2.8, 0.44);
  const eyeR = new THREE.Mesh(eyeGeo, runeMat);
  eyeR.position.set(0.18, 2.8, 0.44);
  const beltRune = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 6, 20), runeMat);
  beltRune.rotation.x = Math.PI / 2;
  beltRune.position.y = 1.9;

  // Offering candles & leaning bone skull at base
  const candleWaxMat = new THREE.MeshStandardMaterial({color: 0xc2b294, roughness: 0.78});
  const candleFlameMat = new THREE.MeshBasicMaterial({color: 0xf5953c});
  for (const [cx, cz, ch] of [
    [-0.95, 0.72, 0.24],
    [-0.78, 0.88, 0.18],
    [0.92, 0.7, 0.26],
    [1.06, 0.48, 0.16],
    [-0.42, 1.05, 0.14],
  ]) {
    const cBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, ch, 7), candleWaxMat);
    cBody.position.set(cx, 0.34 + ch * 0.5, cz);
    const cFlame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.085, 6), candleFlameMat);
    cFlame.position.set(cx, 0.34 + ch + 0.045, cz);
    navAltarGroup.add(cBody, cFlame);
  }
  const offeringSkull = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.13, 0),
    new THREE.MeshStandardMaterial({
      map: textures.boneAlbedo,
      normalMap: textures.boneNormal,
      roughness: 0.74,
    }),
  );
  offeringSkull.position.set(0.32, 0.72, 0.94);
  offeringSkull.rotation.set(0.25, -0.45, 0.15);

  const altarLight = new THREE.PointLight(0x3be88c, 13, 14, 1.55);
  altarLight.position.set(0, 2.35, 1.05);
  navAltarGroup.add(
    baseStep,
    upperStep,
    idolBody,
    shoulderWing,
    browRidge,
    beardWedge,
    eyeL,
    eyeR,
    beltRune,
    offeringSkull,
    altarLight,
  );
  navAltarGroup.traverse((m) => {
    if (m instanceof THREE.Mesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  navAltarGroup.position.set(-0.8, terrainHeightAt(-0.8, -3.8), -3.8);
  scene.add(navAltarGroup);

  // 4. Nav Monolith Standing Stones (rise smoothly during Nav Shift E!)
  const navStones: {mesh: THREE.Group; baseY: number; phase: number}[] = [];
  for (const [sx, sz, rot, sc] of [
    [-4.4, -3.3, 0.45, 1.0],
    [3.9, -4.6, -0.55, 1.15],
    [-3.1, -6.5, 0.15, 0.95],
  ]) {
    const sg = new THREE.Group();
    const stone = new THREE.Mesh(new THREE.ConeGeometry(0.54 * sc, 2.35 * sc, 5), stoneMat);
    stone.position.y = 0.98 * sc;
    stone.castShadow = true;
    const sigil = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.95 * sc, 0.08), runeMat);
    sigil.position.set(0, 1.15 * sc, 0.3 * sc);
    sg.add(stone, sigil);
    const by = terrainHeightAt(sx, sz) - 0.62;
    sg.position.set(sx, by, sz);
    sg.rotation.y = rot;
    scene.add(sg);
    navStones.push({mesh: sg, baseY: by, phase: sx * 0.7});
  }

  // 5. Campfire / Brazier (PR_Campfire_Torch) with animated GLSL fire shader
  const fireGroup = new THREE.Group();
  const ashMat = new THREE.MeshStandardMaterial({color: 0x131110, roughness: 0.97});
  const charredWoodMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    color: 0x2e2119,
    roughness: 0.92,
  });
  const fireRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.14, 7, 11), stoneMat);
  fireRing.rotation.x = Math.PI / 2;
  fireRing.position.y = 0.08;
  const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.08, 10), ashMat);
  ashBed.position.y = 0.04;
  const coalMat = new THREE.MeshStandardMaterial({
    color: 0x4f1c08,
    emissive: 0xe05814,
    emissiveIntensity: 1.8,
    roughness: 0.45,
  });
  const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), coalMat);
  coals.scale.set(1.25, 0.32, 1.25);
  coals.position.y = 0.09;
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.94, 6), charredWoodMat);
    log.position.y = 0.16;
    log.rotation.set(0.32, (i * Math.PI) / 2 + 0.3, Math.PI / 2 - 0.34);
    log.castShadow = true;
    fireGroup.add(log);
  }
  const campFlameUniforms = {uTime: {value: 0}, uNavBlend: {value: 0}};
  const campFlameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: campFlameUniforms,
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 9.0 + p.y * 8.0) * 0.06 * uv.y;
        p.z += cos(uTime * 7.5 + p.y * 7.0) * 0.05 * uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uNavBlend;
      void main() {
        float h = clamp(vUv.y, 0.0, 1.0);
        float flicker = 0.78 + 0.22 * sin(uTime * 14.0 + vUv.x * 12.0);
        float alpha = (1.0 - smoothstep(0.32, 1.0, h)) * smoothstep(0.0, 0.14, h) * flicker * (1.0 - uNavBlend * 0.45);
        vec3 col = mix(vec3(1.15, 0.72, 0.26), vec3(0.85, 0.22, 0.04), smoothstep(0.15, 0.85, h));
        gl_FragColor = vec4(col, alpha * 0.9);
      }
    `,
  });
  for (let f = 0; f < 3; f++) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.18 - f * 0.03, 0.62 - f * 0.1, 7, 4),
      campFlameMat,
    );
    flame.position.set((f - 1) * 0.11, 0.34 + f * 0.04, (f % 2 === 0 ? 1 : -1) * 0.06);
    fireGroup.add(flame);
  }
  const campfireLight = new THREE.PointLight(0xe07026, 30, 16, 1.48);
  campfireLight.position.set(0, 1.1, 0);
  fireGroup.add(fireRing, ashBed, coals, campfireLight);
  fireGroup.position.set(-3.9, terrainHeightAt(-3.9, 2.2), 2.2);
  scene.add(fireGroup);

  // Fallen mossy birch log sunken into peat near left clearing edge
  const fallenLog = new THREE.Mesh(
    makeCurvedTubeGeo(
      [
        [-6.9, terrainHeightAt(-6.9, 0.3) - 0.08, 0.3],
        [-5.8, terrainHeightAt(-5.8, -0.3) + 0.14, -0.3],
        [-4.7, terrainHeightAt(-4.7, -0.8) - 0.06, -0.8],
      ],
      0.24,
      0.13,
      9,
      7,
    ),
    new THREE.MeshStandardMaterial({
      map: textures.birchAlbedo,
      normalMap: textures.birchNormal,
      roughness: 0.9,
    }),
  );
  fallenLog.castShadow = true;
  fallenLog.receiveShadow = true;
  scene.add(fallenLog);

  // 6. Crooked Slavic grave markers (голубцы) + weathered wooden picket fence
  const makeGolubets = (x: number, z: number, rotY: number, tiltZ: number) => {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.82, 0.16), weatheredOakMat);
    post.position.y = 0.91;
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.11, 0.11), weatheredOakMat);
    cross.position.y = 1.42;
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.38), weatheredOakMat);
    roofL.position.set(-0.23, 1.82, 0);
    roofL.rotation.z = 0.52;
    const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.38), weatheredOakMat);
    roofR.position.set(0.23, 1.82, 0);
    roofR.rotation.z = -0.52;
    g.add(post, cross, roofL, roofR);
    g.traverse((m) => {
      if (m instanceof THREE.Mesh) m.castShadow = true;
    });
    g.position.set(x, terrainHeightAt(x, z), z);
    g.rotation.set(0.06, rotY, tiltZ);
    scene.add(g);
  };
  makeGolubets(4.6, -2.5, -0.4, 0.08);
  makeGolubets(-5.3, -1.7, 0.5, -0.07);
  makeGolubets(5.8, 2.1, -0.8, 0.1);

  const stakeGeo = new THREE.ConeGeometry(0.085, 1.5, 5);
  stakeGeo.translate(0, 0.75, 0);
  const stakes = new THREE.InstancedMesh(stakeGeo, weatheredOakMat, 18);
  stakes.castShadow = true;
  for (let i = 0; i < 18; i++) {
    const ang = -Math.PI * 0.8 + (i / 17) * Math.PI * 0.6;
    const rad = 8.6 + Math.sin(i * 1.3) * 0.35;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad - 1.5;
    dummy.position.set(x, terrainHeightAt(x, z) - 0.06, z);
    dummy.rotation.set(rng.range(-0.1, 0.1), rng.range(0, 3), rng.range(-0.12, 0.12));
    dummy.scale.set(1, rng.range(0.75, 1.15), 1);
    dummy.updateMatrix();
    stakes.setMatrixAt(i, dummy.matrix);
  }
  stakes.instanceMatrix.needsUpdate = true;
  stakes.computeBoundingSphere();
  scene.add(stakes);

  // 7. Gnarled birch trunks with root flares & multi-forked deadwood branches
  const treeCount = 64;
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.38, 9.6, 8);
  trunkGeo.translate(0, 4.8, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: textures.birchAlbedo,
    normalMap: textures.birchNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.88,
    metalness: 0.02,
  });
  const branchGeo = new THREE.ConeGeometry(0.08, 3.4, 5);
  branchGeo.translate(0, 1.7, 0);
  const branchMat = new THREE.MeshStandardMaterial({
    color: 0x22201c,
    roughness: 0.94,
    metalness: 0.0,
  });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const branches = new THREE.InstancedMesh(branchGeo, branchMat, treeCount * 4);
  const tint = new THREE.Color();
  let bIdx = 0;
  for (let i = 0; i < treeCount; i++) {
    const ang = (i / treeCount) * Math.PI * 2 + rng.range(-0.08, 0.08);
    let rad = 10.6 + rng.range(0.5, 16.5);
    let x = Math.cos(ang) * rad;
    let z = Math.sin(ang) * rad;
    // Clear southern camera corridor
    if (z > 5.5 && Math.abs(x) < 9.5) {
      rad += 10.5;
      x = Math.cos(ang) * rad;
      z = Math.sin(ang) * rad;
    }
    const s = rng.range(0.84, 1.48);
    const ty = terrainHeightAt(x, z) - 0.15;
    const leanX = rng.range(-0.08, 0.08);
    const leanZ = rng.range(-0.09, 0.09);
    dummy.position.set(x, ty, z);
    dummy.rotation.set(leanX, rng.range(0, Math.PI * 2), leanZ);
    dummy.scale.set(s, s * rng.range(0.9, 1.25), s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    const shade = rng.range(0.62, 0.95);
    tint.setRGB(shade, shade * 0.94, shade * 0.88);
    trunks.setColorAt(i, tint);

    for (let k = 0; k < 4; k++) {
      const bAngle = (k / 4) * Math.PI * 2 + rng.range(-0.4, 0.4);
      dummy.position.set(x, ty + (3.8 + k * 0.95) * s, z);
      dummy.rotation.set(Math.cos(bAngle) * 0.82, bAngle, Math.sin(bAngle) * 0.82);
      dummy.scale.set(s * 0.9, s * rng.range(0.75, 1.25), s * 0.9);
      dummy.updateMatrix();
      branches.setMatrixAt(bIdx++, dummy.matrix);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  branches.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  branches.computeBoundingSphere();
  scene.add(trunks, branches);

  // Asymmetric gnarled deadwood boughs tapering cleanly to fine twigs
  for (const pts of [
    [
      [-9.4, -0.2, -7.8],
      [-7.8, 3.2, -7.1],
      [-5.6, 5.1, -6.5],
      [-3.1, 6.2, -6.1],
      [-1.4, 6.9, -5.8],
    ],
    [
      [9.2, -0.2, -6.9],
      [7.4, 3.0, -6.4],
      [4.9, 4.9, -5.9],
      [2.6, 5.8, -5.4],
    ],
  ] as [number, number, number][][]) {
    const bough = new THREE.Mesh(makeCurvedTubeGeo(pts, 0.34, 0.018, 12, 7), trunkMat);
    bough.castShadow = true;
    scene.add(bough);
  }

  // 8. Bowed Fern Rosettes & Mossy Rocks (curving outwards naturally instead of vertical pins!)
  const frondShape = new THREE.Shape();
  frondShape.moveTo(-0.04, 0);
  frondShape.quadraticCurveTo(-0.06, 0.28, 0, 0.56);
  frondShape.quadraticCurveTo(0.06, 0.28, 0.04, 0);
  frondShape.closePath();
  const frondGeo = new THREE.ShapeGeometry(frondShape, 5);
  // Bend the frond geometry so blades droop naturally outward
  const fPos = frondGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const y = fPos.getY(i);
    fPos.setZ(i, y * y * 0.95);
  }
  frondGeo.computeVertexNormals();
  const fernMat = new THREE.MeshStandardMaterial({
    color: 0x22331f,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const clumpCount = 52;
  const bladesPerClump = 5;
  const ferns = new THREE.InstancedMesh(frondGeo, fernMat, clumpCount * bladesPerClump);
  let fIdx = 0;
  for (let c = 0; c < clumpCount; c++) {
    const ang = (c / clumpCount) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rad = rng.range(2.8, 11.5);
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    if (Math.hypot(cx - -1.6, cz - 2.2) < 1.5 || Math.hypot(cx - 2.3, cz - -1.6) < 2.1) {
      for (let b = 0; b < bladesPerClump; b++) {
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        ferns.setMatrixAt(fIdx++, dummy.matrix);
      }
      continue;
    }
    const baseY = terrainHeightAt(cx, cz) - 0.02;
    const clumpScale = rng.range(0.75, 1.35);
    for (let b = 0; b < bladesPerClump; b++) {
      const bAng = (b / bladesPerClump) * Math.PI * 2 + rng.range(-0.3, 0.3);
      dummy.position.set(cx, baseY, cz);
      dummy.rotation.set(rng.range(0.25, 0.55), bAng, rng.range(-0.15, 0.15));
      dummy.scale.set(clumpScale, clumpScale * rng.range(0.85, 1.2), clumpScale);
      dummy.updateMatrix();
      ferns.setMatrixAt(fIdx++, dummy.matrix);
    }
  }
  ferns.instanceMatrix.needsUpdate = true;
  ferns.computeBoundingSphere();
  scene.add(ferns);

  const rockGeo = new THREE.DodecahedronGeometry(0.48, 1);
  const rocks = new THREE.InstancedMesh(rockGeo, stoneMat, 20);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rad = rng.range(4.6, 11.2);
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const sx = rng.range(0.6, 1.45);
    dummy.position.set(x, terrainHeightAt(x, z) + 0.06, z);
    dummy.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
    dummy.scale.set(sx, rng.range(0.45, 0.85), sx * rng.range(0.7, 1.3));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  scene.add(rocks);

  // 9. Signature VFX: Carved Slavic Rune Telegraph under Upyr (refined organic ritual sigil)
  const telegraphUniforms = {uTime: {value: 0}, uNavBlend: {value: 0}};
  const telegraphMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: telegraphUniforms,
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
      uniform float uNavBlend;
      void main() {
        float r = length(vUv);
        float angle = atan(vUv.y, vUv.x);
        float outer = smoothstep(0.95, 0.91, r) * smoothstep(0.85, 0.89, r);
        float runes = step(0.25, sin(angle * 10.0 + uTime * 1.1));
        float ticks = smoothstep(0.86, 0.84, r) * smoothstep(0.74, 0.77, r) * step(0.55, cos(angle * 10.0 - uTime * 0.8));
        float inner = smoothstep(0.64, 0.61, r) * smoothstep(0.56, 0.59, r) * runes;
        float glow = smoothstep(0.9, 0.15, r) * (0.09 + uNavBlend * 0.08);
        float alpha = clamp(outer * 0.82 + inner * 0.75 + ticks * 0.55 + glow, 0.0, 0.88);
        if (alpha < 0.02 || r > 0.98) discard;
        vec3 col = mix(vec3(0.06, 0.48, 0.28), vec3(0.18, 0.82, 0.48), outer + inner);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const telegraphRing = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), telegraphMat);
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.set(2.3, terrainHeightAt(2.3, -1.6) + 0.035, -1.6);
  scene.add(telegraphRing);

  // 10. Signature Mist Layers (low drifting swamp mist)
  const mistUniforms = {
    uTime: {value: 0},
    uNavBlend: {value: 0},
  };
  const mistPlanes: THREE.Mesh[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: mistUniforms.uTime,
        uNavBlend: mistUniforms.uNavBlend,
        uLayer: {value: layer},
      },
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
        uniform float uNavBlend;
        uniform float uLayer;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float radial = smoothstep(1.0, 0.22, length(p));
          float wave = sin(vUv.x * 9.0 + uTime * (0.28 + uLayer * 0.08) + uLayer * 2.1)
                     * cos(vUv.y * 7.0 - uTime * 0.21 + uLayer);
          float wisp = smoothstep(-0.35, 0.75, wave);
          float alpha = radial * wisp * ((0.14 - uLayer * 0.025) + uNavBlend * 0.075);
          vec3 yavMist = vec3(0.13, 0.19, 0.25);
          vec3 navMist = vec3(0.07, 0.34, 0.21);
          vec3 col = mix(yavMist, navMist, uNavBlend);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mPlane = new THREE.Mesh(new THREE.PlaneGeometry(38, 38), mistMat);
    mPlane.rotation.x = -Math.PI / 2;
    mPlane.position.y = 0.18 + layer * 0.38;
    scene.add(mPlane);
    mistPlanes.push(mPlane);
  }

  // 11. Floating Nav Spirit Wisps
  const wispCount = 7;
  const wispMat = new THREE.MeshBasicMaterial({
    color: 0x3be88c,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const wisps: {mesh: THREE.Mesh; ax: number; az: number; r: number; speed: number; phase: number}[] = [];
  for (let i = 0; i < wispCount; i++) {
    const wm = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), wispMat);
    scene.add(wm);
    wisps.push({
      mesh: wm,
      ax: -0.6 + rng.range(-3.5, 4.2),
      az: -3.2 + rng.range(-2.6, 2.8),
      r: rng.range(0.6, 1.5),
      speed: rng.range(0.8, 1.6),
      phase: rng.range(0, Math.PI * 2),
    });
  }

  // 12. Rising torch & Nav embers
  const emberCount = 42;
  const emberGeo = new THREE.DodecahedronGeometry(0.03, 0);
  const emberMat = new THREE.MeshBasicMaterial({color: 0xe07026});
  const embersMesh = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
  const emberSeeds = Array.from({length: emberCount}, () => ({
    x: rng.range(-5.5, 4.5),
    z: rng.range(-5.0, 4.0),
    speed: rng.range(0.35, 0.85),
    phase: rng.range(0, 10),
  }));
  embersMesh.frustumCulled = false;
  scene.add(embersMesh);

  const _cFire = new THREE.Color(0xe07026);
  const _cNavEmber = new THREE.Color(0x3be88c);

  return {
    navAltarGroup,
    runeMat,
    altarLight,
    campfireLight,
    telegraphRing,
    telegraphMat,
    mistPlanes,
    mistUniforms,
    embersMesh,
    animate: (elapsed: number, navBlend: number) => {
      mistUniforms.uTime.value = elapsed;
      mistUniforms.uNavBlend.value = navBlend;
      telegraphUniforms.uTime.value = elapsed;
      telegraphUniforms.uNavBlend.value = navBlend;
      campFlameUniforms.uTime.value = elapsed;
      campFlameUniforms.uNavBlend.value = navBlend;

      // Subtle animated ripple on bog water surface
      waterNormal.offset.set(elapsed * 0.004, elapsed * 0.002);

      const fireFlicker = 1 + Math.sin(elapsed * 11.2) * 0.12 + Math.cos(elapsed * 6.7) * 0.08;
      campfireLight.intensity = 30 * fireFlicker * (1 - navBlend * 0.55);

      const pulse = 1 + Math.sin(elapsed * 3.1) * 0.14 + navBlend * 0.55;
      runeMat.emissiveIntensity = 1.2 * pulse;
      altarLight.intensity = 12 + navBlend * 24 + Math.sin(elapsed * 2.7) * 1.5;

      for (const ns of navStones) {
        ns.mesh.position.y =
          ns.baseY + navBlend * 0.82 + Math.sin(elapsed * 1.8 + ns.phase) * 0.04 * navBlend;
      }

      wispMat.opacity = 0.14 + navBlend * 0.62;
      for (const w of wisps) {
        w.mesh.position.set(
          w.ax + Math.cos(elapsed * w.speed + w.phase) * w.r,
          0.95 + navBlend * 0.55 + Math.sin(elapsed * 2.1 + w.phase) * 0.28,
          w.az + Math.sin(elapsed * w.speed + w.phase) * w.r,
        );
        const ws = 0.45 + navBlend * 0.75 + Math.sin(elapsed * 4 + w.phase) * 0.15;
        w.mesh.scale.setScalar(ws);
      }

      emberMat.color.copy(_cFire).lerp(_cNavEmber, navBlend * 0.75);

      for (let i = 0; i < emberCount; i++) {
        const es = emberSeeds[i];
        const cycle = (elapsed * es.speed + es.phase) % 3.5;
        const y = 0.2 + cycle * 1.05;
        const driftX = es.x + Math.sin(elapsed * 1.4 + es.phase) * 0.35;
        const driftZ = es.z + Math.cos(elapsed * 1.2 + es.phase) * 0.35;
        const scale = Math.max(0.05, 1.0 - cycle / 3.5);
        dummy.position.set(driftX, y, driftZ);
        dummy.scale.setScalar(scale);
        dummy.rotation.set(elapsed, elapsed * 0.7, 0);
        dummy.updateMatrix();
        embersMesh.setMatrixAt(i, dummy.matrix);
      }
      embersMesh.instanceMatrix.needsUpdate = true;
    },
  };
}
