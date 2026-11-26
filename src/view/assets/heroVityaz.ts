import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {CombatActionLock, JumpPhase} from '../../systems/gameSim';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';

export interface HeroAnimateOpts {
  strideDist?: number;
  actionLock?: CombatActionLock;
  attackFrac?: number;
  attackCombo?: number;
  daggerFrac?: number;
  saluteFrac?: number;
  jumpY?: number;
  jumpState?: JumpPhase;
  jumpSquash?: number;
  hitFlash?: number;
  lookLocalYaw?: number;
  lookLocalPitch?: number;
  campfireDist?: number;
  cloakBackLag?: number;
  cloakSideSwing?: number;
  cloakFlutter?: number;
  windGust?: number;
  groundSlopePitch?: number;
  torchShadowEnabled?: boolean;
  sprintFactor?: number;
  navShifted?: boolean;
  isCounter?: boolean;
}

export interface HeroRig {
  group: THREE.Group;
  torsoPivot: THREE.Group;
  headGroup: THREE.Group;
  rightArmPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  cloak: THREE.Mesh;
  hauberk: THREE.Mesh;
  torchLight: THREE.PointLight;
  torchFaceLight: THREE.PointLight;
  flameMesh: THREE.Mesh;
  torchEmberMat: THREE.MeshStandardMaterial;
  resetTrail: () => void;
  animate: (elapsed: number, speedRatio: number, opts?: HeroAnimateOpts) => void;
}

/**
 * Helper to prepare & merge static sub-geometries of the same material inside a bone group
 * so 70+ sculpted armor/anatomy pieces render in minimal GPU draw calls.
 */
function mergePartList(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => {
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
    if (!nonIdx.attributes.uv) {
      const cnt = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    }
    // Strip extra mismatched attributes (e.g. tangent/color) before merge
    for (const key of Object.keys(nonIdx.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        nonIdx.deleteAttribute(key);
      }
    }
    g.dispose();
    return nonIdx;
  });
  const merged = mergeGeometries(normalized, false);
  normalized.forEach((p) => p.dispose());
  return merged;
}

class MaterialBatcher {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(mat: THREE.Material, geo: THREE.BufferGeometry, matrix?: THREE.Matrix4): void {
    const g = geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    geo.dispose();
    const list = this.buckets.get(mat);
    if (list) list.push(g);
    else this.buckets.set(mat, [g]);
  }

  addAt(
    mat: THREE.Material,
    geo: THREE.BufferGeometry,
    px = 0,
    py = 0,
    pz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ): void {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(px, py, pz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    );
    this.add(mat, geo, m);
  }

  flushInto(parent: THREE.Object3D, castShadow = true, receiveShadow = true): void {
    for (const [mat, geos] of this.buckets.entries()) {
      const merged = geos.length === 1 ? geos[0] : mergePartList(geos);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      parent.add(mesh);
    }
    this.buckets.clear();
  }
}

export function buildHeroVityaz(textures: ProceduralTextures): HeroRig {
  const group = new THREE.Group();

  // --- Calibrated Cinematic PBR Materials (MeshPhysicalMaterial, zero plastic orange rims, genuine battle patina) ---
  const forgedSteelMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0xaab4bd,
      map: textures.ironAlbedo,
      normalMap: textures.ironNormal,
      normalScale: new THREE.Vector2(1.55, 1.55),
      roughnessMap: textures.ironRoughness,
      metalness: 0.92,
      roughness: 0.3,
      clearcoat: 0.58,
      clearcoatRoughness: 0.25,
      clearcoatNormalMap: textures.ironNormal,
      clearcoatNormalScale: new THREE.Vector2(0.45, 0.45),
      iridescence: 0.16,
      iridescenceIOR: 1.4,
      iridescenceThicknessMinimum: 120,
      iridescenceThicknessMaximum: 320,
      anisotropy: 0.68,
    }),
    {color: 0x88b0dc, power: 3.4, intensity: 0.22},
  );

  const blackenedIronMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x383d43,
      map: textures.ironAlbedo,
      normalMap: textures.ironNormal,
      normalScale: new THREE.Vector2(1.65, 1.65),
      roughnessMap: textures.ironRoughness,
      metalness: 0.85,
      roughness: 0.46,
      clearcoat: 0.36,
      clearcoatRoughness: 0.36,
      clearcoatNormalMap: textures.ironNormal,
      clearcoatNormalScale: new THREE.Vector2(0.4, 0.4),
    }),
    {color: 0x88b0dc, power: 3.5, intensity: 0.18},
  );

  const lamellarMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0xb6bec4,
      map: textures.lamellarAlbedo,
      normalMap: textures.lamellarNormal,
      normalScale: new THREE.Vector2(1.75, 1.75),
      roughnessMap: textures.ironRoughness,
      metalness: 0.88,
      roughness: 0.36,
      clearcoat: 0.48,
      clearcoatRoughness: 0.3,
      iridescence: 0.14,
      iridescenceIOR: 1.38,
      iridescenceThicknessMinimum: 100,
      iridescenceThicknessMaximum: 280,
    }),
    {color: 0x88b0dc, power: 3.4, intensity: 0.2},
  );

  const mailMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x8e969e,
      map: textures.mailAlbedo,
      normalMap: textures.mailNormal,
      normalScale: new THREE.Vector2(1.9, 1.9),
      roughnessMap: textures.mailRoughness,
      metalness: 0.94,
      roughness: 0.34,
      clearcoat: 0.62,
      clearcoatRoughness: 0.24,
      clearcoatNormalMap: textures.mailNormal,
      clearcoatNormalScale: new THREE.Vector2(0.6, 0.6),
      anisotropy: 0.7,
    }),
    {color: 0x88b0dc, power: 3.4, intensity: 0.22},
  );

  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: 0x9b794a,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textures.ironRoughness,
    metalness: 0.88,
    roughness: 0.34,
    clearcoat: 0.42,
    clearcoatRoughness: 0.28,
    anisotropy: 0.5,
  });

  const etchedSilverMat = new THREE.MeshPhysicalMaterial({
    color: 0xc2cad2,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.ironRoughness,
    metalness: 0.94,
    roughness: 0.26,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });

  const leatherMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x322117,
      map: textures.clothAlbedo,
      normalMap: textures.clothNormal,
      normalScale: new THREE.Vector2(1.3, 1.3),
      metalness: 0.04,
      roughness: 0.82,
      sheen: 0.32,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0x5e412c),
      clearcoat: 0.16,
      clearcoatRoughness: 0.58,
    }),
    {color: 0x7c97b5, power: 3.6, intensity: 0.12},
  );

  const gambesonMat = new THREE.MeshStandardMaterial({
    color: 0x241c16,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    metalness: 0.02,
    roughness: 0.9,
  });

  const cloakMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x4e1819,
      map: textures.clothAlbedo,
      normalMap: textures.clothNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      metalness: 0.02,
      roughness: 0.92,
      sheen: 0.88,
      sheenRoughness: 0.68,
      sheenColor: new THREE.Color(0x9a3d30),
      side: THREE.DoubleSide,
    }),
    {color: 0x8ea9c4, power: 3.5, intensity: 0.18},
  );

  const furMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b1613,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(2.2, 2.2),
    roughness: 0.96,
    metalness: 0.0,
    sheen: 0.56,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x64574c),
  });

  const plumeMat = new THREE.MeshPhysicalMaterial({
    color: 0x3d0f11,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.86,
    metalness: 0.02,
    sheen: 0.28,
    sheenColor: new THREE.Color(0x5c1a1c),
  });

  const skinShadowMat = new THREE.MeshStandardMaterial({
    color: 0x4f3628,
    roughness: 0.84,
    metalness: 0.02,
  });

  const beardMat = new THREE.MeshStandardMaterial({
    color: 0x1d1713,
    normalMap: textures.clothNormal,
    roughness: 0.95,
    metalness: 0.0,
  });

  const eyeGlintMat = new THREE.MeshStandardMaterial({
    color: 0x16110d,
    emissive: 0xc27b42,
    emissiveIntensity: 0.22,
    roughness: 0.25,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    metalness: 0.04,
    roughness: 0.78,
  });

  const shieldFaceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.shieldAlbedo,
    normalMap: textures.shieldNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    metalness: 0.05,
    roughness: 0.76,
  });

  const torchEmberMat = new THREE.MeshStandardMaterial({
    color: 0x5c2208,
    emissive: 0xee6418,
    emissiveIntensity: 2.0,
    roughness: 0.35,
    metalness: 0.0,
  });

  const axeRuneMat = new THREE.MeshStandardMaterial({
    color: 0x803510,
    emissive: 0xef7b24,
    emissiveIntensity: 1.65,
    roughness: 0.22,
    metalness: 0.45,
  });

  // Ground contact shadow
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(0.84, 24),
    new THREE.MeshBasicMaterial({
      color: 0x040605,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.025;
  group.add(contact);

  // --- 1. Anatomically Jointed Legs (Hip -> Thigh -> Knee Poleyn -> Shin Pivot -> Boot) ---
  const buildBootGeometry = (): THREE.BufferGeometry => {
    const bootProfile = new THREE.Shape();
    bootProfile.moveTo(-0.075, -0.07);
    bootProfile.lineTo(0.075, -0.07);
    bootProfile.lineTo(0.08, 0.07);
    bootProfile.quadraticCurveTo(0.068, 0.16, 0.0, 0.185);
    bootProfile.quadraticCurveTo(-0.068, 0.16, -0.08, 0.07);
    bootProfile.closePath();
    const g = new THREE.ExtrudeGeometry(bootProfile, {
      depth: 0.095,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.016,
      bevelSegments: 2,
    });
    g.rotateX(Math.PI / 2);
    return g;
  };

  const makeLeg = (
    x: number,
  ): {pivot: THREE.Group; shinPivot: THREE.Group} => {
    const hip = new THREE.Group();
    hip.position.set(x, 0.78, 0);

    const upperBatch = new MaterialBatcher();
    // Sculpted thigh breeches
    const thighProfile = [
      new THREE.Vector2(0.085, -0.36),
      new THREE.Vector2(0.105, -0.2),
      new THREE.Vector2(0.118, -0.05),
      new THREE.Vector2(0.105, 0.02),
    ];
    upperBatch.addAt(gambesonMat, new THREE.LatheGeometry(thighProfile, 10));
    // Leather cuisse thigh guard + strap
    upperBatch.addAt(
      leatherMat,
      new THREE.CylinderGeometry(0.114, 0.098, 0.24, 9, 1, false, -Math.PI * 0.45, Math.PI * 0.9),
      0,
      -0.17,
      0.015,
    );
    upperBatch.addAt(leatherMat, new THREE.TorusGeometry(0.104, 0.012, 5, 14), 0, -0.22, 0.01, Math.PI / 2);
    upperBatch.flushInto(hip);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.36, 0);
    hip.add(shinPivot);

    const shinBatch = new MaterialBatcher();
    // Sculpted iron knee poleyn + side wing + brass rivet
    shinBatch.addAt(forgedSteelMat, new THREE.SphereGeometry(0.084, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), 0, 0.01, 0.045, Math.PI / 2, 0, 0, 1.0, 1.0, 0.75);
    shinBatch.addAt(bronzeMat, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 6), 0, 0.01, 0.11, Math.PI / 2);
    // Wrapped calf (онучи)
    const calfProfile = [
      new THREE.Vector2(0.068, -0.36),
      new THREE.Vector2(0.088, -0.22),
      new THREE.Vector2(0.095, -0.08),
      new THREE.Vector2(0.082, 0.0),
    ];
    shinBatch.addAt(leatherMat, new THREE.LatheGeometry(calfProfile, 10));
    // Fluted front iron greave (поножа) + leather buckle straps
    shinBatch.addAt(
      blackenedIronMat,
      new THREE.CylinderGeometry(0.096, 0.078, 0.29, 8, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
      0,
      -0.17,
      0.015,
    );
    shinBatch.addAt(forgedSteelMat, new THREE.BoxGeometry(0.022, 0.27, 0.024), 0, -0.17, 0.1);
    for (const sy of [-0.09, -0.25]) {
      shinBatch.addAt(leatherMat, new THREE.TorusGeometry(0.088, 0.011, 5, 14), 0, sy, 0.005, Math.PI / 2);
    }
    // Contoured leather war-boot + armored iron toe cap & sole heel
    shinBatch.addAt(leatherMat, buildBootGeometry(), 0, -0.31, 0.035);
    shinBatch.addAt(blackenedIronMat, new THREE.BoxGeometry(0.165, 0.028, 0.27), 0, -0.405, 0.065);
    shinBatch.addAt(
      forgedSteelMat,
      new THREE.SphereGeometry(0.076, 8, 6, 0, Math.PI, 0, Math.PI * 0.55),
      0,
      -0.37,
      0.16,
      0,
      0,
      0,
      1.0,
      0.68,
      1.15,
    );
    shinBatch.flushInto(shinPivot);

    return {pivot: hip, shinPivot};
  };

  const leftLeg = makeLeg(-0.175);
  const rightLeg = makeLeg(0.175);
  const leftLegPivot = leftLeg.pivot;
  const rightLegPivot = rightLeg.pivot;
  group.add(leftLegPivot, rightLegPivot);

  // --- 2. Sculpted Torso, Lamellar Cuirass, Baldric, Hauberk Skirt & Tassets ---
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.78;
  group.add(torsoPivot);

  // Chainmail hauberk skirt (sways gently during stride)
  const skirtProfile = [
    new THREE.Vector2(0.36, -0.26),
    new THREE.Vector2(0.32, -0.06),
    new THREE.Vector2(0.28, 0.14),
    new THREE.Vector2(0.31, 0.42),
    new THREE.Vector2(0.21, 0.62),
  ];
  const hauberk = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 14), mailMat);
  hauberk.castShadow = true;
  hauberk.receiveShadow = true;
  torsoPivot.add(hauberk);

  const torsoBatch = new MaterialBatcher();

  // Anatomically tapered gambeson chest + narrow waist + broad shoulders
  const bodyProfile = [
    new THREE.Vector2(0.27, 0.04),
    new THREE.Vector2(0.245, 0.18),
    new THREE.Vector2(0.275, 0.38),
    new THREE.Vector2(0.335, 0.62),
    new THREE.Vector2(0.275, 0.78),
    new THREE.Vector2(0.135, 0.86),
  ];
  torsoBatch.addAt(gambesonMat, new THREE.LatheGeometry(bodyProfile, 14), 0, 0, 0, 0, 0, 0, 1.08, 1.0, 0.86);

  // Rus overlapping lamellar armored vest (чешуйчатый панцирь)
  const cuirassProfile = [
    new THREE.Vector2(0.275, 0.17),
    new THREE.Vector2(0.295, 0.36),
    new THREE.Vector2(0.355, 0.61),
    new THREE.Vector2(0.285, 0.76),
    new THREE.Vector2(0.155, 0.82),
  ];
  torsoBatch.addAt(lamellarMat, new THREE.LatheGeometry(cuirassProfile, 14), 0, 0, 0, 0, 0, 0, 1.09, 1.0, 0.88);

  // Sculpted pectoral iron breastplate + ridge
  torsoBatch.addAt(
    blackenedIronMat,
    new THREE.CylinderGeometry(0.355, 0.31, 0.27, 12, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
    0,
    0.55,
    0.02,
    0,
    0,
    0,
    1.05,
    1.0,
    0.85,
  );
  // Steel gorget neck collar
  torsoBatch.addAt(forgedSteelMat, new THREE.CylinderGeometry(0.175, 0.24, 0.11, 12), 0, 0.8, 0.01);
  torsoBatch.addAt(bronzeMat, new THREE.TorusGeometry(0.195, 0.014, 6, 16), 0, 0.76, 0.01, Math.PI / 2);

  // Diagonal Heavy Leather Baldric across chest & back
  const baldricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, 0.74, 0.14),
    new THREE.Vector3(0.06, 0.48, 0.295),
    new THREE.Vector3(-0.24, 0.2, 0.21),
    new THREE.Vector3(-0.32, 0.18, -0.05),
    new THREE.Vector3(-0.1, 0.46, -0.285),
    new THREE.Vector3(0.22, 0.74, -0.14),
    new THREE.Vector3(0.24, 0.74, 0.14),
  ]);
  torsoBatch.addAt(leatherMat, new THREE.TubeGeometry(baldricCurve, 28, 0.038, 6, true));
  torsoBatch.addAt(bronzeMat, new THREE.BoxGeometry(0.085, 0.075, 0.04), 0.06, 0.49, 0.305, 0, 0, -0.58);

  // Heavy War-Belt, Bronze Slavic Buckle & Hip Pouch
  torsoBatch.addAt(leatherMat, new THREE.CylinderGeometry(0.285, 0.295, 0.125, 14), 0, 0.12, 0, 0, 0, 0, 1.08, 1.0, 0.88);
  torsoBatch.addAt(bronzeMat, new THREE.BoxGeometry(0.13, 0.11, 0.055), 0, 0.12, 0.265);
  torsoBatch.addAt(blackenedIronMat, new THREE.BoxGeometry(0.075, 0.06, 0.062), 0, 0.12, 0.27);
  // Leather belt pouch on right hip
  torsoBatch.addAt(leatherMat, new THREE.BoxGeometry(0.11, 0.14, 0.085), 0.29, 0.06, 0.11, 0, 0.4, -0.12);
  torsoBatch.addAt(bronzeMat, new THREE.SphereGeometry(0.016, 6, 6), 0.33, 0.07, 0.13);

  // Twin Sculpted Throwing Daggers in leather hip sheaths (left hip)
  for (let d = 0; d < 2; d++) {
    const dx = -0.3 - d * 0.025;
    const dy = 0.06 - d * 0.05;
    const dz = 0.12 - d * 0.09;
    torsoBatch.addAt(leatherMat, new THREE.ConeGeometry(0.032, 0.24, 6), dx, dy - 0.04, dz, Math.PI * 0.82, 0, 0.26);
    torsoBatch.addAt(bronzeMat, new THREE.BoxGeometry(0.085, 0.018, 0.028), dx + 0.015, dy + 0.07, dz - 0.03, 0.35, 0, 0.26);
    torsoBatch.addAt(forgedSteelMat, new THREE.CylinderGeometry(0.016, 0.02, 0.09, 6), dx + 0.028, dy + 0.11, dz - 0.048, -0.45, 0, 0.26);
  }

  // 4 Articulated Lamellar Hip Tassets (front-left, front-right, side-left, side-right)
  const tassetCoords: [number, number, number, number][] = [
    [-0.17, 0.22, -0.22, -0.18],
    [0.17, 0.22, 0.22, -0.18],
    [-0.29, 0.03, -1.45, -0.16],
    [0.29, 0.03, 1.45, -0.16],
  ];
  for (const [tx, tz, tryYaw, trxTilt] of tassetCoords) {
    torsoBatch.addAt(
      lamellarMat,
      new THREE.BoxGeometry(0.17, 0.26, 0.036),
      tx,
      -0.02,
      tz,
      trxTilt,
      tryYaw,
      0,
    );
    torsoBatch.addAt(
      bronzeMat,
      new THREE.BoxGeometry(0.18, 0.022, 0.042),
      tx,
      -0.13,
      tz * 1.06,
      trxTilt,
      tryYaw,
      0,
    );
  }

  // Rich Wolf-Pelt Shoulder Mantle (sculpted draped collar + swept-back hackle fur locks — authentic Rus warrior silhouette)
  const peltCollarProfile = [
    new THREE.Vector2(0.42, 0.56),
    new THREE.Vector2(0.39, 0.68),
    new THREE.Vector2(0.31, 0.77),
    new THREE.Vector2(0.18, 0.81),
  ];
  torsoBatch.addAt(
    furMat,
    new THREE.LatheGeometry(peltCollarProfile, 16, Math.PI * 0.28, Math.PI * 1.44),
    0,
    0,
    -0.02,
    0,
    0,
    0,
    1.05,
    1.0,
    0.92,
  );
  // Swept-back wolf fur hackle tufts along shoulders & upper cloak rim
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const ang = Math.PI * 0.34 + t * Math.PI * 1.32;
    const sx = Math.sin(ang) * 0.32;
    const sz = Math.cos(ang) * 0.27 - 0.02;
    torsoBatch.addAt(
      furMat,
      new THREE.ConeGeometry(0.068, 0.26, 6),
      sx,
      0.66 + (i % 2) * 0.02,
      sz,
      -2.35,
      ang,
      0,
      1.15,
      1.0,
      0.75,
    );
  }
  // Trailing wolf-pelt shoulder lappets over back & front fibula clasps
  for (const side of [-1, 1]) {
    torsoBatch.addAt(
      furMat,
      new THREE.ConeGeometry(0.095, 0.3, 7),
      side * 0.23,
      0.56,
      -0.23,
      2.62,
      0,
      side * 0.28,
      1.2,
      1.0,
      0.62,
    );
    torsoBatch.addAt(
      furMat,
      new THREE.ConeGeometry(0.065, 0.18, 6),
      side * 0.2,
      0.7,
      0.16,
      2.4,
      0,
      -side * 0.18,
      1.1,
      1.0,
      0.7,
    );
    // Bronze fibula cloak brooches + draped front chain
    torsoBatch.addAt(bronzeMat, new THREE.CylinderGeometry(0.048, 0.048, 0.026, 10), side * 0.19, 0.68, 0.235, Math.PI / 2, 0, -side * 0.25);
    torsoBatch.addAt(forgedSteelMat, new THREE.TorusGeometry(0.036, 0.008, 5, 10), side * 0.19, 0.68, 0.248, 0, -side * 0.25, 0);
  }
  const chainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.67, 0.245),
    new THREE.Vector3(-0.08, 0.6, 0.28),
    new THREE.Vector3(0.0, 0.58, 0.288),
    new THREE.Vector3(0.08, 0.6, 0.28),
    new THREE.Vector3(0.18, 0.67, 0.245),
  ]);
  torsoBatch.addAt(bronzeMat, new THREE.TubeGeometry(chainCurve, 14, 0.011, 5, false));

  torsoBatch.flushInto(torsoPivot);

  // --- 3. Realistic Segmented 3-Lame Steel Pauldrons (NO cartoon spheres!) ---
  const pauldrons: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pWrap = new THREE.Group();
    pWrap.position.set(side * 0.34, 0.64, 0);
    const pBatch = new MaterialBatcher();
    // Main top shoulder shell (sleek curved plate)
    pBatch.addAt(
      forgedSteelMat,
      new THREE.CylinderGeometry(0.15, 0.175, 0.16, 10, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
      side * 0.02,
      0.02,
      0,
      0,
      side > 0 ? Math.PI / 2 : -Math.PI / 2,
      -side * 0.65,
      1.05,
      1.0,
      0.75,
    );
    // Two overlapping lower lames
    for (let l = 1; l <= 2; l++) {
      pBatch.addAt(
        blackenedIronMat,
        new THREE.CylinderGeometry(0.145, 0.155, 0.08, 10, 1, false, -Math.PI * 0.38, Math.PI * 0.76),
        side * (0.04 + l * 0.018),
        0.02 - l * 0.065,
        0,
        0,
        side > 0 ? Math.PI / 2 : -Math.PI / 2,
        -side * (0.55 - l * 0.08),
        1.0,
        1.0,
        0.72,
      );
    }
    // Brass edge trim & rivet studs
    pBatch.addAt(bronzeMat, new THREE.BoxGeometry(0.03, 0.02, 0.18), side * 0.08, -0.09, 0, 0, 0, -side * 0.4);
    pBatch.addAt(bronzeMat, new THREE.SphereGeometry(0.015, 6, 6), side * 0.05, 0.06, 0.07);
    pBatch.addAt(bronzeMat, new THREE.SphereGeometry(0.015, 6, 6), side * 0.05, 0.06, -0.07);
    pBatch.flushInto(pWrap);
    torsoPivot.add(pWrap);
    pauldrons.push(pWrap);
  }

  // --- 4. Sculpted Multi-Fold Heavy Travel Cloak (Flared Tattered Silhouette + GPU vertex wave) ---
  const cloakUniforms = {
    uCloakTime: {value: 0},
    uCloakFlutter: {value: 0.08},
  };
  const cloakBackMat = applyFresnelRim(cloakMat.clone(), {
    color: 0x8ea9c4,
    power: 3.5,
    intensity: 0.18,
  });
  const baseCloakCompile = cloakBackMat.onBeforeCompile;
  cloakBackMat.onBeforeCompile = (shader, renderer) => {
    baseCloakCompile(shader, renderer);
    shader.uniforms.uCloakTime = cloakUniforms.uCloakTime;
    shader.uniforms.uCloakFlutter = cloakUniforms.uCloakFlutter;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uCloakTime;\nuniform float uCloakFlutter;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float hemWeight = clamp((-position.y - 0.15) / 1.15, 0.0, 1.0);
        float cWave = sin(uCloakTime + position.x * 4.5 + position.y * 2.6) * uCloakFlutter * hemWeight;
        transformed.x += cWave * 0.42;
        transformed.z -= (abs(cWave) * 0.52 + sin(uCloakTime * 0.7 + position.x * 3.1) * uCloakFlutter * 0.28 * hemWeight);`,
      );
  };
  cloakBackMat.customProgramCacheKey = () => 'fresnel_rim_cloak_wave_v3';

  const cloakGeo = new THREE.CylinderGeometry(
    0.25,
    0.72,
    1.38,
    26,
    9,
    true,
    Math.PI * 0.54,
    Math.PI * 0.92,
  );
  cloakGeo.translate(0, -0.68, 0);
  // Sculpt deep natural cloth pleats & jagged war-tattered hem points directly in geometry
  const cPos = cloakGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cPos.count; i++) {
    const vx = cPos.getX(i);
    const vy = cPos.getY(i);
    const vz = cPos.getZ(i);
    const drop = THREE.MathUtils.clamp(-vy / 1.38, 0, 1);
    const ang = Math.atan2(vx, vz);
    const pleat = Math.sin(ang * 10.0) * 0.048 * drop;
    const tatter = drop > 0.84 ? Math.sin(ang * 13.0 + 1.1) * 0.085 * ((drop - 0.84) / 0.16) : 0;
    const len = Math.max(0.01, Math.hypot(vx, vz));
    cPos.setX(i, vx + (vx / len) * pleat);
    cPos.setZ(i, vz + (vz / len) * pleat);
    cPos.setY(i, vy + tatter);
  }
  cloakGeo.computeVertexNormals();
  const cloak = new THREE.Mesh(cloakGeo, cloakBackMat);
  cloak.position.set(0, 0.75, -0.08);
  cloak.rotation.x = 0.2;
  cloak.castShadow = true;
  cloak.receiveShadow = true;
  torsoPivot.add(cloak);

  // --- 5. Authentic Kievan Rus Sleek Fluted Shelom Helmet + Etched Silver Brow + Shadowed Bearded Face ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.94, 0.01);
  const headBatch = new MaterialBatcher();

  // Open-front draped chainmail aventail (бармица) wrapping sides & back, leaving face open!
  const aventailProfile = [
    new THREE.Vector2(0.228, -0.175),
    new THREE.Vector2(0.184, -0.05),
    new THREE.Vector2(0.156, 0.068),
  ];
  headBatch.addAt(
    mailMat,
    new THREE.LatheGeometry(aventailProfile, 16, Math.PI * 0.27, Math.PI * 1.46),
    0,
    0,
    -0.01,
  );

  // Sculpted weathered warrior face catching moody torchlight + heavy iron-shaded brow & beard
  headBatch.addAt(skinShadowMat, new THREE.SphereGeometry(0.118, 12, 9), 0, 0.022, 0.044, 0, 0, 0, 0.86, 1.04, 0.94);
  headBatch.addAt(skinShadowMat, new THREE.BoxGeometry(0.128, 0.024, 0.062), 0, 0.058, 0.132); // deep brow ridge
  headBatch.addAt(skinShadowMat, new THREE.BoxGeometry(0.025, 0.055, 0.048), 0, 0.014, 0.152); // nose bridge
  headBatch.addAt(beardMat, new THREE.BoxGeometry(0.11, 0.03, 0.04), 0, -0.022, 0.132); // full mustache under nose
  headBatch.addAt(beardMat, new THREE.ConeGeometry(0.105, 0.21, 9), 0, -0.09, 0.082, Math.PI, 0, 0, 0.84, 1.0, 0.78);
  headBatch.addAt(eyeGlintMat, new THREE.SphereGeometry(0.011, 6, 6), -0.04, 0.036, 0.136);
  headBatch.addAt(eyeGlintMat, new THREE.SphereGeometry(0.011, 6, 6), 0.04, 0.036, 0.136);

  // Sleek, lethal tapered Kievan Rus Shelom helmet silhouette (narrowed, sharp spire, zero bulky rim)
  const shelomProfile = [
    new THREE.Vector2(0.158, 0.055),
    new THREE.Vector2(0.16, 0.11),
    new THREE.Vector2(0.138, 0.182),
    new THREE.Vector2(0.09, 0.255),
    new THREE.Vector2(0.036, 0.335),
    new THREE.Vector2(0.014, 0.425),
    new THREE.Vector2(0.002, 0.46),
  ];
  headBatch.addAt(forgedSteelMat, new THREE.LatheGeometry(shelomProfile, 18), 0, 0, 0.005);

  // Dark forged iron brow band + fine silver rivets (replaces old bright orange plastic ring!)
  headBatch.addAt(blackenedIronMat, new THREE.TorusGeometry(0.158, 0.013, 6, 22), 0, 0.072, 0.005, Math.PI / 2);
  for (let rv = 0; rv < 10; rv++) {
    const a = (rv / 10) * Math.PI * 2;
    headBatch.addAt(etchedSilverMat, new THREE.SphereGeometry(0.009, 5, 5), Math.sin(a) * 0.166, 0.072, Math.cos(a) * 0.166 + 0.005);
  }
  // Fluted vertical blackened steel ribs over helm dome + silver-inlaid nasal bar & ocular arches
  for (let r = 0; r < 6; r++) {
    const a = (r / 6) * Math.PI * 2;
    headBatch.addAt(
      blackenedIronMat,
      new THREE.BoxGeometry(0.014, 0.185, 0.014),
      Math.sin(a) * 0.128,
      0.175,
      Math.cos(a) * 0.128 + 0.005,
      -Math.cos(a) * 0.36,
      0,
      Math.sin(a) * 0.36,
    );
  }
  headBatch.addAt(forgedSteelMat, new THREE.BoxGeometry(0.024, 0.14, 0.026), 0, 0.016, 0.164);
  headBatch.addAt(etchedSilverMat, new THREE.BoxGeometry(0.012, 0.095, 0.012), 0, 0.022, 0.174);
  // Sculpted steel ocular eyebrow guards
  for (const side of [-1, 1]) {
    headBatch.addAt(
      blackenedIronMat,
      new THREE.BoxGeometry(0.068, 0.018, 0.022),
      side * 0.044,
      0.064,
      0.158,
      0.15,
      side * 0.25,
      side * 0.16,
    );
  }
  // Hinged steel cheek-guards (нащёчники)
  for (const side of [-1, 1]) {
    headBatch.addAt(
      blackenedIronMat,
      new THREE.BoxGeometry(0.024, 0.135, 0.098),
      side * 0.144,
      -0.012,
      0.052,
      0.1,
      side * 0.25,
      -side * 0.12,
    );
  }
  headBatch.flushInto(headGroup);

  // Compact trailing dark-crimson horsehair tassel behind Shelom spire (grounded, never floating ribbon)
  const plumePivot = new THREE.Group();
  plumePivot.position.set(0, 0.435, -0.005);
  const plumeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.01, 0),
    new THREE.Vector3(0, -0.01, -0.08),
    new THREE.Vector3(0, -0.11, -0.14),
    new THREE.Vector3(0, -0.24, -0.16),
  ]);
  const plumeMesh = new THREE.Mesh(new THREE.TubeGeometry(plumeCurve, 10, 0.018, 6, false), plumeMat);
  plumeMesh.castShadow = true;
  plumePivot.add(plumeMesh);
  headGroup.add(plumePivot);
  torsoPivot.add(headGroup);

  // --- 6. Right Arm (Shoulder -> Elbow Cop -> Forearm Vambrace -> Gauntlet -> Bearded Sekira Axe) ---
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.36, 0.62, 0);
  const rUpperBatch = new MaterialBatcher();
  rUpperBatch.addAt(mailMat, new THREE.CylinderGeometry(0.072, 0.062, 0.26, 9), 0, -0.13, 0);
  rUpperBatch.addAt(blackenedIronMat, new THREE.CylinderGeometry(0.078, 0.068, 0.16, 8), 0, -0.12, 0);
  rUpperBatch.flushInto(rightArmPivot);

  const rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.set(0, -0.26, 0);
  rightArmPivot.add(rightForearmPivot);

  const rForeBatch = new MaterialBatcher();
  // Sculpted elbow cop (налокотник)
  rForeBatch.addAt(forgedSteelMat, new THREE.SphereGeometry(0.068, 8, 6), 0, 0.0, -0.02, 0, 0, 0, 0.95, 0.95, 1.1);
  // Leather-strapped fluted steel vambrace (наруч)
  rForeBatch.addAt(blackenedIronMat, new THREE.CylinderGeometry(0.064, 0.05, 0.23, 8), 0, -0.115, 0);
  rForeBatch.addAt(forgedSteelMat, new THREE.BoxGeometry(0.018, 0.21, 0.02), 0.054, -0.115, 0.02);
  rForeBatch.addAt(leatherMat, new THREE.TorusGeometry(0.058, 0.01, 5, 12), 0, -0.08, 0, Math.PI / 2);
  rForeBatch.addAt(leatherMat, new THREE.TorusGeometry(0.053, 0.01, 5, 12), 0, -0.17, 0, Math.PI / 2);
  // Articulated armored gauntlet gripping haft (knuckles + fingers)
  rForeBatch.addAt(forgedSteelMat, new THREE.BoxGeometry(0.075, 0.095, 0.08), 0, -0.25, 0.02);
  for (let fg = 0; fg < 3; fg++) {
    rForeBatch.addAt(blackenedIronMat, new THREE.BoxGeometry(0.022, 0.036, 0.042), -0.024 + fg * 0.024, -0.27, 0.058, 0.45, 0, 0);
  }
  rForeBatch.flushInto(rightForearmPivot);

  // Mastercrafted Bearded Slavic Sekira Axe (sharper sweeping edge, deep beard cutout, rear poll spike)
  const axeGroup = new THREE.Group();
  axeGroup.position.set(0, -0.25, 0.04);
  axeGroup.rotation.x = Math.PI * 0.42;
  const axeBatch = new MaterialBatcher();
  const haftCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.24, 0),
    new THREE.Vector3(0, 0.06, 0.015),
    new THREE.Vector3(0, 0.5, 0.005),
    new THREE.Vector3(0, 0.86, -0.015),
  ]);
  axeBatch.addAt(woodMat, new THREE.TubeGeometry(haftCurve, 14, 0.023, 7, false));
  // Leather grip wraps & spiked pommel cap
  axeBatch.addAt(leatherMat, new THREE.CylinderGeometry(0.029, 0.027, 0.24, 8), 0, -0.02, 0.01);
  axeBatch.addAt(forgedSteelMat, new THREE.ConeGeometry(0.03, 0.09, 7), 0, -0.26, 0, Math.PI);
  axeBatch.addAt(etchedSilverMat, new THREE.CylinderGeometry(0.031, 0.031, 0.09, 8), 0, 0.74, -0.01);

  // Sharper wide-arc bearded crescent axe blade
  const axeShape = new THREE.Shape();
  axeShape.moveTo(0, 0.06);
  axeShape.lineTo(0.32, 0.22);
  axeShape.quadraticCurveTo(0.45, 0.04, 0.37, -0.27);
  axeShape.quadraticCurveTo(0.25, -0.32, 0.18, -0.19);
  axeShape.quadraticCurveTo(0.16, -0.07, 0.02, -0.06);
  axeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(axeShape, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.013,
    bevelSize: 0.011,
    bevelSegments: 2,
  });
  bladeGeo.translate(0, 0, -0.014);
  axeBatch.addAt(forgedSteelMat, bladeGeo, 0.018, 0.71, -0.01);
  // Hammered dark iron socket + rear armor-piercing poll spike + glowing amber rune inlay
  axeBatch.addAt(blackenedIronMat, new THREE.BoxGeometry(0.075, 0.14, 0.068), -0.01, 0.71, -0.01);
  axeBatch.addAt(forgedSteelMat, new THREE.ConeGeometry(0.032, 0.14, 4), -0.09, 0.71, -0.01, 0, 0, Math.PI / 2);
  axeBatch.addAt(axeRuneMat, new THREE.BoxGeometry(0.022, 0.2, 0.052), 0.23, 0.67, -0.01, 0, 0, -0.14);
  axeBatch.flushInto(axeGroup);

  // Blade Tip & Base Anchors for Zero-GC 3D Weapon Swing Trail
  const axeTipAnchor = new THREE.Object3D();
  axeTipAnchor.position.set(0.37, 0.82, -0.01);
  const axeBaseAnchor = new THREE.Object3D();
  axeBaseAnchor.position.set(0.11, 0.56, -0.01);
  axeGroup.add(axeTipAnchor, axeBaseAnchor);

  rightForearmPivot.add(axeGroup);
  torsoPivot.add(rightArmPivot);

  // --- 7. Left Arm (Shoulder -> Elbow -> Vambrace -> Cambered Slavic Shield + Open-Cage Torch) ---
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.36, 0.62, 0);
  const lUpperBatch = new MaterialBatcher();
  lUpperBatch.addAt(mailMat, new THREE.CylinderGeometry(0.072, 0.062, 0.26, 9), 0, -0.13, 0);
  lUpperBatch.addAt(blackenedIronMat, new THREE.CylinderGeometry(0.078, 0.068, 0.16, 8), 0, -0.12, 0);
  lUpperBatch.flushInto(leftArmPivot);

  const leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.set(0, -0.26, 0);
  leftArmPivot.add(leftForearmPivot);

  const lForeBatch = new MaterialBatcher();
  lForeBatch.addAt(forgedSteelMat, new THREE.SphereGeometry(0.068, 8, 6), 0, 0.0, -0.02, 0, 0, 0, 0.95, 0.95, 1.1);
  lForeBatch.addAt(blackenedIronMat, new THREE.CylinderGeometry(0.064, 0.05, 0.22, 8), 0, -0.11, 0);
  lForeBatch.addAt(forgedSteelMat, new THREE.BoxGeometry(0.075, 0.09, 0.08), 0, -0.24, 0.02);
  lForeBatch.flushInto(leftForearmPivot);

  // Cambered Painted Slavic Round Shield strapped to left forearm
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.14, -0.08, 0.1);
  shieldGroup.rotation.y = -Math.PI * 0.42;
  const shieldBatch = new MaterialBatcher();
  // Dished/cambered wood body (LatheGeometry so it is physically curved, not flat!)
  const shieldCurvePts = [
    new THREE.Vector2(0.0, 0.06),
    new THREE.Vector2(0.14, 0.052),
    new THREE.Vector2(0.3, 0.032),
    new THREE.Vector2(0.45, 0.0),
  ];
  const shieldWoodGeo = new THREE.LatheGeometry(shieldCurvePts, 22);
  shieldWoodGeo.rotateX(Math.PI / 2);
  shieldBatch.addAt(shieldFaceMat, shieldWoodGeo);
  shieldBatch.addAt(woodMat, new THREE.CylinderGeometry(0.44, 0.44, 0.022, 20), 0, 0, -0.008, Math.PI / 2);
  // Forged iron outer rim + 10 bronze shield rivets
  shieldBatch.addAt(blackenedIronMat, new THREE.TorusGeometry(0.45, 0.028, 7, 24));
  for (let r = 0; r < 10; r++) {
    const a = (r / 10) * Math.PI * 2;
    shieldBatch.addAt(bronzeMat, new THREE.SphereGeometry(0.017, 6, 6), Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0.018);
  }
  // Fluted conical iron Umbo (shield boss)
  const umboPts = [
    new THREE.Vector2(0.125, 0.045),
    new THREE.Vector2(0.1, 0.06),
    new THREE.Vector2(0.08, 0.115),
    new THREE.Vector2(0.0, 0.145),
  ];
  const umboGeo = new THREE.LatheGeometry(umboPts, 14);
  umboGeo.rotateX(Math.PI / 2);
  shieldBatch.addAt(forgedSteelMat, umboGeo);
  shieldBatch.addAt(bronzeMat, new THREE.TorusGeometry(0.122, 0.012, 5, 16), 0, 0, 0.048);
  shieldBatch.flushInto(shieldGroup);
  leftForearmPivot.add(shieldGroup);

  // Open-Cage Wrought Iron Pitch Torch + Dual-Layer Volumetric Flame
  const torchGroup = new THREE.Group();
  torchGroup.position.set(0.02, -0.22, 0.06);
  torchGroup.rotation.x = Math.PI * 0.34;
  const torchBatch = new MaterialBatcher();
  torchBatch.addAt(woodMat, new THREE.CylinderGeometry(0.026, 0.022, 0.92, 8), 0, 0.32, 0);
  torchBatch.addAt(blackenedIronMat, new THREE.CylinderGeometry(0.05, 0.032, 0.08, 8), 0, 0.74, 0);
  torchBatch.addAt(blackenedIronMat, new THREE.TorusGeometry(0.095, 0.014, 6, 12), 0, 0.9, 0, Math.PI / 2);
  // 6 curved iron cage ribs surrounding glowing coals
  for (let rib = 0; rib < 6; rib++) {
    const ang = (rib / 6) * Math.PI * 2;
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ang) * 0.04, 0.74, Math.sin(ang) * 0.04),
      new THREE.Vector3(Math.cos(ang) * 0.105, 0.83, Math.sin(ang) * 0.105),
      new THREE.Vector3(Math.cos(ang) * 0.092, 0.91, Math.sin(ang) * 0.092),
    ]);
    torchBatch.addAt(blackenedIronMat, new THREE.TubeGeometry(ribCurve, 6, 0.01, 5, false));
  }
  torchBatch.flushInto(torchGroup);

  const coals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.072, 0), torchEmberMat);
  coals.position.y = 0.84;
  torchGroup.add(coals);

  const flameUniforms = {
    uTime: {value: 0},
    uFlameLag: {value: new THREE.Vector2(0, 0)},
  };
  const flameShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: flameUniforms,
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uFlameLag;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float sway = sin(uTime * 11.5 + pos.y * 13.0) * 0.042 * uv.y;
        pos.x += sway + uFlameLag.x * uv.y * 0.28;
        pos.z += cos(uTime * 9.0 + pos.y * 10.5) * 0.032 * uv.y + uFlameLag.y * uv.y * 0.28;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        float h = clamp(vUv.y, 0.0, 1.0);
        float flicker = 0.76 + 0.24 * sin(uTime * 19.0 + vUv.x * 14.0);
        float alpha = (1.0 - smoothstep(0.32, 1.0, h)) * smoothstep(0.0, 0.12, h) * flicker;
        vec3 core = vec3(1.32, 0.84, 0.34);
        vec3 tip = vec3(0.92, 0.22, 0.04);
        vec3 col = mix(core, tip, smoothstep(0.14, 0.85, h));
        gl_FragColor = vec4(col, alpha * 0.94);
      }
    `,
  });
  const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.36, 9, 4), flameShaderMat);
  flameMesh.position.y = 0.96;

  const torchLight = new THREE.PointLight(0xe07026, 32, 18.5, 1.4);
  torchLight.position.set(0, 1.12, 0.06);
  torchLight.shadow.mapSize.set(512, 512);
  torchLight.shadow.camera.near = 0.35;
  torchLight.shadow.camera.far = 16;
  torchLight.shadow.bias = -0.003;

  // Subtle warm bounce light illuminating hero's bearded face, helmet rivets, shoulder fur & chainmail
  const torchFaceLight = new THREE.PointLight(0xff8a36, 4.6, 4.2, 1.55);
  torchFaceLight.position.set(0.18, 0.96, 0.24);
  torchGroup.add(flameMesh, torchLight, torchFaceLight);

  leftForearmPivot.add(torchGroup);
  torsoPivot.add(leftArmPivot);

  // --- Zero-GC 3D Swept Sekira Weapon Swing Trail (14-sample ring buffer in Hero local space) ---
  const TRAIL_SAMPLES = 14;
  const trailPositions = new Float32Array(TRAIL_SAMPLES * 2 * 3);
  const trailUvs = new Float32Array(TRAIL_SAMPLES * 2 * 2);
  const trailIndices: number[] = [];
  for (let i = 0; i < TRAIL_SAMPLES; i++) {
    const u = i / (TRAIL_SAMPLES - 1);
    trailUvs[i * 4] = u;
    trailUvs[i * 4 + 1] = 1; // outer blade edge
    trailUvs[i * 4 + 2] = u;
    trailUvs[i * 4 + 3] = 0; // inner blade base
    if (i < TRAIL_SAMPLES - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      trailIndices.push(a, b, c, b, d, c);
    }
  }
  const trailGeo = new THREE.BufferGeometry();
  const trailPosAttr = new THREE.BufferAttribute(trailPositions, 3);
  trailGeo.setAttribute('position', trailPosAttr);
  trailGeo.setAttribute('uv', new THREE.BufferAttribute(trailUvs, 2));
  trailGeo.setIndex(trailIndices);
  const trailUniforms = {
    uColor: {value: new THREE.Color(0xff9238)},
    uAlpha: {value: 0},
  };
  const trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: trailUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uAlpha;
      void main() {
        float ageFade = pow(1.0 - vUv.x, 1.5);
        float edgeGlow = smoothstep(0.05, 0.88, vUv.y);
        float coreStreak = exp(-pow((vUv.y - 0.85) * 4.5, 2.0));
        float a = (edgeGlow * 0.55 + coreStreak * 0.85) * ageFade * uAlpha;
        vec3 col = mix(uColor, vec3(1.4, 1.25, 0.95), coreStreak * 0.65);
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
      }
    `,
  });
  const axeTrailMesh = new THREE.Mesh(trailGeo, trailMat);
  axeTrailMesh.frustumCulled = false;
  axeTrailMesh.visible = false;
  group.add(axeTrailMesh);

  const _vTip = new THREE.Vector3();
  const _vBase = new THREE.Vector3();
  const _invHeroMat = new THREE.Matrix4();
  let trailActive = false;

  const resetTrail = () => {
    trailActive = false;
    axeTrailMesh.visible = false;
    trailUniforms.uAlpha.value = 0;
  };

  // Smooth stateful dampeners for Look-At IK & secondary physics
  let curHeadYaw = 0;
  let curHeadPitch = 0;
  let curCloakBack = 0.2;
  let curCloakSide = 0;
  let curMailSway = 0;

  return {
    group,
    torsoPivot,
    headGroup,
    rightArmPivot,
    leftArmPivot,
    leftLegPivot,
    rightLegPivot,
    cloak,
    hauberk,
    torchLight,
    torchFaceLight,
    flameMesh,
    torchEmberMat,
    resetTrail,
    animate: (elapsed: number, speedRatio: number, opts?: HeroAnimateOpts) => {
      flameUniforms.uTime.value = elapsed;
      const moveAmp = Math.min(1.35, Math.max(0, speedRatio));
      const idleFade = Math.max(0, 1 - moveAmp * 3.0);

      // Layer 1: Living Idle (Ribcage breathing + Weight shift + Micro-adjustments)
      const breathPhase = elapsed * 2.1;
      const breathLift = Math.sin(breathPhase) * (0.02 + 0.008 * idleFade);
      const weightShift = Math.sin(elapsed * 0.78) * 0.032 * idleFade;
      const microCycle = Math.sin(elapsed * 0.55) * Math.sin(elapsed * 1.9);
      const axeMicroTwist = microCycle * 0.055 * idleFade;
      const shieldMicroShift = Math.cos(elapsed * 0.92) * 0.045 * idleFade;

      pauldrons[0].position.y = 0.64 + Math.max(0, breathLift) * 0.55;
      pauldrons[1].position.y = 0.64 + Math.max(0, breathLift) * 0.55;

      // Layer 2: Root-Motion Stride & True Anatomical Knee Flexion
      const stridePhase = (opts?.strideDist ?? 0) * 2.45;
      const strideBlend = Math.min(1, moveAmp * 1.35);
      const strideSwing = Math.sin(stridePhase) * 0.56 * strideBlend;
      const leftKneeBend = Math.max(0.05, Math.cos(stridePhase) * 0.68 + 0.22) * strideBlend;
      const rightKneeBend = Math.max(0.05, -Math.cos(stridePhase) * 0.68 + 0.22) * strideBlend;

      leftLegPivot.rotation.x = strideSwing + weightShift * 0.55;
      rightLegPivot.rotation.x = -strideSwing - weightShift * 0.55;
      leftLegPivot.rotation.z = weightShift * 0.3;
      rightLegPivot.rotation.z = weightShift * 0.3;
      leftLeg.shinPivot.rotation.x = -leftKneeBend;
      rightLeg.shinPivot.rotation.x = -rightKneeBend;

      // Layer 3: Combat Anticipation / Cleave / Dagger / Heavy Grounded Jump Kinematics
      const salute = opts?.saluteFrac ?? 0;
      const atk = opts?.attackFrac ?? 0;
      const dagger = opts?.daggerFrac ?? 0;
      const combo = opts?.attackCombo ?? 0;
      const lock = opts?.actionLock ?? 'none';
      const jumpY = opts?.jumpY ?? 0;
      const jumpState = opts?.jumpState ?? 'none';
      const jumpSquash = opts?.jumpSquash ?? 0;
      const hitFlash = opts?.hitFlash ?? 0;
      const slopePitch = opts?.groundSlopePitch ?? 0;

      const shadowShrink = Math.max(0.55, 1 - jumpY * 0.35);
      contact.scale.setScalar(shadowShrink);

      let jumpTorsoDrop = 0;
      let jumpPitchAdd = 0;
      if (jumpState === 'windup' && jumpSquash > 0.005) {
        const sy = 1 - jumpSquash * 0.14;
        const sxz = 1 + jumpSquash * 0.09;
        group.scale.set(sxz, sy, sxz);
        jumpTorsoDrop = -jumpSquash * 0.15;
        jumpPitchAdd = jumpSquash * 0.26;
        leftLegPivot.rotation.x = -jumpSquash * 0.52;
        rightLegPivot.rotation.x = -jumpSquash * 0.35;
        leftLeg.shinPivot.rotation.x = jumpSquash * 0.78;
        rightLeg.shinPivot.rotation.x = jumpSquash * 0.62;
      } else if (jumpState === 'land' && jumpSquash > 0.005) {
        const sy = 1 - jumpSquash * 0.18;
        const sxz = 1 + jumpSquash * 0.12;
        group.scale.set(sxz, sy, sxz);
        jumpTorsoDrop = -jumpSquash * 0.19;
        jumpPitchAdd = jumpSquash * 0.3;
        leftLegPivot.rotation.x = -jumpSquash * 0.56;
        rightLegPivot.rotation.x = -jumpSquash * 0.42;
        leftLeg.shinPivot.rotation.x = jumpSquash * 0.85;
        rightLeg.shinPivot.rotation.x = jumpSquash * 0.72;
      } else if (jumpY > 0.02 || jumpState === 'air') {
        const stretch = 1 + jumpY * 0.09;
        const inv = 1 / Math.sqrt(stretch);
        group.scale.set(inv, stretch, inv);
        leftLegPivot.rotation.x = -0.32;
        rightLegPivot.rotation.x = 0.26;
        leftLeg.shinPivot.rotation.x = 0.62;
        rightLeg.shinPivot.rotation.x = 0.28;
        jumpPitchAdd = 0.14;
      } else {
        group.scale.set(1, 1, 1);
      }

      let rArmX = -0.18 + breathLift * 1.4 - strideSwing * 0.48;
      let rArmY = axeMicroTwist;
      let rArmZ = 0.06 + 0.04 * idleFade;
      let rElbowX = -0.32 - Math.abs(strideSwing) * 0.25;

      let lArmX = -0.24 - breathLift * 1.0 + strideSwing * 0.24;
      let lArmY = shieldMicroShift;
      let lArmZ = -0.05;
      let lElbowX = -0.42;

      let torsoYaw = -weightShift * 0.85;
      let torsoPitch = 0.09 * strideBlend + breathLift * 0.5 + jumpPitchAdd + slopePitch * 0.18;

      if (jumpState === 'windup') {
        rArmX += jumpSquash * 0.35;
        lArmX -= jumpSquash * 0.28;
      } else if (jumpState === 'air') {
        rArmX -= 0.32;
        lArmX -= 0.42;
        rArmZ = 0.22;
      } else if (jumpState === 'land') {
        rArmX += jumpSquash * 0.42;
        lArmX += jumpSquash * 0.22;
        rArmZ = 0.18 * jumpSquash;
      }

      const fireDist = opts?.campfireDist ?? 99;
      if (fireDist < 3.6 && moveAmp < 0.1 && lock === 'none' && jumpState === 'none') {
        if (fireDist < 1.55) {
          torsoPitch -= 0.1;
          lArmX -= 0.28;
          lElbowX = -0.75;
        } else {
          torsoPitch += 0.09;
          rArmX -= 0.12;
        }
      }

      if (salute > 0) {
        const strikeCurve = Math.sin(salute * Math.PI);
        rArmX = THREE.MathUtils.lerp(-0.18, -1.35, strikeCurve);
        rArmY = THREE.MathUtils.lerp(0, 0.85, strikeCurve);
        rArmZ = THREE.MathUtils.lerp(0.06, 0.42, strikeCurve);
        rElbowX = THREE.MathUtils.lerp(-0.32, -0.58, strikeCurve);
        lArmX = THREE.MathUtils.lerp(-0.24, -0.78, strikeCurve);
        lArmY = THREE.MathUtils.lerp(0, -0.45, strikeCurve);
        torsoYaw = strikeCurve * 0.24;
      } else if (dagger > 0) {
        const throwArc = Math.sin(dagger * Math.PI);
        lArmX = THREE.MathUtils.lerp(-0.24, -1.25, throwArc);
        lArmY = THREE.MathUtils.lerp(0.55, -0.65, 1 - dagger);
        lArmZ = 0.32 * throwArc;
        lElbowX = THREE.MathUtils.lerp(-0.42, -0.15, throwArc);
        torsoYaw = -0.32 * throwArc;
        rArmX += 0.22 * throwArc;
      } else if (lock === 'windup' && atk > 0) {
        // Phase 1: Slow coiled windup anticipation
        const dir = combo % 2 === 0 ? 1 : -1;
        rArmX = -1.62;
        rArmY = -dir * 1.05;
        rArmZ = -0.38 * dir;
        rElbowX = -0.64;
        lArmX = -0.66;
        torsoYaw = -dir * 0.44;
        torsoPitch -= 0.1;
      } else if (atk > 0) {
        // Phase 2 (ultra-snappy 2-3 frame strike burst) -> Phase 3 (weighted follow-through recovery)
        const dir = combo % 2 === 0 ? 1 : -1;
        const t = 1 - atk; // 0 -> 1 across active strike & recovery
        const snapT = t < 0.36 ? 1 - Math.pow(1 - t / 0.36, 3.2) : 1.0 + Math.sin(((t - 0.36) / 0.64) * Math.PI) * 0.08;
        const swingBell = Math.sin(Math.min(1, t / 0.55) * Math.PI);
        rArmX = THREE.MathUtils.lerp(-1.55, 0.44, snapT);
        rArmY = dir * THREE.MathUtils.lerp(-0.98, 1.08, snapT);
        rArmZ = -0.48 * swingBell * dir;
        rElbowX = THREE.MathUtils.lerp(-0.62, -0.12, snapT);
        torsoYaw = dir * THREE.MathUtils.lerp(-0.4, 0.48, snapT);
        torsoPitch += 0.16 * swingBell;
      }

      torsoPivot.position.set(
        weightShift,
        0.78 + Math.abs(Math.cos(stridePhase)) * 0.034 * strideBlend + breathLift + jumpTorsoDrop,
        0,
      );
      torsoPivot.rotation.set(torsoPitch, torsoYaw, weightShift * 0.45);
      rightArmPivot.rotation.set(rArmX, rArmY, rArmZ);
      rightForearmPivot.rotation.x = rElbowX;
      leftArmPivot.rotation.set(lArmX, lArmY, lArmZ);
      leftForearmPivot.rotation.x = lElbowX;

      // Update Zero-GC 3D Weapon Swing Trail during active cleave or salute
      const trailSwinging = (atk > 0.08 && lock !== 'windup') || salute > 0.12;
      if (trailSwinging) {
        group.updateMatrixWorld(true);
        _invHeroMat.copy(group.matrixWorld).invert();
        axeTipAnchor.getWorldPosition(_vTip).applyMatrix4(_invHeroMat);
        axeBaseAnchor.getWorldPosition(_vBase).applyMatrix4(_invHeroMat);

        if (!trailActive) {
          for (let i = 0; i < TRAIL_SAMPLES; i++) {
            const pIdx = i * 6;
            trailPositions[pIdx] = _vTip.x;
            trailPositions[pIdx + 1] = _vTip.y;
            trailPositions[pIdx + 2] = _vTip.z;
            trailPositions[pIdx + 3] = _vBase.x;
            trailPositions[pIdx + 4] = _vBase.y;
            trailPositions[pIdx + 5] = _vBase.z;
          }
          trailActive = true;
        } else {
          for (let i = TRAIL_SAMPLES - 1; i > 0; i--) {
            const dst = i * 6;
            const src = (i - 1) * 6;
            trailPositions[dst] = trailPositions[src];
            trailPositions[dst + 1] = trailPositions[src + 1];
            trailPositions[dst + 2] = trailPositions[src + 2];
            trailPositions[dst + 3] = trailPositions[src + 3];
            trailPositions[dst + 4] = trailPositions[src + 4];
            trailPositions[dst + 5] = trailPositions[src + 5];
          }
          trailPositions[0] = _vTip.x;
          trailPositions[1] = _vTip.y;
          trailPositions[2] = _vTip.z;
          trailPositions[3] = _vBase.x;
          trailPositions[4] = _vBase.y;
          trailPositions[5] = _vBase.z;
        }
        trailPosAttr.needsUpdate = true;
        trailUniforms.uColor.value.setHex(opts?.navShifted || opts?.isCounter ? 0x3be88c : 0xff9238);
        trailUniforms.uAlpha.value = Math.min(1, (atk > 0 ? atk : salute) * 1.45);
        axeTrailMesh.visible = true;
      } else if (trailActive) {
        trailActive = false;
        axeTrailMesh.visible = false;
        trailUniforms.uAlpha.value = 0;
      }

      // Layer 4: Look-At IK for Head & Plume Trail
      const targetHeadYaw = THREE.MathUtils.clamp(
        opts?.lookLocalYaw ?? Math.sin(elapsed * 0.45) * 0.14 * idleFade,
        -0.88,
        0.88,
      );
      const targetHeadPitch = THREE.MathUtils.clamp(opts?.lookLocalPitch ?? 0, -0.32, 0.32);
      curHeadYaw += (targetHeadYaw - curHeadYaw) * 0.16;
      curHeadPitch += (targetHeadPitch - curHeadPitch) * 0.16;
      headGroup.rotation.set(curHeadPitch - breathLift * 0.4, curHeadYaw - torsoYaw * 0.35, 0);
      plumePivot.rotation.x = -moveAmp * 0.25 + Math.sin(elapsed * 5.2) * (0.06 + moveAmp * 0.08);
      plumePivot.rotation.z = curCloakSide * 0.55;

      // Layer 5: Secondary Cloth & Mail Spring Physics (GPU vertex hem ripple + zero CPU upload)
      const targetCloakBack = 0.2 + (opts?.cloakBackLag ?? moveAmp * 0.48) + jumpY * 0.28;
      const targetCloakSide = opts?.cloakSideSwing ?? 0;
      const flutter = (opts?.cloakFlutter ?? (0.045 + moveAmp * 0.17)) + (jumpY > 0.05 ? 0.12 : 0);
      curCloakBack += (targetCloakBack - curCloakBack) * 0.18;
      curCloakSide += (targetCloakSide - curCloakSide) * 0.18;
      curMailSway += ((strideSwing * 0.12 + targetCloakSide * 0.22) - curMailSway) * 0.2;

      cloak.rotation.set(curCloakBack, 0, curCloakSide);
      hauberk.rotation.set(Math.abs(strideSwing) * 0.05, 0, curMailSway);

      cloakUniforms.uCloakTime.value = elapsed * (3.8 + moveAmp * 3.1);
      cloakUniforms.uCloakFlutter.value = flutter;

      // Dynamic Torch Flicker, Flame Lag & Warm Face Illumination
      flameUniforms.uFlameLag.value.set(
        -curCloakSide * 1.4,
        -(curCloakBack - 0.2) * 0.9,
      );
      torchLight.castShadow = opts?.torchShadowEnabled ?? false;
      const flicker =
        Math.sin(elapsed * 14.3) * 0.14 +
        Math.cos(elapsed * 8.1) * 0.09 +
        Math.sin(elapsed * 23.7) * 0.05;
      torchLight.intensity = 32 + flicker * 18;
      torchFaceLight.intensity = 13 + flicker * 7;
      torchEmberMat.emissiveIntensity = 1.85 + flicker * 0.65;

      if (hitFlash > 0) {
        forgedSteelMat.emissive.setHex(0xa82024);
        forgedSteelMat.emissiveIntensity = 0.9;
        lamellarMat.emissive.setHex(0xa82024);
        lamellarMat.emissiveIntensity = 0.65;
      } else {
        forgedSteelMat.emissive.setHex(0x000000);
        forgedSteelMat.emissiveIntensity = 0;
        lamellarMat.emissive.setHex(0x000000);
        lamellarMat.emissiveIntensity = 0;
      }
    },
  };
}
