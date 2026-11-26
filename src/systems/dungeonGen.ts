import {createRng} from '../core/rng';
import type {EnemyArchetype} from '../data/balance';

export interface RoomSpec {
  id: string;
  nameKey: string;
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  requiresNavGate?: boolean;
}

export interface CorridorSpec {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
}

export interface AltarNode {
  id: string;
  x: number;
  z: number;
  radius: number;
  activated: boolean;
}

export interface CampfireNode {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface NpcNode {
  id: 'mara' | 'ratnik';
  x: number;
  z: number;
  radius: number;
}

export interface NavGateNode {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export interface EnemySpawnSpec {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  roomId: string;
}

export interface PillarObstacle {
  x: number;
  z: number;
  radius: number;
  kind?: 'altar' | 'campfire' | 'pillar' | 'boulder';
}

export interface WallSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfThick: number;
  requiresNavGate?: boolean;
}

export interface DungeonLayout {
  seed: number;
  spawnX: number;
  spawnZ: number;
  rooms: RoomSpec[];
  corridors: CorridorSpec[];
  altars: AltarNode[];
  campfires: CampfireNode[];
  npcs: NpcNode[];
  navGates: NavGateNode[];
  wallSegments: WallSegment[];
  obstacles: PillarObstacle[];
  enemySpawns: EnemySpawnSpec[];
}

export function generateDungeon(seed: number): DungeonLayout {
  const rng = createRng(seed ^ 0x517cc1b7);

  // Expansive 7-Zone Slavic Mire Valley (~215m N-S x ~115m E-W)
  const rooms: RoomSpec[] = [
    {id: 'ostrog', nameKey: 'Ostrog Clearing', cx: 0, cz: 4, halfW: 16, halfD: 13},
    {id: 'mire', nameKey: 'Birch Mire', cx: -2 + rng.range(-1.5, 1.5), cz: -32, halfW: 20, halfD: 16},
    {id: 'hollow', nameKey: 'Whispering Hollow', cx: -40, cz: -34, halfW: 16, halfD: 15},
    {id: 'watchtower', nameKey: 'Sunken Watchpost', cx: 38, cz: -34, halfW: 16, halfD: 14},
    {id: 'barrow', nameKey: 'Bone Barrow', cx: 2 + rng.range(-1.5, 1.5), cz: -76, halfW: 21, halfD: 17},
    {id: 'necropolis', nameKey: 'Ashfen Necropolis', cx: -1, cz: -118, halfW: 19, halfD: 15},
    {id: 'sanctum', nameKey: 'Leshy Sanctum', cx: 0, cz: -162, halfW: 24, halfD: 20, requiresNavGate: true},
  ];

  // Kept for map/road cartography & clear road paths; no longer traps players behind invisible walls
  const corridors: CorridorSpec[] = [
    {cx: -0.8, cz: -12.5, halfW: 5.2, halfD: 8.5},
    {cx: -23.0, cz: -33.0, halfW: 8.5, halfD: 4.5},
    {cx: 20.5, cz: -33.0, halfW: 8.5, halfD: 4.5},
    {cx: 0.4, cz: -53.5, halfW: 5.2, halfD: 9.0},
    {cx: 0.2, cz: -97.5, halfW: 5.2, halfD: 9.0},
    {cx: 0.0, cz: -138.5, halfW: 5.0, halfD: 8.5},
  ];

  const altars: AltarNode[] = [
    {id: 'altar_ostrog', x: -0.9, z: -2.2, radius: 1.45, activated: false},
    {id: 'altar_watchtower', x: 43.0, z: -36.0, radius: 1.45, activated: false},
    {id: 'altar_barrow', x: 11.5, z: -76.5, radius: 1.45, activated: false},
    {id: 'altar_necropolis', x: -9.5, z: -120.0, radius: 1.45, activated: false},
  ];

  const campfires: CampfireNode[] = [
    {id: 'fire_ostrog', x: -4.2, z: 3.8, radius: 0.9},
    {id: 'fire_watchtower', x: 32.0, z: -30.5, radius: 0.9},
    {id: 'fire_barrow', x: -11.4, z: -69.5, radius: 0.9},
    {id: 'fire_necropolis', x: 8.5, z: -112.0, radius: 0.9},
  ];

  const npcs: NpcNode[] = [
    {id: 'mara', x: -5.4, z: 4.8, radius: 0.65},
    {id: 'ratnik', x: 4.2, z: 5.6, radius: 0.65},
  ];

  const navGates: NavGateNode[] = [
    {id: 'gate_sanctum', x: 0.0, z: -138.5, halfW: 5.2, halfD: 1.4},
  ];

  // Physical visible walls only (1-to-1 matched to rendered timber palisades & Sanctum monolith ridge)
  const wallSegments: WallSegment[] = [
    // Ostrog South Palisade (left & right wings around south gateposts at x=+-3.15)
    {id: 'pal_s_w', x1: -9.2, z1: 11.4, x2: -3.15, z2: 11.4, halfThick: 0.35},
    {id: 'pal_s_e', x1: 3.15, z1: 11.4, x2: 9.2, z2: 11.4, halfThick: 0.35},
    // Ostrog North Palisade (left & right wings around open north gateway at x=+-4.1)
    {id: 'pal_n_w', x1: -9.8, z1: -6.2, x2: -4.1, z2: -6.2, halfThick: 0.35},
    {id: 'pal_n_e', x1: 4.1, z1: -6.2, x2: 9.8, z2: -6.2, halfThick: 0.35},
    // Sanctum Valley Flanking Monolith Canyon Walls (always solid so Sanctum is entered through the Gate)
    {id: 'sanctum_ridge_w', x1: -66.0, z1: -138.5, x2: -5.2, z2: -138.5, halfThick: 1.45},
    {id: 'sanctum_ridge_e', x1: 5.2, z1: -138.5, x2: 66.0, z2: -138.5, halfThick: 1.45},
  ];

  const obstacles: PillarObstacle[] = [
    ...altars.map((a) => ({x: a.x, z: a.z, radius: 1.15, kind: 'altar' as const})),
    ...campfires.map((c) => ({x: c.x, z: c.z, radius: 0.72, kind: 'campfire' as const})),
    {x: -10.5, z: -28.0, radius: 1.05, kind: 'pillar'},
    {x: 8.5, z: -36.0, radius: 1.05, kind: 'pillar'},
    {x: -36.0, z: -38.0, radius: 1.1, kind: 'pillar'},
    {x: 37.0, z: -40.5, radius: 1.1, kind: 'pillar'},
    {x: -9.5, z: -80.0, radius: 1.15, kind: 'pillar'},
    {x: 11.5, z: -83.0, radius: 1.15, kind: 'pillar'},
    {x: -8.5, z: -124.0, radius: 1.15, kind: 'pillar'},
    {x: 8.5, z: -124.0, radius: 1.15, kind: 'pillar'},
    {x: 10.5, z: -158.0, radius: 1.2, kind: 'pillar'},
    {x: -10.5, z: -158.0, radius: 1.2, kind: 'pillar'},
    // Visible natural stone boulders along valley flanks
    {x: -19.5, z: -14.0, radius: 1.45, kind: 'boulder'},
    {x: 17.5, z: -17.5, radius: 1.55, kind: 'boulder'},
    {x: -24.5, z: -55.0, radius: 1.65, kind: 'boulder'},
    {x: 22.0, z: -58.0, radius: 1.6, kind: 'boulder'},
    {x: -21.0, z: -98.0, radius: 1.7, kind: 'boulder'},
    {x: 19.5, z: -101.0, radius: 1.65, kind: 'boulder'},
  ];

  const enemySpawns: EnemySpawnSpec[] = [
    // Birch Mire packs
    {id: 'e_mire_1', archetype: 'upyr', x: -4.2, z: -22.0, roomId: 'mire'},
    {id: 'e_mire_2', archetype: 'upyr', x: 3.4, z: -24.5, roomId: 'mire'},
    {id: 'e_mire_3', archetype: 'kikimora', x: 6.5, z: -33.0, roomId: 'mire'},
    {id: 'e_mire_4', archetype: 'upyr', x: -7.5, z: -36.5, roomId: 'mire'},
    // Whispering Hollow ambush
    {id: 'e_hollow_1', archetype: 'upyr', x: -33.0, z: -30.0, roomId: 'hollow'},
    {id: 'e_hollow_2', archetype: 'kikimora', x: -46.0, z: -39.0, roomId: 'hollow'},
    {id: 'e_hollow_elite', archetype: 'volkolak', x: -39.0, z: -37.0, roomId: 'hollow'},
    // Sunken Watchpost (East Wing)
    {id: 'e_watch_1', archetype: 'upyr', x: 32.5, z: -36.0, roomId: 'watchtower'},
    {id: 'e_watch_2', archetype: 'kikimora', x: 44.0, z: -29.0, roomId: 'watchtower'},
    {id: 'e_watch_elite', archetype: 'volkolak', x: 39.0, z: -38.0, roomId: 'watchtower'},
    // Bone Barrow + Cursed Totem Guardian
    {id: 'e_barrow_1', archetype: 'upyr', x: -5.5, z: -68.0, roomId: 'barrow'},
    {id: 'e_barrow_2', archetype: 'upyr', x: 7.0, z: -70.5, roomId: 'barrow'},
    {id: 'e_barrow_3', archetype: 'kikimora', x: -7.5, z: -82.0, roomId: 'barrow'},
    {id: 'e_barrow_elite', archetype: 'volkolak', x: 2.0, z: -80.0, roomId: 'barrow'},
    // Ashfen Necropolis (Deep Mire before Sanctum Gate)
    {id: 'e_necro_1', archetype: 'upyr', x: -5.5, z: -112.0, roomId: 'necropolis'},
    {id: 'e_necro_2', archetype: 'kikimora', x: 6.5, z: -116.5, roomId: 'necropolis'},
    {id: 'e_necro_elite', archetype: 'volkolak', x: 0.5, z: -124.0, roomId: 'necropolis'},
    // Leshy Sanctum Boss + Guards
    {id: 'e_boss_leshy', archetype: 'leshy', x: 0.0, z: -166.0, roomId: 'sanctum'},
    {id: 'e_sanctum_kiki', archetype: 'kikimora', x: -10.0, z: -164.0, roomId: 'sanctum'},
    {id: 'e_sanctum_upyr', archetype: 'upyr', x: 9.5, z: -162.0, roomId: 'sanctum'},
  ];

  return {
    seed,
    spawnX: 0,
    spawnZ: 6.2,
    rooms,
    corridors,
    altars,
    campfires,
    npcs,
    navGates,
    wallSegments,
    obstacles,
    enemySpawns,
  };
}

function distToSegmentSq(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): {dSq: number; cx: number; cz: number} {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const lenSq = vx * vx + vz * vz;
  let t = 0;
  if (lenSq > 1e-6) {
    t = Math.max(0, Math.min(1, ((px - x1) * vx + (pz - z1) * vz) / lenSq));
  }
  const cx = x1 + vx * t;
  const cz = z1 + vz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return {dSq: dx * dx + dz * dz, cx, cz};
}

export function isPointWalkable(
  layout: DungeonLayout,
  x: number,
  z: number,
  radius: number,
  navGateOpen: boolean,
): boolean {
  // Outer misty forest ridge bounds (~128m wide x ~204m deep open valley)
  if (Math.abs(x) > 62 - radius || z > 18 - radius || z < -184 + radius) {
    return false;
  }

  // Sealed Sanctum Nav Gate & canyon ridge (at z = -138.5)
  if (!navGateOpen) {
    if (z <= -138.5 + 1.4 + radius) {
      return false;
    }
    for (const g of layout.navGates) {
      if (
        Math.abs(x - g.x) < g.halfW + radius &&
        Math.abs(z - g.z) < g.halfD + radius
      ) {
        return false;
      }
    }
  }

  // Visible physical walls only (palisades + flanking Sanctum cliffs)
  for (const w of layout.wallSegments) {
    const minDist = w.halfThick + radius;
    const hit = distToSegmentSq(x, z, w.x1, w.z1, w.x2, w.z2);
    if (hit.dSq < minDist * minDist) {
      return false;
    }
  }

  return true;
}

export function resolveWalkableMovement(
  layout: DungeonLayout,
  oldX: number,
  oldZ: number,
  newX: number,
  newZ: number,
  radius: number,
  navGateOpen: boolean,
): {x: number; z: number} {
  let rx = newX;
  let rz = newZ;

  // Clamp to outer misty forest ridge
  const maxX = 62 - radius;
  rx = Math.max(-maxX, Math.min(maxX, rx));
  rz = Math.max(-184 + radius, Math.min(18 - radius, rz));

  // Enforce sealed Sanctum gate & canyon boundary until Nav Altar opens it
  if (!navGateOpen && rz <= -138.5 + 1.4 + radius && oldZ > -138.5) {
    rz = -138.5 + 1.4 + radius;
  }

  // Smooth collision projection against visible wall segments (palisades & Sanctum monolith ridge)
  for (const w of layout.wallSegments) {
    const minDist = w.halfThick + radius;
    const hit = distToSegmentSq(rx, rz, w.x1, w.z1, w.x2, w.z2);
    if (hit.dSq < minDist * minDist) {
      const dist = Math.sqrt(hit.dSq);
      if (dist > 1e-5) {
        const push = minDist - dist;
        rx += ((rx - hit.cx) / dist) * push;
        rz += ((rz - hit.cz) / dist) * push;
      } else {
        rx = oldX;
        rz = oldZ;
      }
    }
  }

  // Push cleanly out of circular obstacles (altars, campfires, monolith pillars, boulders)
  for (const obs of layout.obstacles) {
    const dx = rx - obs.x;
    const dz = rz - obs.z;
    const minD = obs.radius + radius;
    const dist = Math.hypot(dx, dz);
    if (dist < minD && dist > 1e-5) {
      const push = minD - dist;
      rx += (dx / dist) * push;
      rz += (dz / dist) * push;
    }
  }

  return {x: rx, z: rz};
}
