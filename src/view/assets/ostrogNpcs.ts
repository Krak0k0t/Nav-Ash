import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';

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

/**
 * Ultra-Detailed Cinematic Ostrog Sanctuary NPCs:
 * - Vedunya Mara (witch-healer with layered embroidered robes, lunar talismans, carved staff & amber censer)
 * - Ratnik Sentinel (armored Slavic spearman with lamellar cuirass, mail skirt, spangenhelm & kite shield)
 */
export function buildOstrogNpc(
  role: 'mara' | 'ratnik',
  textures: ProceduralTextures,
): {group: THREE.Group; animate: (elapsed: number) => void} {
  const group = new THREE.Group();

  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(0.76, 18),
    new THREE.MeshBasicMaterial({
      color: 0x040605,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.025;
  group.add(contact);

  const clothPrimaryMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: role === 'mara' ? 0x5c2614 : 0x2c3430,
      map: textures.clothAlbedo,
      normalMap: textures.clothNormal,
      normalScale: new THREE.Vector2(1.45, 1.45),
      roughness: 0.9,
      sheen: 0.88,
      sheenRoughness: 0.78,
      sheenColor: new THREE.Color(role === 'mara' ? 0xe08a38 : 0x7a96ab),
      side: THREE.DoubleSide,
    }),
    {color: role === 'mara' ? 0xe07026 : 0x7090b0, power: 2.7, intensity: 0.36},
  );

  const clothTrimMat = new THREE.MeshPhysicalMaterial({
    color: role === 'mara' ? 0x241612 : 0x3b2418,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 0.88,
    sheen: 0.72,
    sheenColor: new THREE.Color(0xb88642),
  });

  const forgedIronMat = new THREE.MeshPhysicalMaterial({
    color: 0xbac2c9,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: textures.ironRoughness,
    metalness: 0.88,
    roughness: 0.36,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    clearcoatNormalMap: textures.ironNormal,
    iridescence: 0.2,
    iridescenceIOR: 1.4,
    iridescenceThicknessMinimum: 110,
    iridescenceThicknessMaximum: 310,
    anisotropy: 0.55,
  });

  const lamellarMat = new THREE.MeshPhysicalMaterial({
    color: 0xadb4ba,
    map: textures.lamellarAlbedo,
    normalMap: textures.lamellarNormal,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughnessMap: textures.ironRoughness,
    metalness: 0.84,
    roughness: 0.4,
    clearcoat: 0.38,
    clearcoatRoughness: 0.32,
  });

  const mailMat = new THREE.MeshPhysicalMaterial({
    color: 0x828990,
    map: textures.mailAlbedo,
    normalMap: textures.mailNormal,
    normalScale: new THREE.Vector2(1.55, 1.55),
    metalness: 0.82,
    roughness: 0.46,
    clearcoat: 0.2,
  });

  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: 0xbd8d3f,
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: textures.ironRoughness,
    metalness: 0.88,
    roughness: 0.34,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  });

  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0x5c442d,
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughness: 0.84,
    clearcoat: 0.2,
    clearcoatRoughness: 0.52,
  });

  const shieldMat = new THREE.MeshPhysicalMaterial({
    color: 0x6b472b,
    map: textures.shieldAlbedo,
    normalMap: textures.shieldNormal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: 0.78,
    clearcoat: 0.18,
  });

  const leatherMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b2416,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.72,
    clearcoat: 0.22,
    clearcoatRoughness: 0.46,
  });

  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xbcb096,
    map: textures.boneAlbedo,
    normalMap: textures.boneNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.64,
    clearcoat: 0.2,
  });

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0xb59173,
    roughness: 0.66,
    clearcoat: 0.08,
    sheen: 0.22,
    sheenColor: new THREE.Color(0xdfb295),
  });

  const body = new THREE.Group();
  group.add(body);
  const batch = new MaterialBatcher();

  if (role === 'ratnik') {
    // --- RATNIK SENTINEL ---
    // Boots & greaves
    for (const side of [-1, 1]) {
      batch.addAt(leatherMat, new THREE.CylinderGeometry(0.085, 0.095, 0.42, 8), side * 0.14, 0.21, 0);
      batch.addAt(leatherMat, new THREE.BoxGeometry(0.14, 0.1, 0.22), side * 0.14, 0.05, 0.04);
      batch.addAt(forgedIronMat, new THREE.CylinderGeometry(0.092, 0.082, 0.26, 8, 1, false, -0.9, 1.8), side * 0.14, 0.29, 0.01);
    }
    // Mail skirt & lamellar tunic
    batch.addAt(mailMat, new THREE.CylinderGeometry(0.24, 0.34, 0.48, 12), 0, 0.56, 0);
    batch.addAt(lamellarMat, new THREE.CylinderGeometry(0.28, 0.24, 0.58, 12), 0, 1.04, 0);
    // Belt, brass buckle & sword scabbard
    batch.addAt(leatherMat, new THREE.CylinderGeometry(0.265, 0.27, 0.09, 12), 0, 0.78, 0);
    batch.addAt(bronzeMat, new THREE.BoxGeometry(0.11, 0.095, 0.05), 0, 0.78, 0.26);
    batch.addAt(leatherMat, new THREE.CylinderGeometry(0.032, 0.022, 0.76, 6), -0.28, 0.66, -0.08, 0.42, 0, 0.18);
    batch.addAt(bronzeMat, new THREE.CylinderGeometry(0.036, 0.036, 0.08, 6), -0.34, 0.94, -0.21, 0.42, 0, 0.18);
    // Fur-lined cape & iron shoulder pauldrons
    batch.addAt(clothPrimaryMat, new THREE.CylinderGeometry(0.24, 0.44, 0.96, 10, 1, true, Math.PI * 0.62, Math.PI * 0.76), 0, 0.84, -0.06);
    for (const side of [-1, 1]) {
      batch.addAt(forgedIronMat, new THREE.SphereGeometry(0.14, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), side * 0.31, 1.24, 0, 0, 0, -side * 0.35);
      batch.addAt(clothPrimaryMat, new THREE.CylinderGeometry(0.082, 0.068, 0.48, 8), side * 0.32, 0.98, 0.04, -0.22, 0, side * 0.14);
      batch.addAt(leatherMat, new THREE.CylinderGeometry(0.072, 0.064, 0.16, 8), side * 0.34, 0.82, 0.09, -0.22, 0, side * 0.14);
    }
    // Sculpted head, beard & conical spangenhelm with nasal guard + mail aventail
    batch.addAt(skinMat, new THREE.SphereGeometry(0.155, 10, 8), 0, 1.48, 0.01);
    batch.addAt(skinMat, new THREE.ConeGeometry(0.028, 0.07, 5), 0, 1.47, 0.165, Math.PI * 0.4, 0, 0);
    batch.addAt(clothTrimMat, new THREE.ConeGeometry(0.11, 0.18, 7), 0, 1.37, 0.06, Math.PI * 0.92, 0, 0); // Beard
    batch.addAt(forgedIronMat, new THREE.ConeGeometry(0.195, 0.34, 10), 0, 1.66, 0);
    batch.addAt(bronzeMat, new THREE.TorusGeometry(0.182, 0.022, 6, 14), 0, 1.5, 0, Math.PI / 2, 0, 0);
    batch.addAt(forgedIronMat, new THREE.BoxGeometry(0.028, 0.12, 0.025), 0, 1.45, 0.175); // Nasal bar
    batch.addAt(mailMat, new THREE.CylinderGeometry(0.17, 0.22, 0.18, 10, 1, true, Math.PI * 0.45, Math.PI * 1.1), 0, 1.41, -0.02);
    // Planked round/kite shield + iron rim & boss
    batch.addAt(shieldMat, new THREE.CylinderGeometry(0.4, 0.4, 0.055, 16), -0.4, 0.94, 0.12, 0, 0, Math.PI / 2);
    batch.addAt(forgedIronMat, new THREE.TorusGeometry(0.4, 0.025, 6, 16), -0.4, 0.94, 0.12, 0, Math.PI / 2, 0);
    batch.addAt(forgedIronMat, new THREE.SphereGeometry(0.095, 9, 7), -0.43, 0.94, 0.12);
    // Boar-spear with brass collar & winged leaf blade
    batch.addAt(woodMat, new THREE.CylinderGeometry(0.026, 0.028, 2.38, 7), 0.38, 1.18, 0.1);
    batch.addAt(bronzeMat, new THREE.CylinderGeometry(0.036, 0.032, 0.1, 7), 0.38, 2.26, 0.1);
    batch.addAt(forgedIronMat, new THREE.ConeGeometry(0.062, 0.3, 6), 0.38, 2.45, 0.1, 0, 0, 0, 1.25, 1, 0.42);

    batch.flushInto(body, true, true);
    return {
      group,
      animate: (elapsed) => {
        body.position.y = Math.sin(elapsed * 2.0) * 0.022;
      },
    };
  }

  // --- VEDUNYA MARA (Witch-Healer) ---
  // Layered pleated sarafan skirt + dark undertunic + embroidered bronze hem band
  const skirtProfile = [
    new THREE.Vector2(0.45, 0.0),
    new THREE.Vector2(0.39, 0.24),
    new THREE.Vector2(0.32, 0.56),
    new THREE.Vector2(0.24, 0.84),
  ];
  batch.addAt(clothPrimaryMat, new THREE.LatheGeometry(skirtProfile, 14), 0, 0.04, 0);
  batch.addAt(clothTrimMat, new THREE.CylinderGeometry(0.42, 0.46, 0.12, 14, 1, true), 0, 0.1, 0);
  batch.addAt(bronzeMat, new THREE.TorusGeometry(0.41, 0.018, 6, 16), 0, 0.16, 0, Math.PI / 2, 0, 0);

  // Sculpted bodice + shoulder shawl capelet + fur trim collar
  batch.addAt(clothPrimaryMat, new THREE.CylinderGeometry(0.24, 0.21, 0.52, 11), 0, 1.06, 0);
  batch.addAt(clothTrimMat, new THREE.CylinderGeometry(0.2, 0.38, 0.28, 12), 0, 1.24, -0.02);
  batch.addAt(leatherMat, new THREE.TorusGeometry(0.21, 0.048, 7, 12), 0, 1.36, 0.01, Math.PI / 2, 0, 0);

  // Woven belt, herbal pouches & crescent lunar lunnitsa amulet + bone beads
  batch.addAt(leatherMat, new THREE.CylinderGeometry(0.235, 0.24, 0.085, 12), 0, 0.84, 0);
  batch.addAt(bronzeMat, new THREE.TorusGeometry(0.055, 0.015, 6, 10, Math.PI * 1.25), 0, 1.18, 0.23, 0, 0, Math.PI * 0.88);
  for (const side of [-1, 1]) {
    batch.addAt(leatherMat, new THREE.DodecahedronGeometry(0.078, 0), side * 0.25, 0.75, 0.08, 0, 0, 0, 0.9, 1.2, 0.75);
    batch.addAt(boneMat, new THREE.SphereGeometry(0.028, 6, 5), side * 0.11, 1.26, 0.21);
    batch.addAt(clothPrimaryMat, new THREE.CylinderGeometry(0.074, 0.092, 0.5, 8), side * 0.3, 1.02, 0.05, -0.25, 0, side * 0.14);
  }

  // Sculpted face, twin hair braids & layered ritual hood + bronze diadem rim
  batch.addAt(skinMat, new THREE.SphereGeometry(0.155, 10, 8), 0, 1.5, 0.02);
  batch.addAt(skinMat, new THREE.ConeGeometry(0.024, 0.06, 5), 0, 1.49, 0.17, Math.PI * 0.4, 0, 0);
  batch.addAt(clothPrimaryMat, new THREE.ConeGeometry(0.25, 0.42, 10), 0, 1.62, -0.03, -0.22, 0, 0);
  batch.addAt(bronzeMat, new THREE.TorusGeometry(0.165, 0.018, 6, 14, Math.PI * 1.15), 0, 1.54, 0.03, 0.35, 0, -Math.PI * 0.08);
  for (const side of [-1, 1]) {
    batch.addAt(clothTrimMat, new THREE.CylinderGeometry(0.035, 0.022, 0.38, 6), side * 0.15, 1.32, 0.12, 0.12, 0, side * 0.08);
  }

  // Gnarled carved staff + bound leather grip & antler fork crown
  batch.addAt(woodMat, new THREE.CylinderGeometry(0.028, 0.034, 1.88, 7), 0.37, 0.94, 0.14);
  batch.addAt(leatherMat, new THREE.CylinderGeometry(0.038, 0.038, 0.22, 7), 0.37, 1.02, 0.14);
  batch.addAt(boneMat, new THREE.TorusGeometry(0.11, 0.022, 6, 10, Math.PI * 1.35), 0.37, 1.9, 0.14, 0, 0, Math.PI * 0.82);

  batch.flushInto(body, true, true);

  // Hanging glowing ember censer crystal (separate animated sub-pivot)
  const emberCrystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x6b2808,
    emissive: 0xe87324,
    emissiveIntensity: 1.85,
    roughness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    iridescence: 0.48,
    iridescenceThicknessMinimum: 140,
    iridescenceThicknessMaximum: 380,
  });
  const censerPivot = new THREE.Group();
  censerPivot.position.set(0.37, 1.88, 0.14);
  const emberMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), emberCrystalMat);
  emberMesh.position.y = -0.02;
  censerPivot.add(emberMesh);
  body.add(censerPivot);

  return {
    group,
    animate: (elapsed) => {
      body.position.y = Math.sin(elapsed * 2.0 + 1.0) * 0.025;
      censerPivot.rotation.z = Math.sin(elapsed * 1.8) * 0.06;
      emberMesh.rotation.y = elapsed * 1.4;
      emberCrystalMat.emissiveIntensity = 1.7 + Math.sin(elapsed * 4.2) * 0.28;
    },
  };
}
