import * as THREE from 'three';
import {applyFresnelRim} from '../materials/fresnelMaterial';
import type {ProceduralTextures} from '../textures';

export interface UpyrLocomotionOpts {
  strideDist: number;
  speedRatio: number;
  turnStepDir: number;
  footOffsetL: number;
  footOffsetR: number;
  useIk: boolean;
}

export interface UpyrRig {
  group: THREE.Group;
  animate: (elapsed: number, navBlend: number, loco?: UpyrLocomotionOpts) => void;
}

function makeCurvedTube(
  points: [number, number, number][],
  radiusStart: number,
  radiusEnd: number,
  tubularSegments = 10,
  radialSegments = 6,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1, radialSegments, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ringIdx = Math.floor(i / (radialSegments + 1));
    const t = Math.min(1, ringIdx / tubularSegments);
    curve.getPointAt(t, c);
    v.fromBufferAttribute(pos, i).sub(c);
    const r = THREE.MathUtils.lerp(radiusStart, radiusEnd, t);
    v.multiplyScalar(r).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildEnemyUpyr(textures: ProceduralTextures): UpyrRig {
  const group = new THREE.Group();

  const barkFleshMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x2a3026,
      map: textures.woodAlbedo,
      normalMap: textures.woodNormal,
      normalScale: new THREE.Vector2(1.55, 1.55),
      bumpMap: textures.woodBump,
      bumpScale: 0.035,
      roughness: 0.86,
      metalness: 0.04,
      clearcoat: 0.24,
      clearcoatRoughness: 0.48,
      sheen: 0.45,
      sheenColor: new THREE.Color(0x36593a),
    }),
    {color: 0x3be88c, power: 2.5, intensity: 0.56},
  );
  const darkBoneMat = applyFresnelRim(
    new THREE.MeshPhysicalMaterial({
      color: 0x998e79,
      map: textures.boneAlbedo,
      normalMap: textures.boneNormal,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughness: 0.68,
      metalness: 0.04,
      clearcoat: 0.22,
      clearcoatRoughness: 0.38,
    }),
    {color: 0x3be88c, power: 2.9, intensity: 0.36},
  );
  const shroudMat = new THREE.MeshPhysicalMaterial({
    color: 0x111713,
    map: textures.clothAlbedo,
    normalMap: textures.clothNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.95,
    metalness: 0.0,
    sheen: 0.72,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0x284735),
    side: THREE.DoubleSide,
  });
  const navGlowMat = new THREE.MeshPhysicalMaterial({
    color: 0x083b21,
    emissive: 0x26d97c,
    emissiveIntensity: 1.45,
    roughness: 0.2,
    metalness: 0.06,
    clearcoat: 0.85,
    iridescence: 0.45,
  });
  const clawMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e2520,
    normalMap: textures.boneNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    emissive: 0x136e3e,
    emissiveIntensity: 0.42,
    roughness: 0.38,
    metalness: 0.22,
    clearcoat: 0.5,
    iridescence: 0.32,
  });

  // Contact shadow
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(0.82, 22),
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

  // Gnarled articulated digitigrade legs with knee roots & Foot IK pivots
  const legPivots: THREE.Group[] = [];
  const lowerLegPivots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const legHip = new THREE.Group();
    legHip.position.set(side * 0.19, 0.88, -0.02);

    const thighGeo = makeCurvedTube(
      [
        [0, 0, 0],
        [side * 0.06, -0.34, -0.13],
      ],
      0.12,
      0.088,
      7,
      6,
    );
    const thigh = new THREE.Mesh(thighGeo, barkFleshMat);
    thigh.castShadow = true;

    const kneePivot = new THREE.Group();
    kneePivot.position.set(side * 0.06, -0.34, -0.13);
    const kneeKnot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.095, 0), barkFleshMat);

    const shinGeo = makeCurvedTube(
      [
        [0, 0, 0],
        [-side * 0.02, -0.28, 0.23],
        [0, -0.54, 0.29],
      ],
      0.086,
      0.064,
      8,
      6,
    );
    const shin = new THREE.Mesh(shinGeo, barkFleshMat);
    shin.castShadow = true;
    kneePivot.add(kneeKnot, shin);

    legHip.add(thigh, kneePivot);
    group.add(legHip);
    legPivots.push(legHip);
    lowerLegPivots.push(kneePivot);
  }

  // Hunched sculpted torso + exposed ribcage arches + pulsing Nav heart + multi-strip shroud
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 0.84, 0.06);
  bodyPivot.rotation.x = 0.46;
  group.add(bodyPivot);

  const torsoProfile = [
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.24, 0.22),
    new THREE.Vector2(0.36, 0.55),
    new THREE.Vector2(0.42, 0.78),
    new THREE.Vector2(0.26, 0.94),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 10), barkFleshMat);
  torso.scale.set(1.06, 1.0, 0.82);
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Exposed curved bone ribs framing the glowing Nav chest fissure
  for (let r = 0; r < 3; r++) {
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(
        makeCurvedTube(
          [
            [side * 0.08, 0.44 + r * 0.11, 0.28],
            [side * 0.34, 0.46 + r * 0.11, 0.14],
            [side * 0.2, 0.49 + r * 0.11, -0.22],
          ],
          0.032,
          0.022,
          7,
          5,
        ),
        darkBoneMat,
      );
      rib.castShadow = true;
      bodyPivot.add(rib);
    }
  }

  // Tattered multi-panel bog shroud strips
  const ragCore = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.78, 9, 1, true), shroudMat);
  ragCore.position.y = -0.08;
  ragCore.castShadow = true;
  bodyPivot.add(ragCore);
  for (let s = 0; s < 6; s++) {
    const ang = (s / 6) * Math.PI * 2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.74, 0.02), shroudMat);
    strip.position.set(Math.sin(ang) * 0.3, -0.16, Math.cos(ang) * 0.26);
    strip.rotation.set(Math.cos(ang) * 0.28, ang, Math.sin(ang) * 0.22);
    strip.castShadow = true;
    bodyPivot.add(strip);
  }

  // Pulsing emerald Nav core heart
  const coreFissure = new THREE.Mesh(new THREE.OctahedronGeometry(0.125, 0), navGlowMat);
  coreFissure.scale.set(0.65, 1.45, 0.5);
  coreFissure.position.set(0, 0.55, 0.24);
  bodyPivot.add(coreFissure);

  // Jagged back-twigs & spine thorns
  for (let i = 0; i < 6; i++) {
    const sideSign = i % 2 === 0 ? -1 : 1;
    const twig = new THREE.Mesh(
      makeCurvedTube(
        [
          [sideSign * 0.06, 0.24 + i * 0.12, -0.22],
          [sideSign * 0.24, 0.42 + i * 0.13, -0.44],
          [sideSign * 0.3, 0.66 + i * 0.12, -0.55],
        ],
        0.048,
        0.011,
        7,
        5,
      ),
      barkFleshMat,
    );
    twig.castShadow = true;
    bodyPivot.add(twig);
  }

  // Hollowed deer/wood skull head + cheek bones + recessed eye sockets + branching antlers
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.96, 0.22);
  headGroup.rotation.x = -0.18;

  const cranium = new THREE.Mesh(new THREE.DodecahedronGeometry(0.215, 0), darkBoneMat);
  cranium.scale.set(0.92, 1.06, 1.26);
  cranium.castShadow = true;
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), darkBoneMat);
  snout.rotation.x = Math.PI * 0.62;
  snout.position.set(0, -0.09, 0.22);
  snout.castShadow = true;
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 5), darkBoneMat);
  jaw.rotation.x = Math.PI * 0.68;
  jaw.position.set(0, -0.16, 0.15);
  jaw.castShadow = true;

  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.085, 0.15), shroudMat);
  brow.position.set(0, 0.04, 0.18);
  brow.castShadow = true;
  const eyeGeo = new THREE.SphereGeometry(0.032, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, navGlowMat);
  eyeL.position.set(-0.07, -0.015, 0.225);
  const eyeR = new THREE.Mesh(eyeGeo, navGlowMat);
  eyeR.position.set(0.07, -0.015, 0.225);
  headGroup.add(cranium, snout, jaw, brow, eyeL, eyeR);

  // Branching stag-antler horns
  for (const side of [-1, 1]) {
    const mainBeam = new THREE.Mesh(
      makeCurvedTube(
        [
          [side * 0.1, 0.14, 0.0],
          [side * 0.26, 0.42, -0.06],
          [side * 0.46, 0.74, 0.04],
          [side * 0.37, 1.0, 0.15],
        ],
        0.044,
        0.012,
        10,
        5,
      ),
      darkBoneMat,
    );
    mainBeam.castShadow = true;
    const tine = new THREE.Mesh(
      makeCurvedTube(
        [
          [side * 0.26, 0.42, -0.06],
          [side * 0.49, 0.58, -0.14],
          [side * 0.6, 0.77, -0.08],
        ],
        0.026,
        0.008,
        6,
        5,
      ),
      darkBoneMat,
    );
    const frontTine = new THREE.Mesh(
      makeCurvedTube(
        [
          [side * 0.34, 0.56, 0.0],
          [side * 0.24, 0.74, 0.21],
        ],
        0.022,
        0.007,
        5,
        5,
      ),
      darkBoneMat,
    );
    headGroup.add(mainBeam, tine, frontTine);
  }
  bodyPivot.add(headGroup);

  // Gnarled crooked arms with elbow moss knots & dark talons
  const makeClawArm = (side: number): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.41, 0.76, 0.04);

    const shoulderKnot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), barkFleshMat);
    shoulderKnot.scale.set(1.15, 1.3, 1.0);
    shoulderKnot.castShadow = true;
    const elbowKnot = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), barkFleshMat);
    elbowKnot.position.set(side * 0.09, -0.45, -0.03);
    elbowKnot.castShadow = true;
    const armTube = new THREE.Mesh(
      makeCurvedTube(
        [
          [0, 0, 0],
          [side * 0.1, -0.34, -0.06],
          [side * 0.06, -0.72, 0.16],
          [0, -1.02, 0.38],
        ],
        0.09,
        0.048,
        10,
        6,
      ),
      barkFleshMat,
    );
    armTube.castShadow = true;
    arm.add(shoulderKnot, elbowKnot, armTube);

    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.023, 0.32, 5), clawMat);
      claw.position.set(c * 0.044, -1.15, 0.48);
      claw.rotation.x = Math.PI * 0.68;
      claw.rotation.z = c * 0.13;
      claw.castShadow = true;
      arm.add(claw);
    }
    return arm;
  };

  const armL = makeClawArm(-1);
  const armR = makeClawArm(1);
  bodyPivot.add(armL, armR);

  return {
    group,
    animate: (elapsed: number, navBlend: number, loco?: UpyrLocomotionOpts) => {
      const breathe = Math.sin(elapsed * 2.6);
      const stride = loco ? loco.strideDist * 2.8 : 0;
      const spd = loco ? Math.min(1, loco.speedRatio) : 0;
      const turnDir = loco ? loco.turnStepDir : 0;
      const swingL = Math.sin(stride) * 0.58 * spd;
      const swingR = -swingL;

      if (loco && loco.useIk) {
        // Foot IK: bend knees & drop pelvis slightly to match terrain rocks/slope
        const pelvDrop = Math.min(0.16, Math.max(-0.16, Math.min(loco.footOffsetL, loco.footOffsetR) * 0.55));
        const liftL = Math.max(0, Math.sin(stride)) * 0.14 * spd;
        const liftR = Math.max(0, -Math.sin(stride)) * 0.14 * spd;
        const ikFlexL = Math.max(0, loco.footOffsetL) * 1.15;
        const ikFlexR = Math.max(0, loco.footOffsetR) * 1.15;

        legPivots[0].position.y = 0.88 + pelvDrop + liftL;
        legPivots[1].position.y = 0.88 + pelvDrop + liftR;
        legPivots[0].rotation.x = swingL - ikFlexL * 0.55;
        legPivots[1].rotation.x = swingR - ikFlexR * 0.55;
        legPivots[0].rotation.z = turnDir * 0.16;
        legPivots[1].rotation.z = -turnDir * 0.12;
        lowerLegPivots[0].rotation.x = Math.max(0, -swingL) * 0.45 + ikFlexL * 0.75;
        lowerLegPivots[1].rotation.x = Math.max(0, -swingR) * 0.45 + ikFlexR * 0.75;
        bodyPivot.position.y = 0.84 + pelvDrop + Math.abs(Math.sin(stride)) * 0.045 * spd;
      } else {
        // LOD > 20m: cheap basic walk cycle without IK raycast bending
        legPivots[0].position.y = 0.88;
        legPivots[1].position.y = 0.88;
        legPivots[0].rotation.x = swingL;
        legPivots[1].rotation.x = swingR;
        legPivots[0].rotation.z = 0;
        legPivots[1].rotation.z = 0;
        lowerLegPivots[0].rotation.x = 0;
        lowerLegPivots[1].rotation.x = 0;
        bodyPivot.position.y = 0.84;
      }

      bodyPivot.rotation.x = 0.46 + breathe * 0.05 + spd * 0.1;
      bodyPivot.rotation.z = turnDir * 0.18 + Math.sin(stride) * 0.05 * spd;
      headGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.06 - turnDir * 0.14;
      armL.rotation.x = -0.32 + breathe * 0.12 - swingL * 0.35;
      armR.rotation.x = -0.38 - breathe * 0.12 - swingR * 0.35;
      navGlowMat.emissiveIntensity = 1.18 + navBlend * 0.58 + Math.sin(elapsed * 4.0) * 0.22;
    },
  };
}
