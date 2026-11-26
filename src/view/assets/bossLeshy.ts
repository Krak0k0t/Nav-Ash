import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';
import type {CreatureRig} from './slavicCreatures';

function mergePartList(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = parts.map((g) => {
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    if (!nonIdx.attributes.normal) nonIdx.computeVertexNormals();
    if (!nonIdx.attributes.uv) {
      const cnt = nonIdx.attributes.position.count;
      nonIdx.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    }
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

function makeCurvedBoughGeo(
  pts: [number, number, number][],
  radii: number[],
  radialSegments = 7,
  tubularSegments = 12,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  const ringStride = radialSegments + 1;

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, center);
    const rIdx = t * (radii.length - 1);
    const r0 = radii[Math.floor(rIdx)];
    const r1 = radii[Math.min(radii.length - 1, Math.ceil(rIdx))];
    const r = THREE.MathUtils.lerp(r0, r1, rIdx - Math.floor(rIdx));
    for (let j = 0; j < ringStride; j++) {
      const idx = i * ringStride + j;
      if (idx >= pos.count) continue;
      vertex.fromBufferAttribute(pos, idx);
      vertex.sub(center).multiplyScalar(r).add(center);
      pos.setXYZ(idx, vertex.x, vertex.y, vertex.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Ultra-Detailed Cinematic Boss: Хранитель Леший (Leshy Guardian, ~3.45m tall)
 * Built with MeshPhysicalMaterial (damp sap clearcoat, velvet moss sheen, iridescent amber-Nav resin,
 * micro-scratched iron/bone/bark normal maps) and batched geometry for low draw calls + full shadows.
 */
export function buildLeshyBossRig(textures: ProceduralTextures): CreatureRig {
  const group = new THREE.Group();

  // Soft ground contact occlusion disc (does not cast shadow)
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 22),
    new THREE.MeshBasicMaterial({
      color: 0x030604,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.025;
  group.add(contact);

  // Complex PBR MeshPhysicalMaterials
  const bogBarkMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x262b1f,
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.75, 1.75),
      bumpMap: textures.woodBump,
      bumpScale: 0.045,
      roughness: 0.86,
      metalness: 0.04,
      clearcoat: 0.28,
      clearcoatRoughness: 0.48,
      clearcoatNormalMap: textures.woodNormal,
      clearcoatNormalScale: new THREE.Vector2(0.7, 0.7),
      sheen: 0.52,
      sheenRoughness: 0.88,
      sheenColor: new THREE.Color(0x3a6439),
    }),
    {color: 0x3be88c, power: 2.3, intensity: 0.56},
  );

  const bleachedSkullMat = new THREE.MeshPhysicalMaterial({
    color: 0xa89b82,
    map: textures.boneAlbedo,
    normalMap: textures.boneNormal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: 0.64,
    metalness: 0.05,
    clearcoat: 0.24,
    clearcoatRoughness: 0.36,
    clearcoatNormalMap: textures.boneNormal,
    clearcoatNormalScale: new THREE.Vector2(0.55, 0.55),
    sheen: 0.18,
    sheenColor: new THREE.Color(0xd2c4a6),
  });

  const mossMantleMat = new THREE.MeshPhysicalMaterial({
    color: 0x223821,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughness: 0.94,
    metalness: 0.0,
    sheen: 0.92,
    sheenRoughness: 0.84,
    sheenColor: new THREE.Color(0x568d4b),
    side: THREE.DoubleSide,
  });

  const amberSapMat = new THREE.MeshPhysicalMaterial({
    color: 0x9b5114,
    emissive: 0x291102,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 0.92,
    clearcoatRoughness: 0.12,
    iridescence: 0.48,
    iridescenceIOR: 1.38,
    normalMap: textures.stoneNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
  });

  const runeIronMat = new THREE.MeshPhysicalMaterial({
    color: 0x2c3033,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: textures.ironRoughness,
    roughness: 0.52,
    metalness: 0.86,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    clearcoatNormalMap: textures.ironNormal,
    iridescence: 0.22,
    anisotropy: 0.45,
  });

  const navHeartMat = new THREE.MeshPhysicalMaterial({
    color: 0x094726,
    emissive: 0x2ee68a,
    emissiveIntensity: 1.65,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
    iridescence: 0.65,
    iridescenceIOR: 1.45,
  });

  const body = new THREE.Group();
  body.position.y = 1.48;
  group.add(body);

  // --- 1. Articulated Root-Buttressed Legs (Hip + Knee pivots for Foot IK) ---
  const lLegs: THREE.Group[] = [];
  const lShins: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.56, -0.04, 0);

    const thighBatch = new MaterialBatcher();
    thighBatch.addAt(bogBarkMat, new THREE.CylinderGeometry(0.29, 0.24, 0.76, 9), 0, -0.36, 0);
    // Twisted outer bark tendril & knee knot
    thighBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 0.2, 0.0, 0.14],
          [side * 0.27, -0.35, 0.19],
          [side * 0.16, -0.7, 0.12],
        ],
        [0.09, 0.11, 0.07],
        6,
        8,
      ),
    );
    thighBatch.addAt(mossMantleMat, new THREE.DodecahedronGeometry(0.24, 0), side * 0.14, -0.15, -0.12, 0, 0, 0, 1.1, 1.3, 0.9);
    thighBatch.addAt(bleachedSkullMat, new THREE.DodecahedronGeometry(0.14, 0), 0, -0.68, 0.22, 0.2, 0, 0, 1.1, 0.85, 0.8);
    thighBatch.flushInto(hip, true, true);

    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.72;
    const shinBatch = new MaterialBatcher();
    shinBatch.addAt(bogBarkMat, new THREE.CylinderGeometry(0.22, 0.34, 0.78, 9), 0, -0.36, 0);
    // Flared anchor roots gripping the swamp floor
    for (const [rx, rz] of [
      [-0.22, 0.28],
      [0.22, 0.28],
      [0, -0.28],
      [side * 0.32, 0.02],
    ]) {
      shinBatch.add(
        bogBarkMat,
        makeCurvedBoughGeo(
          [
            [rx * 0.35, -0.35, rz * 0.35],
            [rx * 0.85, -0.62, rz * 0.85],
            [rx * 1.45, -0.75, rz * 1.45],
          ],
          [0.11, 0.08, 0.035],
          6,
          7,
        ),
      );
    }
    // Iron-shackle fetter bound around ancient shin bark
    shinBatch.addAt(runeIronMat, new THREE.TorusGeometry(0.27, 0.04, 6, 12), 0, -0.28, 0, Math.PI / 2, 0, 0);
    shinBatch.flushInto(shinPivot, true, true);

    hip.add(shinPivot);
    body.add(hip);
    lLegs.push(hip);
    lShins.push(shinPivot);
  }

  // --- 2. Hollow Ribbed Oak Torso, Exposed Spine & Suspended Nav Heart ---
  const torsoBatch = new MaterialBatcher();
  // Pelvic root girdle & dark hollow core backwall
  torsoBatch.addAt(bogBarkMat, new THREE.CylinderGeometry(0.68, 0.56, 0.55, 10), 0, 0.05, -0.04);
  torsoBatch.addAt(bogBarkMat, new THREE.CylinderGeometry(0.68, 0.54, 1.35, 10, 1, false, Math.PI * 0.45, Math.PI * 1.1), 0, 0.88, -0.08);

  // Curved rib-boughs framing an open hollow chest cavity
  for (const side of [-1, 1]) {
    for (let r = 0; r < 4; r++) {
      const ry = 0.36 + r * 0.29;
      const spread = 0.58 + (r === 2 ? 0.18 : r * 0.04);
      torsoBatch.add(
        bogBarkMat,
        makeCurvedBoughGeo(
          [
            [side * 0.2, ry + 0.05, -0.46],
            [side * spread, ry + 0.08, -0.05],
            [side * (spread * 0.72), ry - 0.04, 0.45],
            [side * 0.24, ry - 0.1, 0.56],
          ],
          [0.11, 0.13, 0.09, 0.045],
          6,
          10,
        ),
      );
    }
    // Massive gnarled shoulder pauldron canopies + shelf bracket fungi
    torsoBatch.addAt(bogBarkMat, new THREE.DodecahedronGeometry(0.46, 0), side * 0.82, 1.36, 0.0, 0.15, 0, side * 0.28, 1.18, 0.92, 1.05);
    torsoBatch.addAt(mossMantleMat, new THREE.ConeGeometry(0.58, 0.42, 8), side * 0.86, 1.56, -0.04, 0.12, 0, side * -0.22);
    torsoBatch.addAt(amberSapMat, new THREE.CylinderGeometry(0.24, 0.08, 0.07, 8), side * 0.96, 1.18, 0.24, 0.15, 0, side * 0.32);
    torsoBatch.addAt(amberSapMat, new THREE.CylinderGeometry(0.18, 0.06, 0.06, 7), side * 0.82, 0.92, 0.36, 0.12, 0, side * 0.2);

    // Humpback jagged bark ridge & bone trophy totems hanging from hip
    torsoBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 0.34, 0.95, -0.45],
          [side * 0.52, 1.58, -0.58],
          [side * 0.45, 2.08, -0.42],
        ],
        [0.14, 0.1, 0.035],
        6,
        9,
      ),
    );
    torsoBatch.addAt(bleachedSkullMat, new THREE.DodecahedronGeometry(0.16, 0), side * 0.54, -0.08, 0.32);
  }

  // Exposed spinal vertebrae along back + hanging forest moss cloak
  for (let v = 0; v < 6; v++) {
    torsoBatch.addAt(
      bleachedSkullMat,
      new THREE.CylinderGeometry(0.11, 0.13, 0.18, 7),
      0,
      0.24 + v * 0.24,
      -0.52 - Math.sin(v * 0.5) * 0.06,
      0.22,
    );
  }
  torsoBatch.addAt(mossMantleMat, new THREE.CylinderGeometry(0.55, 0.92, 1.45, 9, 1, true, Math.PI * 0.55, Math.PI * 0.9), 0, 0.62, -0.28);
  torsoBatch.addAt(runeIronMat, new THREE.TorusGeometry(0.38, 0.042, 6, 14), 0, 0.72, 0.46, 0.12, 0, 0);
  torsoBatch.flushInto(body, true, true);

  // Pulsing Heart of Nav suspended inside open ribcage (animated separately)
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0, 0.74, 0.18);
  const heartCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.31, 1), navHeartMat);
  heartCore.scale.set(0.9, 1.25, 0.85);
  heartCore.castShadow = true;
  const heartAmberCage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.39, 0), amberSapMat);
  heartAmberCage.material = amberSapMat.clone();
  (heartAmberCage.material as THREE.MeshPhysicalMaterial).wireframe = true;
  heartGroup.add(heartCore, heartAmberCage);
  body.add(heartGroup);

  // --- 3. Stag Skull & 12-Tine Canopy Antlers ---
  const head = new THREE.Group();
  head.position.set(0, 1.88, 0.24);
  const headBatch = new MaterialBatcher();
  headBatch.addAt(bleachedSkullMat, new THREE.DodecahedronGeometry(0.42, 1), 0, 0.02, 0.02, 0, 0, 0, 0.88, 0.96, 1.25);
  // Elongated stag snout, cheekbones, nasal ridge & jagged fang teeth
  headBatch.addAt(bleachedSkullMat, new THREE.ConeGeometry(0.24, 0.68, 6), 0, -0.14, 0.48, Math.PI * 0.58, 0, 0);
  headBatch.addAt(bleachedSkullMat, new THREE.BoxGeometry(0.56, 0.18, 0.28), 0, -0.02, 0.2);
  for (const side of [-1, 1]) {
    headBatch.addAt(bleachedSkullMat, new THREE.ConeGeometry(0.036, 0.14, 4), side * 0.09, -0.26, 0.55, Math.PI, 0, 0);
    headBatch.addAt(bleachedSkullMat, new THREE.ConeGeometry(0.03, 0.11, 4), side * 0.14, -0.23, 0.42, Math.PI, 0, 0);

    // Sweeping Primary Curved Antler Beam
    headBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 0.22, 0.26, -0.05],
          [side * 0.54, 0.72, -0.1],
          [side * 0.96, 1.18, -0.02],
          [side * 1.18, 1.66, 0.16],
        ],
        [0.12, 0.095, 0.068, 0.03],
        7,
        14,
      ),
    );
    // Forward Brow Tine + Inner Crown Tine + Outer Canopy Fork
    headBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 0.46, 0.62, -0.08],
          [side * 0.58, 0.92, 0.28],
          [side * 0.5, 1.24, 0.42],
        ],
        [0.065, 0.045, 0.018],
        5,
        8,
      ),
    );
    headBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 0.84, 1.04, -0.05],
          [side * 0.68, 1.44, -0.18],
          [side * 0.58, 1.76, -0.12],
        ],
        [0.055, 0.038, 0.015],
        5,
        8,
      ),
    );
    headBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [side * 1.05, 1.36, 0.06],
          [side * 1.32, 1.48, 0.02],
          [side * 1.45, 1.72, 0.1],
        ],
        [0.05, 0.034, 0.014],
        5,
        7,
      ),
    );
    // Hanging moss drapes & bone fetish dangling from antler crown
    headBatch.addAt(mossMantleMat, new THREE.ConeGeometry(0.11, 0.48, 5), side * 0.78, 0.84, 0.02, Math.PI, 0, 0);
    headBatch.addAt(amberSapMat, new THREE.OctahedronGeometry(0.08, 0), side * 0.96, 1.02, 0.12);
  }
  headBatch.flushInto(head, true, true);

  // Glowing emerald-Nav eye sockets
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), navHeartMat);
    eye.position.set(side * 0.16, 0.03, 0.43);
    head.add(eye);
  }
  body.add(head);

  // --- 4. Long Articulated Bough Arms with Elbows, Iron Shackles & 3 Bone Claws ---
  const makeBoughArm = (side: number) => {
    const piv = new THREE.Group();
    piv.position.set(side * 0.98, 1.32, 0.06);

    const upperBatch = new MaterialBatcher();
    upperBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [0, 0, 0],
          [side * 0.14, -0.38, -0.06],
          [side * 0.08, -0.78, 0.05],
        ],
        [0.21, 0.16, 0.15],
        7,
        9,
      ),
    );
    upperBatch.addAt(mossMantleMat, new THREE.DodecahedronGeometry(0.19, 0), side * 0.12, -0.35, -0.08);
    upperBatch.addAt(runeIronMat, new THREE.TorusGeometry(0.16, 0.035, 6, 12), side * 0.08, -0.68, 0.04, Math.PI / 2, 0, 0);
    upperBatch.flushInto(piv, true, true);

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.08, -0.78, 0.05);
    const lowerBatch = new MaterialBatcher();
    lowerBatch.add(
      bogBarkMat,
      makeCurvedBoughGeo(
        [
          [0, 0, 0],
          [side * 0.04, -0.44, 0.14],
          [0, -0.88, 0.24],
        ],
        [0.16, 0.14, 0.18],
        7,
        9,
      ),
    );
    lowerBatch.addAt(amberSapMat, new THREE.CylinderGeometry(0.12, 0.04, 0.06, 6), side * 0.12, -0.32, 0.12, 0.2, 0, side * 0.4);
    // 3 Razor Bone Talons per gauntlet fist
    for (const cx of [-0.11, 0, 0.11]) {
      lowerBatch.add(
        bleachedSkullMat,
        makeCurvedBoughGeo(
          [
            [cx, -0.86, 0.24],
            [cx * 1.15, -1.16, 0.42],
            [cx * 1.05, -1.36, 0.62],
          ],
          [0.058, 0.038, 0.01],
          5,
          6,
        ),
      );
    }
    lowerBatch.flushInto(elbow, true, true);
    piv.add(elbow);
    return {piv, elbow};
  };

  const armL = makeBoughArm(-1);
  const armR = makeBoughArm(1);
  body.add(armL.piv, armR.piv);

  return {
    group,
    animate: (elapsed, navBlend, state, hitFlash, koTimer, loco) => {
      if (state === 'ko') {
        const f = Math.min(1, Math.max(0, 1 - koTimer / 0.42));
        group.rotation.x = f * 1.48;
        group.position.y = -f * 0.52;
        return;
      }
      group.rotation.x = 0;
      const sway = Math.sin(elapsed * 2.1);
      const stride = loco ? loco.strideDist * 1.65 : 0;
      const spd = loco ? Math.min(1, loco.speedRatio) : 0;
      const turnDir = loco ? loco.turnStepDir : 0;
      const swingL = Math.sin(stride) * 0.42 * spd;
      const swingR = -swingL;

      if (loco && loco.useIk) {
        const pelvDrop = Math.min(0.2, Math.max(-0.2, Math.min(loco.footOffsetL, loco.footOffsetR) * 0.6));
        const ikL = Math.max(0, loco.footOffsetL) * 0.85;
        const ikR = Math.max(0, loco.footOffsetR) * 0.85;
        body.position.y = 1.48 + sway * 0.05 + pelvDrop + Math.abs(Math.sin(stride)) * 0.07 * spd;
        lLegs[0].rotation.x = swingL - ikL * 0.5;
        lLegs[1].rotation.x = swingR - ikR * 0.5;
        lLegs[0].rotation.z = turnDir * 0.12;
        lLegs[1].rotation.z = -turnDir * 0.1;
        lShins[0].rotation.x = Math.max(0, -swingL) * 0.38 + ikL * 0.65;
        lShins[1].rotation.x = Math.max(0, -swingR) * 0.38 + ikR * 0.65;
      } else {
        body.position.y = 1.48 + sway * 0.06;
        lLegs[0].rotation.x = swingL;
        lLegs[1].rotation.x = swingR;
        lLegs[0].rotation.z = 0;
        lLegs[1].rotation.z = 0;
        lShins[0].rotation.x = 0;
        lShins[1].rotation.x = 0;
      }
      body.rotation.z = turnDir * 0.13 + Math.sin(stride) * 0.03 * spd;
      head.rotation.y = Math.sin(elapsed * 1.35) * 0.08;
      head.rotation.x = state === 'windup' ? -0.22 : 0.08 + sway * 0.04;

      const isWindup = state === 'windup';
      armL.piv.rotation.x = isWindup ? -1.62 : -0.24 + sway * 0.14 - swingL * 0.4;
      armR.piv.rotation.x = isWindup ? -1.62 : -0.24 - sway * 0.14 - swingR * 0.4;
      armL.elbow.rotation.x = isWindup ? -0.35 : -0.32 + sway * 0.08;
      armR.elbow.rotation.x = isWindup ? -0.35 : -0.32 - sway * 0.08;

      heartGroup.rotation.y = elapsed * 1.4;
      heartGroup.scale.setScalar(1.0 + Math.sin(elapsed * 4.5) * 0.08 + (isWindup ? 0.16 : 0));
      navHeartMat.emissiveIntensity = (isWindup ? 2.55 : 1.55) + navBlend * 0.55;

      if (hitFlash > 0) {
        bogBarkMat.emissive.setHex(0xffffff);
        bogBarkMat.emissiveIntensity = 0.52;
      } else {
        bogBarkMat.emissive.setHex(0x000000);
        bogBarkMat.emissiveIntensity = 0;
      }
    },
  };
}
