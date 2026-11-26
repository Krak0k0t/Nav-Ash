import * as THREE from 'three';
import type {EnemyArchetype} from '../../data/balance';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';
import {buildEnemyUpyr} from './enemyUpyr';
import {buildLeshyBossRig} from './bossLeshy';
import {buildOstrogNpc} from './ostrogNpcs';

export interface EnemyLocomotionView {
  strideDist: number;
  speedRatio: number;
  turnStepDir: number;
  footOffsetL: number;
  footOffsetR: number;
  useIk: boolean;
  darkShielded: boolean;
}

export interface CreatureRig {
  group: THREE.Group;
  animate: (
    elapsed: number,
    navBlend: number,
    state: 'idle' | 'chase' | 'windup' | 'recover' | 'ko',
    hitFlash: number,
    koTimer: number,
    loco?: EnemyLocomotionView,
  ) => void;
}

function addContactShadow(group: THREE.Group, radius: number): void {
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 18),
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
}

export function buildKikimoraRig(textures: ProceduralTextures): CreatureRig {
  const group = new THREE.Group();
  addContactShadow(group, 0.72);

  const shawlMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x1d261e,
      map: textures.clothAlbedo,
      normalMap: textures.clothNormal,
      roughness: 0.94,
      sheen: 0.7,
      sheenColor: new THREE.Color(0x3a6144),
      side: THREE.DoubleSide,
    }),
    {color: 0x3be88c, power: 2.8, intensity: 0.42},
  );
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0x5c6654,
    map: textures.boneAlbedo,
    normalMap: textures.boneNormal,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 0.72,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
  });
  const woodMat = new THREE.MeshPhysicalMaterial({
    map: textures.woodAlbedo,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.85,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
  });
  const orbMat = new THREE.MeshStandardMaterial({
    color: 0x093b21,
    emissive: 0x3be88c,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  const body = new THREE.Group();
  body.position.y = 0.78;
  group.add(body);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.05, 9), shawlMat);
  skirt.position.y = -0.22;
  skirt.castShadow = true;
  skirt.receiveShadow = true;

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.56, 8), shawlMat);
  torso.position.y = 0.35;
  torso.rotation.x = 0.25;
  torso.castShadow = true;
  torso.receiveShadow = true;

  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), skinMat);
  head.position.set(0, 0.76, 0.12);
  head.scale.set(0.85, 1.15, 0.95);
  head.castShadow = true;
  const kerchief = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 7), shawlMat);
  kerchief.position.set(0, 0.86, 0.04);
  kerchief.rotation.x = -0.25;
  kerchief.castShadow = true;

  const eyeGeo = new THREE.SphereGeometry(0.028, 6, 6);
  const eL = new THREE.Mesh(eyeGeo, orbMat);
  eL.position.set(-0.06, 0.77, 0.28);
  const eR = new THREE.Mesh(eyeGeo, orbMat);
  eR.position.set(0.06, 0.77, 0.28);

  const staffArm = new THREE.Group();
  staffArm.position.set(0.32, 0.48, 0.08);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 1.85, 6), woodMat);
  staff.position.y = 0.1;
  staff.castShadow = true;
  const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), orbMat);
  staffOrb.position.y = 1.06;
  staffArm.add(staff, staffOrb);

  body.add(skirt, torso, head, kerchief, eL, eR, staffArm);

  return {
    group,
    animate: (elapsed, navBlend, state, hitFlash, koTimer, loco) => {
      if (state === 'ko') {
        const f = Math.min(1, Math.max(0, 1 - koTimer / 0.42));
        group.rotation.x = f * 1.45;
        group.position.y = -f * 0.25;
        return;
      }
      group.rotation.x = 0;
      const stride = loco ? loco.strideDist * 3.1 : 0;
      const spd = loco ? Math.min(1, loco.speedRatio) : 0;
      const turnDir = loco ? loco.turnStepDir : 0;
      const ikPelvis = loco && loco.useIk ? Math.min(0.14, Math.max(-0.14, (loco.footOffsetL + loco.footOffsetR) * 0.35)) : 0;
      const sway = Math.sin(elapsed * 3.1);
      body.position.y = 0.78 + sway * 0.04 + Math.abs(Math.sin(stride)) * 0.05 * spd + ikPelvis;
      body.rotation.x = spd * 0.14;
      body.rotation.z = turnDir * 0.2 + Math.sin(stride) * 0.08 * spd;
      skirt.rotation.x = -spd * 0.18 + Math.sin(stride) * 0.12 * spd;
      staffArm.rotation.x = state === 'windup' ? -0.95 : -0.18 + sway * 0.1 - Math.sin(stride) * 0.25 * spd;
      orbMat.emissiveIntensity = (state === 'windup' ? 2.2 : 1.25) + navBlend * 0.4;
      if (hitFlash > 0) {
        shawlMat.emissive.setHex(0xffffff);
        shawlMat.emissiveIntensity = 0.5;
      } else {
        shawlMat.emissive.setHex(0x000000);
        shawlMat.emissiveIntensity = 0;
      }
    },
  };
}

export function buildVolkolakRig(textures: ProceduralTextures): CreatureRig {
  const group = new THREE.Group();
  addContactShadow(group, 1.15);

  const furMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x26211e,
      map: textures.clothAlbedo,
      normalMap: textures.clothNormal,
      roughness: 0.94,
      sheen: 0.85,
      sheenColor: new THREE.Color(0x5b6b5c),
    }),
    {color: 0x3be88c, power: 2.4, intensity: 0.52},
  );
  const boneMat = new THREE.MeshPhysicalMaterial({
    color: 0xa69b84,
    map: textures.boneAlbedo,
    normalMap: textures.boneNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.68,
    clearcoat: 0.22,
    clearcoatRoughness: 0.38,
  });
  const ironMat = new THREE.MeshPhysicalMaterial({
    map: textures.ironAlbedo,
    normalMap: textures.ironNormal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: textures.ironRoughness,
    metalness: 0.82,
    roughness: 0.5,
    clearcoat: 0.28,
    clearcoatRoughness: 0.36,
    clearcoatNormalMap: textures.ironNormal,
    iridescence: 0.2,
    anisotropy: 0.42,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x164a2d,
    emissive: 0x3be88c,
    emissiveIntensity: 1.5,
  });

  const body = new THREE.Group();
  body.position.y = 1.05;
  group.add(body);

  // Articulated hip + knee leg pivots for Foot IK & Root-Motion stride
  const vLegs: THREE.Group[] = [];
  const vShins: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.34, -0.08, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.145, 0.5, 7), furMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    const shinPivot = new THREE.Group();
    shinPivot.position.y = -0.48;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.52, 7), furMat);
    shin.position.y = -0.25;
    shin.castShadow = true;
    shinPivot.add(shin);
    hip.add(thigh, shinPivot);
    body.add(hip);
    vLegs.push(hip);
    vShins.push(shinPivot);
  }

  const chest = new THREE.Mesh(new THREE.DodecahedronGeometry(0.64, 0), furMat);
  chest.scale.set(1.15, 1.1, 0.95);
  chest.position.y = 0.42;
  chest.castShadow = true;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 12), ironMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.82;
  collar.castShadow = true;
  body.add(chest, collar);

  // Darkness Shield Ward Bubble (visible while Cursed Totems remain unburned!)
  const darkShieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.38, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x3b0f54,
      transparent: true,
      opacity: 0.34,
      wireframe: true,
      depthWrite: false,
    }),
  );
  darkShieldMesh.position.y = 1.1;
  darkShieldMesh.visible = false;
  group.add(darkShieldMesh);

  // Massive wolf-skull head & curved horns
  const head = new THREE.Group();
  head.position.set(0, 0.98, 0.35);
  const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), furMat);
  skull.scale.set(0.95, 0.95, 1.35);
  skull.castShadow = true;
  const jaws = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 5), boneMat);
  jaws.rotation.x = Math.PI * 0.55;
  jaws.position.set(0, -0.05, 0.34);
  jaws.castShadow = true;
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 6), boneMat);
    horn.position.set(side * 0.24, 0.26, -0.06);
    horn.rotation.set(-0.3, 0, -side * 0.55);
    horn.castShadow = true;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eye.position.set(side * 0.11, 0.08, 0.26);
    head.add(horn, eye);
  }
  head.add(skull, jaws);
  body.add(head);

  const rArm = new THREE.Group();
  rArm.position.set(0.62, 0.58, 0.05);
  const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.95, 7), furMat);
  armMesh.position.y = -0.45;
  armMesh.castShadow = true;
  const club = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.05, 1.2, 6), boneMat);
  club.position.set(0, -0.92, 0.35);
  club.rotation.x = Math.PI * 0.45;
  club.castShadow = true;
  rArm.add(armMesh, club);

  const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.95, 7), furMat);
  lArm.position.set(-0.62, 0.15, 0.12);
  lArm.rotation.x = -0.35;
  lArm.castShadow = true;
  body.add(rArm, lArm);

  return {
    group,
    animate: (elapsed, navBlend, state, hitFlash, koTimer, loco) => {
      if (state === 'ko') {
        const f = Math.min(1, Math.max(0, 1 - koTimer / 0.42));
        group.rotation.x = -f * 1.45;
        group.position.y = -f * 0.3;
        darkShieldMesh.visible = false;
        return;
      }
      group.rotation.x = 0;
      const pulse = Math.sin(elapsed * 4.0);
      const stride = loco ? loco.strideDist * 2.2 : 0;
      const spd = loco ? Math.min(1, loco.speedRatio) : 0;
      const turnDir = loco ? loco.turnStepDir : 0;
      const swingL = Math.sin(stride) * 0.54 * spd;
      const swingR = -swingL;

      if (loco && loco.useIk) {
        const pelvDrop = Math.min(0.18, Math.max(-0.18, Math.min(loco.footOffsetL, loco.footOffsetR) * 0.6));
        const ikL = Math.max(0, loco.footOffsetL) * 1.05;
        const ikR = Math.max(0, loco.footOffsetR) * 1.05;
        body.position.y = 1.05 + pulse * 0.04 + pelvDrop + Math.abs(Math.sin(stride)) * 0.06 * spd;
        vLegs[0].rotation.x = swingL - ikL * 0.55;
        vLegs[1].rotation.x = swingR - ikR * 0.55;
        vLegs[0].rotation.z = turnDir * 0.14;
        vLegs[1].rotation.z = -turnDir * 0.11;
        vShins[0].rotation.x = Math.max(0, -swingL) * 0.45 + ikL * 0.72;
        vShins[1].rotation.x = Math.max(0, -swingR) * 0.45 + ikR * 0.72;
      } else {
        body.position.y = 1.05 + pulse * 0.05;
        vLegs[0].rotation.x = swingL;
        vLegs[1].rotation.x = swingR;
        vLegs[0].rotation.z = 0;
        vLegs[1].rotation.z = 0;
        vShins[0].rotation.x = 0;
        vShins[1].rotation.x = 0;
      }
      body.rotation.z = turnDir * 0.16 + Math.sin(stride) * 0.04 * spd;

      darkShieldMesh.visible = Boolean(loco?.darkShielded);
      if (darkShieldMesh.visible) {
        darkShieldMesh.rotation.y = elapsed * 1.4;
      }

      rArm.rotation.x = state === 'windup' ? -1.85 : -0.3 + pulse * 0.15 - swingR * 0.35;
      eyeMat.emissiveIntensity = 1.35 + navBlend * 0.45;
      if (hitFlash > 0) {
        furMat.emissive.setHex(loco?.darkShielded ? 0x6b28a8 : 0xffffff);
        furMat.emissiveIntensity = 0.65;
      } else {
        furMat.emissive.setHex(0x000000);
        furMat.emissiveIntensity = 0;
      }
    },
  };
}

export {buildLeshyBossRig};

export function buildEnemyByArchetype(
  archetype: EnemyArchetype,
  textures: ProceduralTextures,
): CreatureRig {
  if (archetype === 'kikimora') return buildKikimoraRig(textures);
  if (archetype === 'volkolak') return buildVolkolakRig(textures);
  if (archetype === 'leshy') return buildLeshyBossRig(textures);

  const upyr = buildEnemyUpyr(textures);
  return {
    group: upyr.group,
    animate: (elapsed, navBlend, state, hitFlash, koTimer, loco) => {
      if (state === 'ko') {
        const f = Math.min(1, Math.max(0, 1 - koTimer / 0.42));
        upyr.group.rotation.x = f * 1.45;
        upyr.group.position.y = -f * 0.25;
        return;
      }
      upyr.group.rotation.x = 0;
      upyr.animate(elapsed, navBlend + (state === 'windup' ? 0.8 : 0), loco);
      if (hitFlash > 0) {
        upyr.group.scale.setScalar(1.08);
      } else {
        upyr.group.scale.setScalar(1.0);
      }
    },
  };
}

export {buildOstrogNpc};
